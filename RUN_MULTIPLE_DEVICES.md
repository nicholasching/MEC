# Running Expo App on Multiple Android Devices

This guide explains how to run your Expo React Native app on multiple Android devices simultaneously using `npx expo run:android`.

## Prerequisites

1. **Two Android devices connected via USB** or **one USB + one wireless ADB**
2. **ADB (Android Debug Bridge)** installed and accessible
3. **USB Debugging enabled** on both devices

## Method 1: Expo Dev Client (Recommended - Fastest)

This method uses Expo's dev client which provides the fastest builds with incremental compilation and hot reload.

```bash
pnpm android
```

This will:
1. Start Metro bundler with `--dev-client` flag (once)
2. Build and install the app on all connected devices using `expo run:android`
3. All devices connect to the same Metro bundler automatically

**Benefits:**
- ✅ Fastest builds (uses Expo's incremental builds)
- ✅ Hot reload works on all devices
- ✅ Single Metro bundler instance
- ✅ Automatic device detection

## Method 2: Build Once, Install on All Devices (Alternative)

This method builds the APK once and installs it on all connected devices. **Note:** This is slower than the dev client method because it does a full Gradle build.

### Step 1: List Available Devices

Check which devices are connected:

```bash
pnpm android:devices
# or
adb devices
```

You should see output like:
```
List of devices attached
ABC123XYZ    device
DEF456UVW    device
```

### Step 2: Build and Install on All Devices

Choose a build method based on your needs:

**Option A: Fast Build (Recommended)**
```bash
pnpm android:fast
```
- Uses Gradle build cache and parallel execution
- Skips build if recent APK exists (< 5 minutes old)
- Best for repeated builds

**Option B: Optimized Build**
```bash
pnpm android:optimized
```
- Uses all Gradle optimizations (cache, parallel, configuration cache)
- Slightly faster than standard build
- Good for first-time builds

**Option C: Standard Build**
```bash
pnpm android:all
```
- Basic Gradle build with caching
- Reliable fallback if other methods fail

All methods will:
1. Build the APK once
2. Install it on all connected devices
3. Start the app on each device

**Why is this slower than `expo run:android`?**

`expo run:android` uses incremental builds - it only rebuilds what changed. The scripts above do a full Gradle build each time (though with caching to speed it up). For the fastest experience with a single device, use `npx expo run:android` directly.

### Step 3: Start Metro Bundler

In a separate terminal, start Metro bundler:

```bash
pnpm start
```

The apps on all devices will connect to this Metro bundler automatically.

## Method 2: Using Expo Run (Alternative)

### Step 1: List Available Devices

```bash
pnpm android:devices
```

### Step 2: Let Expo Prompt You to Select Devices

Instead of specifying device IDs, let Expo show you a list to choose from:

**Terminal 1:**
```bash
npx expo run:android
# Select device 1 from the list
```

**Terminal 2:**
```bash
npx expo run:android
# Select device 2 from the list
```

This avoids device ID issues since Expo handles the selection interactively.

### Step 3: Start Metro Bundler

Metro bundler should start automatically, but if not:

```bash
pnpm start
```

## Method 3: Using ADB Directly (Manual Method)

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

### CommandError: Could not find device with name: ABC123XYZ

**This is a common issue** when using `expo run:android --device` with device IDs. Expo sometimes has trouble matching device IDs.

**Solutions:**

1. **Use the build-and-install method (Recommended - Most Reliable)**
   ```bash
   pnpm android:all
   ```
   This builds once and installs via ADB directly, completely avoiding Expo's device matching.

2. **Use interactive device selection**
   ```bash
   npx expo run:android
   # Don't use --device flag, let Expo show you the list to select from
   ```

3. **Check device connection**
   - Make sure USB debugging is enabled on both devices
   - Check that devices are authorized (you may need to accept the debugging prompt on the device)
   - Verify devices are connected: `pnpm android:devices`
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
# List all connected devices with details
pnpm android:devices

# Quick list of device IDs
pnpm android:list

# Fast build and install on all devices (RECOMMENDED - uses caching)
pnpm android:fast

# Optimized build and install on all devices (uses all Gradle optimizations)
pnpm android:optimized

# Standard build and install on all devices (reliable fallback)
pnpm android:all

# Build APK only (without installing)
pnpm android:build

# Run on first device (uses Expo's incremental builds - FASTEST for single device)
pnpm android:device1

# Run on second device (uses Expo's incremental builds - FASTEST for single device)
pnpm android:device2
```

### Recommended Approach:

**For fastest builds with multiple devices (Recommended):**
```bash
# Uses Expo dev client - fastest method with hot reload
pnpm android
```

**Alternative methods:**
```bash
# Fast build and install on all devices (uses caching, skips if recent)
pnpm android:fast

# Then start Metro bundler (in another terminal)
pnpm start
```

**Speed Comparison:**
- `pnpm android` (dev client, multiple devices): **Fastest** - uses Expo's incremental builds, hot reload
- `npx expo run:android` (single device): **Fast** - uses incremental builds
- `pnpm android:fast` (multiple devices): **Medium** - uses Gradle cache, skips if APK is recent
- `pnpm android:optimized` (multiple devices): **Medium** - full optimized Gradle build
- `pnpm android:all` (multiple devices): **Slower** - standard Gradle build

The dev client method (`pnpm android`) is the fastest and most convenient for development.

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

## Recommended Workflow (Easiest & Most Reliable)

### Option A: Expo Dev Client (Recommended - Fastest)

1. **Connect both devices via USB**
2. **Check devices are connected:**
   ```bash
   pnpm android:devices
   ```
3. **Run the dev client script:**
   ```bash
   pnpm android
   ```
   This will:
   - Start Metro bundler with `--dev-client` flag
   - Build and install on all connected devices
   - All devices connect to the same Metro bundler automatically
4. **Done!** The apps are running on all devices with hot reload enabled.

**Note:** This is the fastest method and uses Expo's incremental builds with hot reload support.

### Option B: Fast Build for Multiple Devices (Alternative)

1. **Connect both devices via USB**
2. **Check devices are connected:**
   ```bash
   pnpm android:devices
   ```
3. **Fast build and install on all devices:**
   ```bash
   pnpm android:fast
   ```
   This builds the APK (with caching, skips if recent) and installs it on all connected devices.
4. **Start Metro bundler:**
   ```bash
   pnpm start
   ```
5. **The apps will automatically connect to Metro bundler**

**Note:** This is slower than the dev client method because it does a full Gradle build.

### Option C: Interactive Device Selection

If you prefer to use `expo run:android`:

1. **Connect both devices via USB**
2. **Start Metro bundler (in terminal 1):**
   ```bash
   pnpm start
   ```
3. **Run Expo and select device (in terminal 2):**
   ```bash
   npx expo run:android
   # Select device 1 from the list
   ```
4. **Run Expo and select device (in terminal 3):**
   ```bash
   npx expo run:android
   # Select device 2 from the list
   ```

### Option C: Manual Device IDs (If Expo accepts them)

1. **Get device IDs:**
   ```bash
   pnpm android:list
   ```
2. **Run on each device in separate terminals:**
   ```bash
   # Terminal 1
   npx expo run:android --device <device-id-1>
   
   # Terminal 2
   npx expo run:android --device <device-id-2>
   ```

