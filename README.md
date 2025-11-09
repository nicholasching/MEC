# BLE Relay 👋

A React Native/Expo app for Bluetooth Low Energy (BLE) advertising, scanning, and device connections.

## Features

- **BLE Scanning**: Scan for nearby BLE devices advertising messages and unique IDs
- **Device Discovery**: Discover devices and view their advertisement messages
- **Device Connection**: Connect to discovered BLE devices
- **Device Management**: View connected devices and manage connections

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

- `services/bleService.ts`: BLE service handling advertising, scanning, and connections
- `hooks/useBLE.ts`: React hook for using BLE functionality in components
- `app/(tabs)/index.tsx`: Main UI for BLE operations
- `app.json`: App configuration with BLE permissions
- `modules/ble-advertise/`: Native Android BLE advertising module
  - `android/`: Android native code (Kotlin)
  - `src/index.ts`: JavaScript/TypeScript bridge
  - `app.plugin.js`: Expo config plugin

## Important Notes

- **Physical Device Required**: BLE functionality requires a physical device. Simulators/emulators have limited or no BLE support.
- **Location Permission**: Android requires location permission for BLE scanning.
- **Development Build**: For native Android advertising, you need an Expo development build (not Expo Go).
- **Android Only**: Native advertising is currently Android-only. iOS uses simulated advertising.
- **Permissions**: Make sure to grant Bluetooth permissions when prompted on Android 12+.

## Learn More

- [Expo documentation](https://docs.expo.dev/)
- [react-native-ble-plx documentation](https://github.com/dotintent/react-native-ble-plx)
- [BLE Development Guide](https://developer.android.com/guide/topics/connectivity/bluetooth/ble-overview)
