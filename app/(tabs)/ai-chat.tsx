import { ModelSetupScreen } from '@/components/model-setup-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useGemma } from '@/hooks/useGemma';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * AI Chat Screen
 * Main screen for interacting with Gemma AI model
 */
export default function AIChatScreen() {
  const insets = useSafeAreaInsets();
  
  const {
    isInitialized,
    isInitializing,
    isGenerating,
    messages,
    partialResponse,
    error,
    modelExists,
    modelInfo,
    initializeModel,
    sendMessage,
    clearHistory,
    importModelFile,
  } = useGemma();

  const [inputText, setInputText] = useState('');
  const [showImportScreen, setShowImportScreen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, partialResponse]);

  // Auto-initialize if model exists
  useEffect(() => {
    if (modelExists && !isInitialized && !isInitializing) {
      console.log('Model file detected, auto-initializing...');
      initializeModel();
    }
  }, [modelExists, isInitialized, isInitializing, initializeModel]);

  const handleSend = async () => {
    if (!inputText.trim() || isGenerating) return;

    const message = inputText.trim();
    setInputText('');
    await sendMessage(message);
  };

  // Show setup screen if model doesn't exist or user wants to change model
  if (!modelExists || showImportScreen) {
    return (
      <ModelSetupScreen
        onImport={async () => {
          const result = await importModelFile();
          if (result.success) {
            setShowImportScreen(false);
          }
          return result;
        }}
        onInitialize={initializeModel}
        onBack={showImportScreen ? () => setShowImportScreen(false) : undefined}
        modelInfo={modelInfo}
      />
    );
  }

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>
            Loading AI model...
          </ThemedText>
          <ThemedText style={styles.loadingSubtext}>
            This may take up to 30 seconds
          </ThemedText>
          {modelInfo?.sizeMB && (
            <ThemedText style={styles.loadingDetail}>
              Model size: {modelInfo.sizeMB}MB
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    );
  }

  // Show error screen if initialization failed
  if (!isInitialized && error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={styles.errorTitle}>
            ❌ Initialization Failed
          </ThemedText>
          <ThemedText style={styles.errorMessage}>{error}</ThemedText>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={initializeModel}
          >
            <ThemedText style={styles.buttonText}>Retry</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={importModelFile}
          >
            <ThemedText style={styles.buttonTextSecondary}>
              Import Different Model
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  // Main chat interface
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ThemedView style={styles.container}>
        {/* Safe area top padding */}
        <View style={{ paddingTop: insets.top }} />
        
        {/* Header */}
        <ThemedView style={styles.header}>
          <View style={styles.headerLeft}>
            <ThemedText type="title" style={styles.headerTitle}>
              AI Chat
            </ThemedText>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setShowImportScreen(true)}
              style={styles.changeModelButton}
            >
              <ThemedText style={styles.changeModelButtonText}>
                Change Model
              </ThemedText>
            </TouchableOpacity>

          </View>
        </ThemedView>

        {/* Error banner */}
        {error && (
          <ThemedView style={styles.errorBanner}>
            <ThemedText style={styles.errorBannerText}>⚠️ {error}</ThemedText>
          </ThemedView>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyIcon}>🤖</ThemedText>
              <ThemedText style={styles.emptyTitle}>
                Hi! I&apos;m your AI assistant
              </ThemedText>
              <ThemedText style={styles.emptySubtext}>
                I run completely on your device.
              </ThemedText>
              <View style={styles.examplePrompts}>
                <ThemedText style={styles.exampleTitle}>Try asking:</ThemedText>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    await sendMessage('How do I purify water safely?');
                  }}
                  style={styles.quickButton}
                >
                  <ThemedText style={styles.quickButtonText}>
                    How do I purify water safely?
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    await sendMessage('What should I do if someone is injured?');
                  }}
                  style={styles.quickButton}
                >
                  <ThemedText style={styles.quickButtonText}>
                    What should I do if someone is injured?
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    await sendMessage('How can I signal for help?');
                  }}
                  style={styles.quickButton}
                >
                  <ThemedText style={styles.quickButtonText}>
                    How can I signal for help?
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          ) : (
            <>
              {messages.map((msg, index) => (
                <View
                  key={`${msg.timestamp}-${index}`}
                  style={[
                    styles.messageBubble,
                    msg.role === 'user'
                      ? styles.userBubble
                      : styles.assistantBubble,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.messageText,
                      msg.role === 'user' && styles.userMessageText,
                    ]}
                  >
                    {msg.content}
                  </ThemedText>
                </View>
              ))}

              {/* Partial response (streaming) */}
              {partialResponse && (
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <ThemedText style={styles.messageText}>
                    {partialResponse}
                    <ThemedText style={styles.cursor}>▊</ThemedText>
                  </ThemedText>
                </View>
              )}

              {/* Loading indicator */}
              {isGenerating && !partialResponse && (
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <ActivityIndicator size="small" color="#007AFF" />
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Input area */}
        <ThemedView style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            editable={!isGenerating}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isGenerating) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isGenerating}
          >
            <ThemedText style={styles.sendButtonText}>
              {isGenerating ? '...' : '➤'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  loadingDetail: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
    marginVertical: 6,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.3)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '600',
  },
  changeModelButton: {
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  changeModelButtonText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  clearButtonTextDisabled: {
    opacity: 0.3,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 59, 48, 0.3)',
  },
  errorBannerText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  examplePrompts: {
    marginTop: 20,
    alignSelf: 'stretch',
    maxWidth: 350,
    gap: 8,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
    textAlign: 'center',
  },
  quickButton: {
    backgroundColor: '#991b1b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    marginLeft: '20%',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#3A3A3C',
    alignSelf: 'flex-start',
    marginRight: '20%',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  cursor: {
    opacity: 0.7,
    fontWeight: '300',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128, 128, 128, 0.3)',
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: Platform.select({
      ios: '#3A3A3C',
      android: '#3A3A3C',
      default: '#3A3A3C',
    }),
    color: Platform.select({
      ios: '#FFFFFF',
      android: '#FFFFFF',
      default: '#FFFFFF',
    }),
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
});

