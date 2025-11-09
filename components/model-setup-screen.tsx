import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

interface ModelSetupScreenProps {
  onImport: () => Promise<{ success: boolean; error?: string }>;
  onInitialize: () => Promise<void>;
  onBack?: () => void;
  modelInfo?: any;
}

/**
 * Model Setup Screen
 * Guides user to download and import the Gemma model
 */
export function ModelSetupScreen({ onImport, onInitialize, onBack, modelInfo }: ModelSetupScreenProps) {
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

  return (
    <ThemedView style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ThemedText style={styles.backButtonText}>Back</ThemedText>
        </TouchableOpacity>
      )}
      
      <ThemedView style={styles.content}>
        {/* Header */}
        <ThemedText type="title" style={styles.title}>
          🤖 AI Chat
        </ThemedText>

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
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 12,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  title: {
    fontSize: 32,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
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
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
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
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
});

