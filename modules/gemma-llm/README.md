# Gemma LLM Native Module

Native Android module for running Google Gemma 3n-E4B-it language model on-device using MediaPipe Tasks GenAI.

## Features

- On-device LLM inference (no internet required after setup)
- Streaming token generation
- Conversation context management
- Optimized for mobile devices (INT4 quantization)
- Memory efficient (~2-3GB RAM usage)

## Model Specifications

- **Model**: `google/gemma-3n-E4B-it-litert-lm`
- **Size**: ~1.5GB (INT4 quantized)
- **Format**: `.litertlm` (LiteRT optimized)
- **Performance**: ~8-12 tokens/sec on Pixel 9
- **Parameters**: 8B (effective 4B with MatFormer architecture)

## Setup

### 1. Download the Model

Download the Gemma 3n-E4B-it model from Hugging Face:
https://huggingface.co/google/gemma-3n-E4B-it-litert-lm

Download the `.litertlm` file to your device.

### 2. Prebuild the Android Project

```bash
npx expo prebuild --platform android
```

### 3. Integrate the Native Module

```bash
node scripts/add-gemma-module.js
```

### 4. Build and Run

```bash
npx expo run:android
```

## Usage

```typescript
import GemmaLLM from './modules/gemma-llm/src/index';

// Initialize the model
await GemmaLLM.initializeModel('/path/to/model.litertlm');

// Generate response with streaming
const response = await GemmaLLM.generateResponse(
  'Hello, how are you?',
  (partialText) => {
    console.log('Partial:', partialText);
  }
);

console.log('Final response:', response);
```

## Architecture

- **GemmaInferenceEngine.kt**: Core LiteRT-LM inference engine
- **GemmaModule.kt**: React Native bridge
- **GemmaPackage.kt**: Module registration
- **src/index.ts**: TypeScript interface

## Requirements

- Android API 24+ (Android 7.0+)
- Minimum 4GB RAM (recommended 6GB+)
- ~2GB free storage for model
- Physical device (not emulator)

## Performance Tips

1. Use INT4 quantized models for better performance
2. Limit conversation context to recent messages
3. Close other apps to free memory
4. Use GPU acceleration if available

## Troubleshooting

### Model fails to load
- Verify model file is not corrupted
- Check available storage space
- Ensure model format is `.litertlm`

### Out of memory errors
- Clear conversation history
- Restart the app
- Close other apps
- Consider using a smaller model variant

### Slow inference
- First inference is always slower (model warmup)
- Check device temperature (throttling)
- Verify GPU acceleration is enabled

## License

MIT

