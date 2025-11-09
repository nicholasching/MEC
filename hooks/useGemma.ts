import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { gemmaService, ChatMessage } from '@/services/gemmaService';
import { modelManager, ModelFileInfo } from '@/utils/modelManager';
import type { ModelInfo as RuntimeModelInfo } from '@/modules/gemma-llm/src/index';

export interface GemmaModelInfo extends ModelFileInfo {
  runtime?: RuntimeModelInfo;
}

export interface ImportResult {
  success: boolean;
  path?: string;
  error?: string;
}

export function useGemma() {
  const isMountedRef = useRef(true);

  const [isInitialized, setIsInitialized] = useState<boolean>(
    gemmaService.getIsInitialized()
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    gemmaService.getHistory()
  );
  const [partialResponse, setPartialResponse] = useState<string>('');
  const [error, setError] = useState<string | null>(
    Platform.OS === 'android'
      ? null
      : 'Gemma is currently supported on Android devices only.'
  );
  const [modelExists, setModelExists] = useState(false);
  const [modelInfo, setModelInfo] = useState<GemmaModelInfo | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateModelInfo = useCallback(async () => {
    if (Platform.OS !== 'android') {
      if (!isMountedRef.current) return;
      setModelExists(false);
      setModelInfo(null);
      return;
    }

    try {
      const exists = await modelManager.checkModelExists();
      if (!isMountedRef.current) {
        return;
      }

      setModelExists(exists);

      if (!exists) {
        setModelInfo(null);
        return;
      }

      const fileInfo = await modelManager.getModelInfo();
      if (!isMountedRef.current) {
        return;
      }

      let runtimeInfo: RuntimeModelInfo | undefined;
      try {
        runtimeInfo = (await gemmaService.getModelInfo()) as RuntimeModelInfo;
      } catch (runtimeError) {
        console.warn('Failed to get Gemma runtime info:', runtimeError);
      }

      if (!isMountedRef.current) {
        return;
      }

      setModelInfo({
        ...fileInfo,
        runtime: runtimeInfo,
      });
    } catch (err) {
      console.error('Error updating Gemma model info:', err);
      if (!isMountedRef.current) {
        return;
      }
      setModelInfo(null);
      setModelExists(false);
    }
  }, []);

  useEffect(() => {
    updateModelInfo();
  }, [updateModelInfo]);

  useEffect(() => {
    if (isInitialized) {
      setMessages(gemmaService.getHistory());
    }
  }, [isInitialized]);

  const initializeModel = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'android') {
      const message =
        'Gemma initialization is only available on Android devices.';
      if (isMountedRef.current) {
        setError(message);
      }
      return;
    }

    if (isInitializing) {
      return;
    }

    if (isMountedRef.current) {
      setIsInitializing(true);
      setError(null);
    }

    try {
      const exists = await modelManager.checkModelExists();
      if (!exists) {
        throw new Error('Model file not found. Please import the Gemma model.');
      }

      const result = await gemmaService.initialize();
      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize Gemma model.');
      }

      if (!isMountedRef.current) {
        return;
      }

      setIsInitialized(true);
      setMessages(gemmaService.getHistory());
      setPartialResponse('');
      setError(null);
      await updateModelInfo();
    } catch (err: any) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('Gemma initialization failed:', err);
      setIsInitialized(false);
      setError(err?.message || 'Failed to initialize Gemma model.');
    } finally {
      if (isMountedRef.current) {
        setIsInitializing(false);
      }
    }
  }, [isInitializing, updateModelInfo]);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const prompt = text.trim();
      if (!prompt) {
        return;
      }

      if (!isInitialized) {
        if (isMountedRef.current) {
          setError('Model is not initialized. Please initialize the model.');
        }
        return;
      }

      if (isMountedRef.current) {
        setIsGenerating(true);
        setError(null);
        setPartialResponse('');

        const userMessage: ChatMessage = {
          role: 'user',
          content: prompt,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMessage]);
      }

      try {
        await gemmaService.sendMessage(prompt, partial => {
          if (!isMountedRef.current) {
            return;
          }
          setPartialResponse(partial);
        });

        if (!isMountedRef.current) {
          return;
        }

        setPartialResponse('');
        setMessages(gemmaService.getHistory());
      } catch (err: any) {
        if (!isMountedRef.current) {
          return;
        }
        console.error('Gemma message generation failed:', err);
        setError(err?.message || 'Failed to generate response.');
        setPartialResponse('');
        setMessages(gemmaService.getHistory());
      } finally {
        if (isMountedRef.current) {
          setIsGenerating(false);
        }
      }
    },
    [isInitialized]
  );

  const clearHistory = useCallback(() => {
    gemmaService.clearHistory();
    if (!isMountedRef.current) {
      return;
    }
    setMessages(gemmaService.getHistory());
    setPartialResponse('');
    setError(null);
  }, []);

  const importModelFile = useCallback(async (): Promise<ImportResult> => {
    if (Platform.OS !== 'android') {
      const message =
        'Model import is currently supported on Android devices only.';
      if (isMountedRef.current) {
        setError(message);
      }
      return { success: false, error: message };
    }

    try {
      const result = await modelManager.importModel();

      if (!isMountedRef.current) {
        return result;
      }

      if (result.success) {
        setError(null);
        setIsInitialized(false);
        gemmaService.clearHistory();
        setMessages([]);
        await updateModelInfo();
      } else if (result.error) {
        setError(result.error);
      }

      return result;
    } catch (err: any) {
      console.error('Gemma model import failed:', err);
      const message = err?.message || 'Failed to import model file.';
      if (isMountedRef.current) {
        setError(message);
      }
      return { success: false, error: message };
    }
  }, [updateModelInfo]);

  const changeModel = useCallback(async (): Promise<void> => {
    try {
      // Close the current model engine
      await gemmaService.close();

      if (!isMountedRef.current) {
        return;
      }

      // Reset state to redirect back to model setup
      setIsInitialized(false);
      setIsInitializing(false);
      setIsGenerating(false);
      setMessages([]);
      setPartialResponse('');
      setError(null);
      setModelExists(false);
      setModelInfo(null);

      console.log('Model closed, redirecting to setup screen');
    } catch (err: any) {
      console.error('Error changing model:', err);
      if (isMountedRef.current) {
        setError(err?.message || 'Failed to close current model');
      }
    }
  }, []);

  return {
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
    changeModel,
  };
}

