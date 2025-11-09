import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Model file information
 */
export interface ModelFileInfo {
  exists: boolean;
  path?: string;
  uri?: string;
  name?: string;
  size?: number;
  sizeMB?: number;
}

/**
 * Constants for model management
 */
const MODEL_PATH_KEY = '@gemma_model_path';
const MODEL_INFO_KEY = '@gemma_model_info';

// Expected model file extension (focusing on .litertlm for LiteRT-LM library)
const VALID_EXTENSIONS = ['.litertlm'];

// Target directory for imported models (matches Gallery app pattern)
const IMPORTS_DIR = '__imports';

/**
 * ModelManager - Handles model file operations
 * - Import model from user's device (stores reference, doesn't copy)
 * - Check model existence
 * - Get model information
 * - Delete model reference
 */
class ModelManager {
  /**
   * Get the stored model path/URI
   */
  async getModelPath(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(MODEL_PATH_KEY);
    } catch (error) {
      console.error('Error getting model path:', error);
      return null;
    }
  }

  /**
   * Store the model path/URI
   */
  private async setModelPath(path: string): Promise<void> {
    await AsyncStorage.setItem(MODEL_PATH_KEY, path);
  }

  /**
   * Store model file information
   */
  private async setModelInfo(info: ModelFileInfo): Promise<void> {
    await AsyncStorage.setItem(MODEL_INFO_KEY, JSON.stringify(info));
  }

  /**
   * Get stored model information
   */
  private async getStoredModelInfo(): Promise<ModelFileInfo | null> {
    try {
      const json = await AsyncStorage.getItem(MODEL_INFO_KEY);
      if (!json) return null;
      return JSON.parse(json);
    } catch (error) {
      console.error('Error getting stored model info:', error);
      return null;
    }
  }

  /**
   * Check if model file exists and is accessible
   */
  async checkModelExists(): Promise<boolean> {
    try {
      const path = await this.getModelPath();
      if (!path) return false;

      // Check if file exists at the stored path
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch (error) {
      console.error('Error checking model existence:', error);
      return false;
    }
  }

  /**
   * Get model file information
   */
  async getModelInfo(): Promise<ModelFileInfo> {
    try {
      const path = await this.getModelPath();
      if (!path) {
        return { exists: false };
      }

      // Get file info
      const info = await FileSystem.getInfoAsync(path);
      
      if (!info.exists) {
        return { exists: false };
      }

      const size = info.size || 0;
      const sizeMB = size / (1024 * 1024);

      // Get stored metadata (like original filename)
      const storedInfo = await this.getStoredModelInfo();

      return {
        exists: true,
        path,
        uri: path,
        name: storedInfo?.name,
        size,
        sizeMB: Math.round(sizeMB * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting model info:', error);
      return { exists: false };
    }
  }

  /**
   * Validate file extension
   */
  private isValidModelFile(filename: string): boolean {
    const lowerFilename = filename.toLowerCase();
    return VALID_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
  }

  /**
   * Import model file from user's device
   * Opens document picker and stores reference to selected file (doesn't copy)
   */
  async importModel(): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      if (Platform.OS !== 'android') {
        return {
          success: false,
          error: 'Model import is currently only supported on Android',
        };
      }

      console.log('Opening document picker for model import...');

      // Open document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
      });

      // Check if user cancelled
      if (result.canceled) {
        return {
          success: false,
          error: 'Import cancelled by user',
        };
      }

      // Get the selected file
      const file = result.assets[0];
      if (!file) {
        return {
          success: false,
          error: 'No file selected',
        };
      }

      console.log('Selected file:', file.name);
      console.log('File URI:', file.uri);
      console.log('File size:', file.size ? `${(file.size / (1024 * 1024)).toFixed(2)}MB` : 'unknown');

      // Validate file extension
      if (!this.isValidModelFile(file.name)) {
        return {
          success: false,
          error: `Invalid file type. Expected: ${VALID_EXTENSIONS.join(', ')}`,
        };
      }

      // Accept .litertlm files - we're now using LiteRT-LM library
      const lowerFilename = file.name.toLowerCase();
      if (lowerFilename.endsWith('.litertlm')) {
        console.log('✅ .litertlm file detected - correct format for LiteRT-LM library');
      }

      // Validate file size
      if (file.size && file.size > 5 * 1024 * 1024 * 1024) { // 5GB limit
        return {
          success: false,
          error: 'File is too large. Maximum supported size is 5GB',
        };
      }

      // Verify the file exists and is accessible
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (!fileInfo.exists) {
        return {
          success: false,
          error: 'Selected file is not accessible',
        };
      }

      console.log('📂 Copying file to app storage (Gallery app pattern)...');

      // Create imports directory in documentDirectory 
      // Note: documentDirectory maps to app's internal storage, not external
      // For external storage (like Gallery app), we need a different approach
      const documentsDir = FileSystem.documentDirectory;
      if (!documentsDir) {
        return {
          success: false,
          error: 'Failed to access app storage directory',
        };
      }

      const importsDir = `${documentsDir}${IMPORTS_DIR}/`;
      const importsDirInfo = await FileSystem.getInfoAsync(importsDir);
      if (!importsDirInfo.exists) {
        console.log('Creating imports directory:', importsDir);
        await FileSystem.makeDirectoryAsync(importsDir, { intermediates: true });
      }

      // Target path for the copied file
      const targetPath = `${importsDir}${file.name}`;
      console.log('Copying to:', targetPath);

      // Copy the file (this handles content:// URIs properly)
      try {
        await FileSystem.copyAsync({
          from: file.uri,
          to: targetPath,
        });
      } catch (copyError: any) {
        console.error('Failed to copy file:', copyError);
        return {
          success: false,
          error: `Failed to copy file: ${copyError?.message || 'Unknown error'}`,
        };
      }

      console.log('✅ File copied successfully');

      // Verify the copy
      const copiedInfo = await FileSystem.getInfoAsync(targetPath);
      if (!copiedInfo.exists) {
        return {
          success: false,
          error: 'File copy verification failed',
        };
      }

      const copiedSize = copiedInfo.size || 0;
      const copiedSizeMB = Math.round((copiedSize / (1024 * 1024)) * 100) / 100;

      // Store the copied file path and metadata
      await this.setModelPath(targetPath);
      await this.setModelInfo({
        exists: true,
        path: targetPath,
        uri: targetPath,
        name: file.name,
        size: copiedSize,
        sizeMB: copiedSizeMB,
      });

      console.log('✅ Model imported successfully');
      console.log('Model location:', targetPath);
      console.log('Model size:', `${copiedSizeMB}MB`);

      return {
        success: true,
        path: targetPath,
      };
    } catch (error: any) {
      console.error('Error importing model:', error);
      return {
        success: false,
        error: error?.message || 'Failed to import model file',
      };
    }
  }

  /**
   * Delete the imported model file and clear references
   */
  async deleteModel(): Promise<{ success: boolean; error?: string }> {
    try {
      const path = await this.getModelPath();
      
      // Delete the actual file if it exists
      if (path) {
        try {
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists) {
            await FileSystem.deleteAsync(path, { idempotent: true });
            console.log('✅ Model file deleted:', path);
          }
        } catch (deleteError) {
          console.warn('Could not delete model file:', deleteError);
          // Continue to clear references even if file deletion fails
        }
      }
      
      // Clear stored references
      await AsyncStorage.removeItem(MODEL_PATH_KEY);
      await AsyncStorage.removeItem(MODEL_INFO_KEY);
      console.log('✅ Model references cleared');

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting model:', error);
      return {
        success: false,
        error: error?.message || 'Failed to delete model',
      };
    }
  }

  /**
   * Get free space on device
   */
  async getAvailableSpace(): Promise<number> {
    try {
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      return freeDiskStorage;
    } catch (error) {
      console.error('Error getting available space:', error);
      return 0;
    }
  }

  /**
   * Get available space in GB
   */
  async getAvailableSpaceGB(): Promise<number> {
    const bytes = await this.getAvailableSpace();
    return bytes / (1024 * 1024 * 1024);
  }
}

// Export singleton instance
export const modelManager = new ModelManager();

