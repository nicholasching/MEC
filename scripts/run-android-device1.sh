#!/bin/bash
# Run Expo app on first Android device
# Usage: ./scripts/run-android-device1.sh

echo "🔍 Finding connected Android devices..."

# Get first connected device ID
DEVICE=$(adb devices | grep -v "List" | grep "device" | head -1 | awk '{print $1}')

if [ -z "$DEVICE" ]; then
    echo "❌ No Android devices found. Please connect a device via USB."
    echo "   Run 'adb devices' to check connected devices."
    exit 1
fi

echo "📱 Found device: $DEVICE"
echo "🚀 Building and installing on device..."
echo ""

# Use ADB to set the target device, then let Expo handle it
export ANDROID_SERIAL=$DEVICE
npx expo run:android --device "$DEVICE"

