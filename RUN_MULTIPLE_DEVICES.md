# Running Expo App on Multiple Android Devices

This guide explains how to run your Expo React Native app on multiple Android devices simultaneously using `npx expo run:android`.

## Prerequisites

1. **Two Android devices connected via USB** or **one USB + one wireless ADB**
2. **ADB (Android Debug Bridge)** installed and accessible
3. **USB Debugging enabled** on both devices

## Method 1: Using Device IDs (Recommended)

### Step 1: List Available Devices

First, check which devices are connected:

```bash
adb devices
```

You should see output like:
```
List of devices attached
ABC123XYZ    device
DEF456UVW    device
```

### Step 2: Run on Each Device Separately

Open **two separate terminal windows/tabs** and run:

**Terminal 1 (Device 1):**
```bash
npx expo run:android --device ABC123XYZ
```

**Terminal 2 (Device 2):**
```bash
npx expo run:android --device DEF456UVW
```

Replace `ABC123XYZ` and `DEF456UVW` with your actual device IDs from `adb devices`.

### Step 3: Start Metro Bundler (if not auto-started)

If Metro bundler doesn't start automatically, you may need to start it separately:

```bash
npx expo start
```

This will start the Metro bundler that both devices will connect to.

## Method 2: Using Device Names

If your devices have friendly names, you can also use:

```bash
# Terminal 1
npx expo run:android --device "Device Name 1"

# Terminal 2
npx expo run:android --device "Device Name 2"
```

## Method 3: Interactive Device Selection

If you don't specify a device, Expo will prompt you to select:

```bash
npx expo run:android
```

You'll see a list of available devices and can select one. Run this command in separate terminals for each device.

## Method 4: Using ADB Directly (Alternative)

You can also use ADB to install the APK on multiple devices after building:

### Step 1: Build the APK once
```bash
cd android
./gradlew assembleDebug
```

### Step 2: Install on multiple devices
```bash
# Install on device 1
adb -s ABC123XYZ install app/build/outputs/apk/debug/app-debug.apk

# Install on device 2
adb -s DEF456UVW install app/build/outputs/apk/debug/app-debug.apk
```

### Step 3: Start the app on both devices
```bash
# Start on device 1
adb -s ABC123XYZ shell am start -n com.anonymous.BLErelay/.MainActivity

# Start on device 2
adb -s DEF456UVW shell am start -n com.anonymous.BLErelay/.MainActivity
```

### Step 4: Start Metro bundler
```bash
npx expo start
```

## Tips

1. **Wireless ADB**: For convenience, you can connect one device via USB and another wirelessly:
   ```bash
   # Connect device via USB first, then:
   adb tcpip 5555
   adb connect <device-ip>:5555
   ```

2. **Same Metro Bundler**: Both devices will connect to the same Metro bundler, so code changes will hot-reload on both devices.

3. **Different App Instances**: Each device will have its own app instance, so they can communicate via BLE independently.

4. **Bluetooth Testing**: Make sure both devices have Bluetooth enabled and are within range (~10 meters) for BLE communication.

## Troubleshooting

### Device not found
- Make sure USB debugging is enabled on both devices
- Check that devices are authorized (you may need to accept the debugging prompt on the device)
- Try unplugging and replugging USB cables
- Restart ADB: `adb kill-server && adb start-server`

### Build errors
- Make sure you've run `npx expo prebuild --platform android` first
- Ensure all dependencies are installed: `pnpm install`
- Clean the build: `cd android && ./gradlew clean`

### Metro bundler conflicts
- Only one Metro bundler should be running
- If you see port conflicts, kill existing Metro processes and start fresh

## Quick Scripts (Included)

Helper scripts are included in the `scripts/` directory:

### Using npm/pnpm scripts:

```bash
# List all connected devices
pnpm android:devices

# Run on first device
pnpm android:device1

# Run on second device (in another terminal)
pnpm android:device2

# Run on all devices simultaneously
pnpm android:all
```

### Using scripts directly:

**Linux/Mac/Git Bash:**
```bash
# Run on all devices
bash scripts/run-all-android-devices.sh

# Run on first device
bash scripts/run-android-device1.sh

# Run on second device
bash scripts/run-android-device2.sh
```

**Windows (CMD):**
```batch
REM Run on all devices
scripts\run-all-android-devices.bat
```

## Recommended Workflow

1. **Connect both devices via USB**
2. **Check devices are connected:**
   ```bash
   pnpm android:devices
   ```
3. **Start Metro bundler (in one terminal):**
   ```bash
   pnpm start
   ```
4. **Run on device 1 (in terminal 2):**
   ```bash
   pnpm android:device1
   ```
5. **Run on device 2 (in terminal 3):**
   ```bash
   pnpm android:device2
   ```

Or use the all-in-one script:
```bash
pnpm android:all
```

