#!/bin/bash
# Run Expo app on second Android device
# Usage: ./scripts/run-android-device2.sh

# Get second connected device
DEVICE=$(adb devices | grep -v "List" | grep "device" | sed -n '2p' | awk '{print $1}')

if [ -z "$DEVICE" ]; then
    echo "❌ Second Android device not found. Please connect a second device via USB."
    exit 1
fi

echo "📱 Running on device: $DEVICE"
npx expo run:android --device "$DEVICE"

