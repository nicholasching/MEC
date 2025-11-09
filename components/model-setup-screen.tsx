import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, View, Linking, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface ModelSetupScreenProps {
  onImport: () => Promise<{ success: boolean; error?: string }>;
  onInitialize: () => Promise<void>;
  modelInfo?: any;
}

/**
 * Model Setup Screen
 * Guides user to download and import the Gemma model
 */
export function ModelSetupScreen({ onImport, onInitialize, modelInfo }: ModelSetupScreenProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    setImportSuccess(false);

    try {
      const result = await onImport();
      
      if (result.success) {
        setImportSuccess(true);
        setError(null);
        
        // Auto-initialize after successful import
        setTimeout(async () => {
          await onInitialize();
        }, 500);
      } else {
        setError(result.error || 'Failed to import model');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to import model');
    } finally {
      setIsImporting(false);
    }
  };

  const openHuggingFace = () => {
    // Use google repository with .litertlm files for LiteRT-LM library
    const url = 'https://huggingface.co/google/gemma-3n-E4B-it-litert-lm';
    Linking.openURL(url).catch(err => {
      console.error('Failed to open URL:', err);
      setError('Failed to open browser');
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            🤖 AI Chat Setup
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Gemma 3n AI Model Required
          </ThemedText>
        </ThemedView>

        {/* Model Info */}
        <ThemedView style={styles.infoCard}>
          <ThemedText style={styles.infoTitle}>Model Information</ThemedText>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>• Model:</ThemedText>
            <ThemedText style={styles.infoValue}>Gemma 3n-E4B-it</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>• Size:</ThemedText>
            <ThemedText style={styles.infoValue}>~340 MB (INT4)</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>• Format:</ThemedText>
            <ThemedText style={[styles.infoValue, styles.successFormat]}>.litertlm ✓</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>• Privacy:</ThemedText>
            <ThemedText style={styles.infoValue}>100% on-device</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoBox}>
            <ThemedText style={styles.infoBoxText}>
              ℹ️ Now using LiteRT-LM library for optimal .litertlm file support
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Import Button */}
        {!importSuccess && (
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, isImporting && styles.buttonDisabled]}
            onPress={handleImport}
            disabled={isImporting}
          >
            {isImporting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <ThemedText style={styles.buttonText}>Importing...</ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.buttonText}>📂 Import Model File</ThemedText>
            )}
          </TouchableOpacity>
        )}

        {/* Success Message */}
        {importSuccess && (
          <ThemedView style={styles.successCard}>
            <ThemedText style={styles.successText}>
              ✅ Model imported successfully!
            </ThemedText>
            <ThemedText style={styles.successSubtext}>
              Initializing AI model...
            </ThemedText>
          </ThemedView>
        )}

        {/* Error Message */}
        {error && (
          <ThemedView style={styles.errorCard}>
            <ThemedText style={styles.errorText}>❌ {error}</ThemedText>
          </ThemedView>
        )}

        {/* Instructions */}
        <ThemedView style={styles.instructionsCard}>
          <ThemedText style={styles.instructionsTitle}>
            📖 How to Get the Model
          </ThemedText>
          
          <ThemedText style={styles.step}>
            <ThemedText style={styles.stepNumber}>1.</ThemedText> Download from Hugging Face
          </ThemedText>
          
          <TouchableOpacity style={styles.linkButton} onPress={openHuggingFace}>
            <ThemedText style={styles.linkText}>
              🔗 Open Hugging Face
            </ThemedText>
          </TouchableOpacity>
          
          <ThemedText style={styles.step}>
            <ThemedText style={styles.stepNumber}>2.</ThemedText> Download the <ThemedText style={styles.code}>.litertlm</ThemedText> file
          </ThemedText>
          <ThemedText style={styles.stepDetail}>
            Look for "gemma-3n-E4B-it-litert-lm.litertlm"
          </ThemedText>
          
          <ThemedText style={styles.step}>
            <ThemedText style={styles.stepNumber}>3.</ThemedText> Tap "Import Model File" above
          </ThemedText>
          <ThemedText style={styles.stepDetail}>
            Select the downloaded file from your device
          </ThemedText>
        </ThemedView>

        {/* Requirements */}
        <ThemedView style={styles.requirementsCard}>
          <ThemedText style={styles.requirementsTitle}>⚠️ Requirements</ThemedText>
          <ThemedText style={styles.requirement}>• ~2GB free storage space</ThemedText>
          <ThemedText style={styles.requirement}>• Android device (Pixel 9 recommended)</ThemedText>
          <ThemedText style={styles.requirement}>• WiFi recommended for download</ThemedText>
          {Platform.OS !== 'android' && (
            <ThemedText style={[styles.requirement, styles.warning]}>
              • Currently Android only
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.8,
    textAlign: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    marginBottom: 20,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  successCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    marginBottom: 20,
    alignItems: 'center',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 4,
  },
  successSubtext: {
    fontSize: 14,
    opacity: 0.8,
  },
  errorCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
  },
  instructionsCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    marginBottom: 20,
    gap: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  step: {
    fontSize: 15,
    lineHeight: 22,
  },
  stepNumber: {
    fontWeight: '700',
    fontSize: 16,
  },
  stepDetail: {
    fontSize: 13,
    opacity: 0.7,
    marginLeft: 20,
  },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  linkButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  linkText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  requirementsCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    gap: 8,
  },
  requirementsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  requirement: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  warning: {
    color: '#FF9500',
    fontWeight: '600',
  },
  warningBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  warningText: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '600',
    textAlign: 'center',
  },
  criticalFormat: {
    color: '#FF3B30',
    fontWeight: '700',
  },
  successFormat: {
    color: '#34C759',
    fontWeight: '700',
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  infoBoxText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});

