import { NativeModules, NativeEventEmitter, Platform, EmitterSubscription } from 'react-native';

const { GemmaModule } = NativeModules;
const gemmaEmitter = GemmaModule ? new NativeEventEmitter(GemmaModule) : null;

// Event names from native module
const EVENT_PARTIAL_RESULT = 'onGemmaPartialResult';
const EVENT_GENERATION_COMPLETE = 'onGemmaGenerationComplete';
const EVENT_GENERATION_ERROR = 'onGemmaGenerationError';

/**
 * Response data from Gemma model
 */
export interface GemmaResponse {
  text: string;
  isDone: boolean;
  fullText?: string;
}

/**
 * Model initialization result
 */
export interface ModelInitResult {
  status: string;
  message: string;
  modelPath: string;
}

/**
 * Model information
 */
export interface ModelInfo {
  isInitialized: boolean;
  modelPath?: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
}

/**
 * Callback for partial text generation
 */
export type PartialResultCallback = (text: string, isDone: boolean, fullText?: string) => void;

/**
 * Gemma LLM class for interacting with native module
 */
class GemmaLLM {
  private listeners: EmitterSubscription[] = [];

  /**
   * Check if the module is available on this platform
   */
  isAvailable(): boolean {
    if (Platform.OS !== 'android') {
      console.warn('GemmaLLM: Currently only available on Android');
      return false;
    }
    return GemmaModule != null;
  }

  /**
   * Initialize the Gemma model from a file path
   * @param modelPath Absolute path to the .litertlm model file
   * @returns Promise with initialization result
   */
  async initializeModel(modelPath: string): Promise<ModelInitResult> {
    if (!this.isAvailable()) {
      throw new Error('GemmaModule is not available on this platform');
    }

    try {
      console.log('Initializing Gemma model:', modelPath);
      const result = await GemmaModule.initializeModel(modelPath);
      console.log('Model initialized successfully');
      return result as ModelInitResult;
    } catch (error: any) {
      console.error('Error initializing Gemma model:', error);
      throw new Error(error?.message || 'Failed to initialize model');
    }
  }

  /**
   * Generate response with streaming tokens
   * @param prompt Input text prompt
   * @param onPartial Callback for each partial result
   * @returns Promise with final complete text
   */
  async generateResponse(
    prompt: string,
    onPartial?: PartialResultCallback
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('GemmaModule is not available');
    }

    return new Promise((resolve, reject) => {
      // Set up event listener for partial results
      const subscription = gemmaEmitter?.addListener(
        EVENT_PARTIAL_RESULT,
        (data: GemmaResponse) => {
          if (onPartial) {
            onPartial(data.text, data.isDone, data.fullText);
          }
        }
      );

      if (subscription) {
        this.listeners.push(subscription);
      }

      // Call native method
      GemmaModule.generateResponse(prompt)
        .then((finalText: string) => {
          // Clean up listener
          subscription?.remove();
          const index = this.listeners.indexOf(subscription!);
          if (index > -1) {
            this.listeners.splice(index, 1);
          }
          resolve(finalText);
        })
        .catch((error: any) => {
          // Clean up listener
          subscription?.remove();
          const index = this.listeners.indexOf(subscription!);
          if (index > -1) {
            this.listeners.splice(index, 1);
          }
          console.error('Error generating response:', error);
          reject(error);
        });
    });
  }

  /**
   * Generate response synchronously (no streaming)
   * @param prompt Input text prompt
   * @returns Promise with complete generated text
   */
  async generateResponseSync(prompt: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('GemmaModule is not available');
    }

    try {
      const result = await GemmaModule.generateResponseSync(prompt);
      return result as string;
    } catch (error: any) {
      console.error('Error generating response:', error);
      throw new Error(error?.message || 'Failed to generate response');
    }
  }

  /**
   * Check if model is initialized
   * @returns Promise with boolean
   */
  async isInitialized(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return await GemmaModule.isInitialized();
    } catch (error) {
      console.error('Error checking initialization status:', error);
      return false;
    }
  }

  /**
   * Get model information
   * @returns Promise with model info
   */
  async getModelInfo(): Promise<ModelInfo> {
    if (!this.isAvailable()) {
      return { isInitialized: false };
    }

    try {
      const info = await GemmaModule.getModelInfo();
      return info as ModelInfo;
    } catch (error) {
      console.error('Error getting model info:', error);
      return { isInitialized: false };
    }
  }

  /**
   * Close and cleanup the model
   */
  async closeModel(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // Remove all event listeners
      this.listeners.forEach(listener => listener.remove());
      this.listeners = [];

      await GemmaModule.closeModel();
      console.log('Model closed successfully');
    } catch (error) {
      console.error('Error closing model:', error);
    }
  }

  /**
   * Clean up all listeners (call on unmount)
   */
  removeAllListeners(): void {
    this.listeners.forEach(listener => listener.remove());
    this.listeners = [];
  }
}

// Export singleton instance
export default new GemmaLLM();

