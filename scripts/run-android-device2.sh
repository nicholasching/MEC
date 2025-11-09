#!/bin/bash
# Run Expo app on second Android device
# Usage: ./scripts/run-android-device2.sh

echo "🔍 Finding connected Android devices..."

# Get second connected device ID
DEVICE=$(adb devices | grep -v "List" | grep "device" | sed -n '2p' | awk '{print $1}')

if [ -z "$DEVICE" ]; then
    echo "❌ Second Android device not found. Please connect a second device via USB."
    echo "   Run 'adb devices' to check connected devices."
    exit 1
fi

echo "📱 Found device: $DEVICE"
echo "🚀 Building and installing on device..."
echo ""

# Use ADB to set the target device, then let Expo handle it
export ANDROID_SERIAL=$DEVICE
npx expo run:android --device "$DEVICE"

