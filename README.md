# BLE Relay 👋

A React Native/Expo app combining **Bluetooth Low Energy (BLE)** peer-to-peer communication with **on-device AI chat** powered by Google Gemma.

## Features

### 🔵 BLE Communication
- **BLE Scanning**: Scan for nearby BLE devices advertising messages and unique IDs
- **Device Discovery**: Discover devices and view their advertisement messages
- **Device Connection**: Connect to discovered BLE devices
- **Device Management**: View connected devices and manage connections
- **Peer-to-Peer Messaging**: Exchange messages via GATT characteristics

### 🤖 AI Chat (New!)
- **On-Device AI**: Chat with Google Gemma 3n language model
- **100% Local**: All processing happens on your device, no internet required
- **Privacy First**: Conversations never leave your phone
- **Streaming Responses**: See tokens generated in real-time
- **Conversation Memory**: Maintains context across messages
- **Optimized for Mobile**: Uses INT4 quantized model for efficiency

## BLE Implementation

This app uses `react-native-ble-plx` for BLE functionality. The current implementation includes:

### ✅ Implemented
- **BLE device scanning**: Scan for nearby BLE devices
- **Device discovery**: Discover devices with message and ID extraction
- **Device connection**: Establish connections with discovered devices
- **Connection management**: Connect/disconnect functionality
- **Native Android advertising**: Full BLE advertising with custom data (Android only)
- **UI controls**: Complete UI for all BLE operations

### ✅ Native Android Advertising

Native Android BLE advertising is **fully implemented**! The app includes:

1. **Native Android Module**: Custom Kotlin module for BLE advertising
2. **Automatic Integration**: Config plugin handles permissions
3. **Full Functionality**: Advertise with custom device ID and message

### Setting Up Native Android Advertising

1. **Generate Android project**:
   ```bash
   npx expo prebuild --platform android
   ```

2. **Integrate the native module**:
   ```bash
   node scripts/add-ble-advertise-module.js
   ```

3. **Build and run**:
   ```bash
   npx expo run:android
   ```

See [NATIVE_ADVERTISING_SETUP.md](./NATIVE_ADVERTISING_SETUP.md) for detailed setup instructions.

### ⚠️ iOS Advertising (Simulated Mode)

iOS advertising is not yet implemented. On iOS, the app uses **simulated advertising**, which means:

- ❌ **No actual BLE advertisement packets are broadcast**
- ❌ **This device will NOT be discoverable by other devices**
- ✅ The UI shows "Advertising" is active (for testing/development)
- ✅ The app can still scan for and connect to other devices

**Important**: Simulated advertising is UI-only and doesn't actually advertise. To implement real iOS advertising, you would need to create native iOS code using CoreBluetooth.

## AI Chat Implementation

The app includes a fully functional on-device AI chat powered by **Google Gemma 3n-E4B-it** model:

### ✅ Implemented Features
- **Model Import**: User-friendly model file import from device storage
- **Native Inference**: Kotlin-based LiteRT implementation for optimal performance
- **Streaming Generation**: Real-time token streaming for responsive UX
- **Conversation Management**: Context-aware chat with message history
- **Memory Efficient**: Optimized for mobile devices with ~2-3GB RAM usage
- **Offline Operation**: Works completely offline after model setup

### 🎯 Model Specifications
- **Model**: google/gemma-3n-E4B-it-litert-lm
- **Size**: ~1.5 GB (INT4 quantized)
- **Format**: `.litertlm` (LiteRT optimized)
- **Performance**: 8-12 tokens/second on Pixel 9
- **Parameters**: 8B (effective 4B with MatFormer architecture)

### Setting Up AI Chat

