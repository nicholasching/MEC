#!/bin/bash
# Run Expo app on all connected Android devices simultaneously
# Usage: ./scripts/run-all-android-devices.sh
# Note: This script builds once and installs on all devices (more efficient)

echo "🔍 Checking for connected Android devices..."

DEVICES=$(adb devices | grep -v "List" | grep "device" | awk '{print $1}')

if [ -z "$DEVICES" ]; then
    echo "❌ No Android devices found. Please connect at least one device via USB."
    exit 1
fi

DEVICE_COUNT=$(echo "$DEVICES" | wc -l)
echo "✅ Found $DEVICE_COUNT device(s):"
echo "$DEVICES" | while read device; do
    echo "   - $device"
done

echo ""
echo "📦 Strategy: Build once, install on all devices"
echo ""

# Option 1: Build APK once, then install on all devices
echo "🚀 Building APK..."
cd android
./gradlew assembleDebug
cd ..

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK not found at $APK_PATH"
    exit 1
fi

echo "✅ Build successful!"
echo ""
echo "📱 Installing on all devices..."

# Install on each device
for device in $DEVICES; do
    echo "   Installing on $device..."
    adb -s "$device" install -r "$APK_PATH"
    if [ $? -eq 0 ]; then
        echo "   ✅ Installed on $device"
        # Start the app
        adb -s "$device" shell am start -n com.anonymous.BLErelay/.MainActivity
    else
        echo "   ❌ Failed to install on $device"
    fi
done

echo ""
echo "✅ Installation complete on all devices!"
echo "💡 Start Metro bundler with: pnpm start"
echo "💡 The app should automatically connect to Metro bundler"

