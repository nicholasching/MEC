#!/bin/bash
# Run Expo app on first Android device
# Usage: ./scripts/run-android-device1.sh

# Get first connected device
DEVICE=$(adb devices | grep -v "List" | grep "device" | head -1 | awk '{print $1}')

if [ -z "$DEVICE" ]; then
    echo "❌ No Android devices found. Please connect a device via USB."
    exit 1
fi

echo "📱 Running on device: $DEVICE"
npx expo run:android --device "$DEVICE"