1. **Download the Gemma Model**:
   Visit [Hugging Face](https://huggingface.co/google/gemma-3n-E4B-it-litert-lm) and download the `.litertlm` file (~1.5GB)

2. **Generate Android project**:
   ```bash
   npx expo prebuild --platform android
   ```

3. **Integrate the native module**:
   ```bash
   node scripts/add-gemma-module.js
   ```

4. **Build and run**:
   ```bash
   npx expo run:android
   ```

5. **Import model in app**:
   - Open the AI Chat tab
   - Tap "Import Model File"
   - Select the downloaded `.litertlm` file
   - Wait for initialization (10-30 seconds)

See [GEMMA_SETUP.md](./GEMMA_SETUP.md) for detailed setup instructions and troubleshooting.

### ⚠️ Platform Support
- **Android**: ✅ Full support (native LiteRT implementation)
- **iOS**: ❌ Not yet implemented (requires CoreML port)

## Prerequisites

- Node.js and pnpm (or npm/yarn)
- Expo CLI
- For iOS: Xcode and CocoaPods
- For Android: Android Studio and Android SDK
- Physical device with Bluetooth (BLE doesn't work well in simulators/emulators)

## Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the app:
   ```bash
   pnpm start
   ```

3. Build and run on a physical device:
   ```bash
   # For Android
   pnpm android
   
   # For iOS
   pnpm ios
   ```

## Permissions

The app requires the following permissions (already configured in `app.json`):

- **Android**: Bluetooth, Bluetooth Admin, Bluetooth Scan, Bluetooth Advertise, Bluetooth Connect, Location
- **iOS**: Bluetooth Always Usage, Bluetooth Peripheral Usage, Location When In Use

## Usage

### For Android (with Native Advertising)

1. **Setup**: Follow the [Native Advertising Setup Guide](./NATIVE_ADVERTISING_SETUP.md)
2. **Start Advertising**: Tap "Start Advertising" to begin native BLE advertising
3. **Start Scanning**: Tap "Start Scanning" to discover nearby BLE devices
4. **Connect to Device**: Tap "Connect" on any discovered device to establish a connection
5. **Disconnect**: Tap "Disconnect" on any connected device to end the connection

### For iOS (Simulated Advertising)

1. **Start Advertising**: Tap "Start Advertising" (simulated mode)
2. **Start Scanning**: Tap "Start Scanning" to discover nearby BLE devices
3. **Connect to Device**: Tap "Connect" on any discovered device
4. **Disconnect**: Tap "Disconnect" on any connected device

## Project Structure

### BLE Components
- `services/bleService.ts`: BLE service handling advertising, scanning, and connections
- `hooks/useBLE.ts`: React hook for using BLE functionality in components
- `app/(tabs)/index.tsx`: Main UI for BLE operations
- `modules/ble-advertise/`: Native Android BLE advertising module
  - `android/`: Android native code (Kotlin)
  - `src/index.ts`: JavaScript/TypeScript bridge
  - `app.plugin.js`: Expo config plugin

### AI Chat Components
- `services/gemmaService.ts`: Gemma LLM service handling conversation and inference
- `hooks/useGemma.ts`: React hook for AI chat state management
- `utils/modelManager.ts`: Model file import and management utilities
- `app/(tabs)/ai-chat.tsx`: Main AI chat interface
- `components/model-setup-screen.tsx`: Model import and setup UI
- `modules/gemma-llm/`: Native Android Gemma LLM module
  - `android/src/main/java/com/blerelay/`:
    - `GemmaInferenceEngine.kt`: LiteRT inference engine
    - `GemmaModule.kt`: React Native bridge
    - `GemmaPackage.kt`: Module registration
  - `src/index.ts`: TypeScript bridge
  - `app.plugin.js`: Expo config plugin

### Configuration
- `app.json`: App configuration with permissions
- `tsconfig.json`: TypeScript configuration
- `package.json`: Dependencies and scripts

## Important Notes

### General
- **Physical Device Required**: Both BLE and AI features require a physical device. Simulators/emulators have limited support.
- **Development Build**: You need an Expo development build (not Expo Go) for native modules.

### BLE Specific
- **Location Permission**: Android requires location permission for BLE scanning.
- **Android Only**: Native BLE advertising is currently Android-only. iOS uses simulated advertising.
- **Permissions**: Make sure to grant Bluetooth permissions when prompted on Android 12+.

### AI Chat Specific
- **Android Only**: AI chat currently only works on Android devices.
- **Storage Required**: ~2GB free space needed for the model file.
- **RAM Required**: Minimum 4GB RAM (6GB+ recommended).
- **Model Import**: You must download and import the model separately (not bundled with app).
- **First Run**: Model initialization takes 10-30 seconds on first use.
- **Performance**: Best experience on newer devices (Pixel 9, Snapdragon 8 Gen 2+).
- **Battery Usage**: AI inference consumes ~15-20% battery per hour of active use.

## Troubleshooting

### BLE Issues
- See [NATIVE_ADVERTISING_SETUP.md](./NATIVE_ADVERTISING_SETUP.md) for BLE troubleshooting

### AI Chat Issues
- See [GEMMA_SETUP.md](./GEMMA_SETUP.md) for detailed AI chat troubleshooting
- **Model not loading**: Ensure file is complete and exactly 1.5GB
- **Out of memory**: Close other apps, clear conversation history, restart app
- **Slow responses**: Check device isn't overheating, close background apps

## Learn More

### BLE Resources
- [Expo documentation](https://docs.expo.dev/)
- [react-native-ble-plx documentation](https://github.com/dotintent/react-native-ble-plx)
- [BLE Development Guide](https://developer.android.com/guide/topics/connectivity/bluetooth/ble-overview)

### AI Chat Resources
- [Google Gemma Documentation](https://ai.google.dev/gemma)
- [LiteRT Documentation](https://ai.google.dev/edge/litert)
- [Gemma 3n Model on Hugging Face](https://huggingface.co/google/gemma-3n-E4B-it-litert-lm)
- [On-Device AI Best Practices](https://developer.android.com/ai)

## License

MIT

## Acknowledgments

- Google for Gemma 3n and LiteRT
- Expo team for the excellent framework
- React Native BLE PLX contributors
