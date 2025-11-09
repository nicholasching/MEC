# Native Android BLE Advertising Setup Guide

This guide explains how to set up and use native Android BLE advertising in this project.

## Overview

The native Android BLE advertising module allows your app to:
- Advertise BLE packets with custom data
- Include device ID and message in advertisement packets
- Make your device discoverable by other BLE devices
- Use manufacturer data to encode custom information

## Prerequisites

1. **Android Development Environment**
   - Android Studio installed
   - Android SDK (API 21+)
   - Java JDK 8 or higher
   - Kotlin support

2. **Expo Development Build**
   - This requires a development build (not Expo Go)
   - Native modules don't work in Expo Go

3. **Physical Device**
   - BLE doesn't work in emulators
   - Use a physical Android device (Android 5.0+)

## Setup Steps

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Generate Android Project

Since this uses native code, you need to generate the Android project:

```bash
npx expo prebuild --platform android
```

This will create the `android/` directory with the native Android project.

### 3. Manual Module Integration

After running `prebuild`, you need to manually integrate the native module:

```bash
node scripts/add-ble-advertise-module.js
```

This script will:
- Add the module to `settings.gradle`
- Add dependency to `app/build.gradle`
- Register the package in `MainApplication.kt`

### 4. Verify Integration

Check that the following files are updated:

**`android/settings.gradle`:**
```gradle
include ':ble-advertise'
project(':ble-advertise').projectDir = new File(rootProject.projectDir, '../modules/ble-advertise/android')
```

**`android/app/build.gradle`:**
```gradle
dependencies {
    implementation project(':ble-advertise')
    // ... other dependencies
}
```

**`android/app/src/main/java/com/blerelay/MainApplication.kt`:**
```kotlin
import com.blerelay.BleAdvertisePackage

override fun getPackages(): List<ReactPackage> {
    return listOf(
        // ... other packages
        BleAdvertisePackage(),
    )
}
```

### 5. Build and Run

```bash
npx expo run:android
```

Or use Android Studio:
```bash
# Open Android Studio
# Open the android/ directory
# Click Run
```

## Usage

The native advertising is automatically integrated into the BLE service. When you call `startAdvertising()`, it will:

1. Check if native Android advertising is available
2. Start native advertising if available
3. Fall back to simulated advertising if native is not available

### Example

```typescript
import { bleService } from './services/bleService';

// Start advertising with a custom message
await bleService.startAdvertising('Hello from my device!');

// Stop advertising
await bleService.stopAdvertising();
```

## How It Works

### Advertisement Packet Structure

The native module creates BLE advertisement packets with:

1. **Device Name**: `BLE-Relay-<deviceId>`
2. **Service UUID**: Your app's service UUID
3. **Manufacturer Data**: Encoded as `deviceId|message`

### Data Encoding

- **Format**: `deviceId|message`
- **Encoding**: UTF-8 bytes
- **Manufacturer ID**: `0xFFFF` (for testing - use your own in production)

### Advertisement Settings

- **Mode**: Balanced (good balance between power and discovery)
- **Power Level**: Medium
- **Connectable**: Yes
- **Timeout**: None (advertise indefinitely)

## Permissions

The following permissions are required (already configured in `app.json`):

- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `BLUETOOTH_SCAN` (Android 12+)
- `BLUETOOTH_ADVERTISE` (Android 12+)
- `BLUETOOTH_CONNECT` (Android 12+)

### Runtime Permissions

On Android 12+ (API 31+), you need to request runtime permissions:

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

async function requestPermissions() {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return granted;
  }
  return true;
}
```

## Troubleshooting

### Module Not Found

**Error**: `BleAdvertiseModule is not available`

**Solutions**:
1. Ensure you've run `npx expo prebuild`
2. Check that the module is registered in `MainApplication.kt`
3. Verify `settings.gradle` includes the module
4. Clean and rebuild: `cd android && ./gradlew clean && cd ..`

### Advertising Fails

**Error**: `ADVERTISE_FAILED_*`

**Solutions**:
1. Check Bluetooth is enabled on the device
2. Verify permissions are granted
3. Ensure device supports BLE advertising (most Android 5.0+)
4. Check no other app is advertising
5. Verify you're using a physical device (not emulator)

### Build Errors

**Error**: Kotlin or Gradle build errors

**Solutions**:
1. Ensure Kotlin is installed: `android/build.gradle` should have Kotlin plugin
2. Check Android SDK version matches (API 34 recommended)
3. Clean build: `cd android && ./gradlew clean`
4. Invalidate caches in Android Studio: File → Invalidate Caches

### Android 12+ Issues

**Error**: Permission denied or advertising doesn't work on Android 12+

**Solutions**:
1. Ensure permissions are declared with correct flags in `AndroidManifest.xml`
2. Request runtime permissions before advertising
3. Check `usesPermissionFlags="neverForLocation"` is set
4. Verify target SDK is 31 or higher

## Testing

1. **Start Advertising**: Tap "Start Advertising" in the app
2. **Scan from Another Device**: Use another device or BLE scanner app to scan
3. **Verify Discovery**: Check that your device appears in scan results
4. **Check Data**: Verify device ID and message are correct

## Production Considerations

1. **Manufacturer ID**: Replace `0xFFFF` with your own manufacturer ID
2. **Advertisement Interval**: Adjust for battery vs. discovery speed
3. **Data Size**: Keep advertisement data under 31 bytes (BLE limit)
4. **Error Handling**: Implement proper error handling and retry logic
5. **Battery**: Stop advertising when not needed to save battery

## Additional Resources

- [Android BLE Advertising Guide](https://developer.android.com/guide/topics/connectivity/bluetooth/ble-overview)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [React Native Native Modules](https://reactnative.dev/docs/native-modules-android)

