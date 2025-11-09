import GemmaLLM from '../modules/gemma-llm/src/index';
import { modelManager } from '../utils/modelManager';

/**
 * Chat message interface
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/**
 * Generation options
 */
export interface GenerationOptions {
  includeHistory?: boolean;
  maxContextMessages?: number;
}

/**
 * GemmaService - High-level service for Gemma LLM
 * Handles conversation management, prompt formatting, and model interaction
 */
class GemmaService {
  private isInitialized: boolean = false;
  private conversationHistory: ChatMessage[] = [];
  private systemPrompt: string = 'You are a helpful AI assistant running locally on a mobile device. Be concise and friendly.';
  private maxHistoryLength: number = 10; // Keep last 10 exchanges

  /**
   * Initialize the Gemma model
   * Checks if model file exists and loads it
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.isInitialized) {
        console.log('Gemma model already initialized');
        return { success: true };
      }

      // Check if model file exists
      const modelExists = await modelManager.checkModelExists();
      if (!modelExists) {
        return {
          success: false,
          error: 'Model file not found. Please import a model file first.',
        };
      }

      // Get model path
      const modelPath = await modelManager.getModelPath();
      if (!modelPath) {
        return {
          success: false,
          error: 'Model path not available. Please import a model file first.',
        };
      }
      
      console.log('Initializing Gemma model from:', modelPath);

      // Get model info
      const modelInfo = await modelManager.getModelInfo();
      console.log('Model size:', modelInfo.sizeMB ? `${modelInfo.sizeMB}MB` : 'unknown');

      // Initialize native module
      const result = await GemmaLLM.initializeModel(modelPath);
      
      this.isInitialized = true;
      console.log('✅ Gemma service initialized successfully');
      
      return { success: true };
    } catch (error: any) {
      console.error('Failed to initialize Gemma service:', error);
      this.isInitialized = false;
      return {
        success: false,
        error: error?.message || 'Failed to initialize model',
      };
    }
  }

  /**
   * Send a message and get a response
   * @param userMessage User's input message
   * @param onPartial Callback for streaming tokens
   * @param options Generation options
   */
  async sendMessage(
    userMessage: string,
    onPartial?: (text: string) => void,
    options?: GenerationOptions
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    // Add user message to history
    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    this.conversationHistory.push(userMsg);

    // Trim history if too long
    this.trimHistory();

    // Build prompt with conversation context
    const prompt = this.buildPrompt(options);

    console.log('Sending prompt to Gemma...');
    console.log('Prompt length:', prompt.length, 'characters');

    // Generate response with streaming
    let accumulatedText = '';
    const response = await GemmaLLM.generateResponse(
      prompt,
      (partialText, isDone, fullText) => {
        if (!isDone) {
          accumulatedText += partialText;
          if (onPartial) {
            onPartial(accumulatedText);
          }
        }
      }
    );

    // Add assistant response to history
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    };
    this.conversationHistory.push(assistantMsg);

    // Trim history again after response
    this.trimHistory();

    return response;
  }

  /**
   * Build prompt from conversation history
   * Formats messages in a way optimized for Gemma
   */
  private buildPrompt(options?: GenerationOptions): string {
    const includeHistory = options?.includeHistory !== false;
    const maxContextMessages = options?.maxContextMessages || 6; // Last 3 exchanges (6 messages)

    let prompt = '';

    // Add system prompt
    if (this.systemPrompt) {
      prompt += `${this.systemPrompt}\n\n`;
    }

    // Add conversation history if enabled
    if (includeHistory && this.conversationHistory.length > 0) {
      // Get recent messages (limit context window)
      const recentMessages = this.conversationHistory.slice(-maxContextMessages);
      
      for (const msg of recentMessages) {
        if (msg.role === 'user') {
          prompt += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          prompt += `Assistant: ${msg.content}\n`;
        }
      }
    }

    // Add current prompt indicator
    prompt += 'Assistant:';

    return prompt;
  }

  /**
   * Trim conversation history to max length
   */
  private trimHistory(): void {
    if (this.conversationHistory.length > this.maxHistoryLength * 2) {
      // Keep system messages and recent exchanges
      const systemMessages = this.conversationHistory.filter(m => m.role === 'system');
      const recentMessages = this.conversationHistory
        .filter(m => m.role !== 'system')
        .slice(-(this.maxHistoryLength * 2));
      
      this.conversationHistory = [...systemMessages, ...recentMessages];
      console.log('Trimmed conversation history to', this.conversationHistory.length, 'messages');
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    console.log('Conversation history cleared');
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Get last N messages
   */
  getRecentHistory(count: number): ChatMessage[] {
    return this.conversationHistory.slice(-count);
  }

  /**
   * Set system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
    console.log('System prompt updated');
  }

  /**
   * Get system prompt
   */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  /**
   * Set maximum history length (number of exchanges to keep)
   */
  setMaxHistoryLength(length: number): void {
    this.maxHistoryLength = Math.max(1, length);
    this.trimHistory();
  }

  /**
   * Check if model is initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get model information
   */
  async getModelInfo() {
    try {
      return await GemmaLLM.getModelInfo();
    } catch (error) {
      console.error('Error getting model info:', error);
      return { isInitialized: false };
    }
  }

  /**
   * Close and cleanup
   */
  async close(): Promise<void> {
    try {
      await GemmaLLM.closeModel();
      this.isInitialized = false;
      this.conversationHistory = [];
      console.log('Gemma service closed');
    } catch (error) {
      console.error('Error closing Gemma service:', error);
    }
  }
}

// Export singleton instance
export const gemmaService = new GemmaService();

