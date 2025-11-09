# BLE Advertise Native Module

Native Android module for BLE (Bluetooth Low Energy) advertising in React Native/Expo apps.

## Features

- Start/stop BLE advertising
- Custom advertisement data (device name, service UUID, manufacturer data)
- Device ID and message encoding in advertisement packets
- Android 12+ (API 31+) compatible permissions

## Setup

### 1. Prebuild the Android project

Since this is a native module, you need to generate the Android project:

```bash
npx expo prebuild --platform android
```

### 2. Manual Integration (if needed)

If the config plugin doesn't automatically integrate the module, run:

```bash
node scripts/add-ble-advertise-module.js
```

### 3. Register the Package

The module should be automatically registered via the config plugin. If not, manually add to `MainApplication.kt`:

```kotlin
import com.blerelay.BleAdvertisePackage

override fun getPackages(): List<ReactPackage> {
    return listOf(
        // ... other packages
        BleAdvertisePackage(),
    )
}
```

### 4. Build and Run

```bash
npx expo run:android
```

## Usage

```typescript
import BleAdvertise from './modules/ble-advertise/src/index';

// Start advertising
await BleAdvertise.startAdvertising({
  name: 'MyDevice',
  serviceUUID: '12345678-1234-1234-1234-123456789ABC',
  deviceId: 'DEVICE-123',
  message: 'Hello from BLE!'
});

// Stop advertising
await BleAdvertise.stopAdvertising();

// Check if advertising
const isAdvertising = await BleAdvertise.isAdvertising();
```

## Permissions

The module requires the following Android permissions (already configured in `app.json`):

- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `BLUETOOTH_SCAN` (Android 12+)
- `BLUETOOTH_ADVERTISE` (Android 12+)
- `BLUETOOTH_CONNECT` (Android 12+)

## Implementation Details

### Advertisement Data Structure

The module encodes device ID and message in manufacturer data:
- Format: `deviceId|message`
- Manufacturer ID: `0xFFFF` (for testing - use your own in production)
- Encoded as UTF-8 bytes

### Service UUID

The service UUID is included in the advertisement packet, allowing other devices to filter scans.

## Troubleshooting

### Module not found

1. Ensure you've run `npx expo prebuild`
2. Check that the module is registered in `MainApplication.kt`
3. Verify `settings.gradle` includes the module

### Advertising fails

1. Check Bluetooth is enabled
2. Verify permissions are granted
3. Check device supports BLE advertising (most Android 5.0+ devices)
4. Ensure no other app is advertising on the same device

### Android 12+ Issues

For Android 12+ (API 31+), ensure:
- Permissions are declared with correct flags
- Runtime permissions are requested
- `usesPermissionFlags="neverForLocation"` is set for BLUETOOTH_SCAN and BLUETOOTH_ADVERTISE

## Notes

- This module is Android-only
- Requires a physical device (BLE doesn't work in emulators)
- Advertising consumes battery - stop when not needed
- Maximum advertisement data size is 31 bytes (BLE standard)


