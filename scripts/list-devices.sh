#!/bin/bash
# List all connected Android devices with details
# Usage: ./scripts/list-devices.sh

echo "🔍 Connected Android Devices:"
echo ""

DEVICES=$(adb devices | grep -v "List" | grep "device" | awk '{print $1}')

if [ -z "$DEVICES" ]; then
    echo "❌ No Android devices found."
    echo ""
    echo "Please:"
    echo "1. Connect your Android device via USB"
    echo "2. Enable USB Debugging on your device"
    echo "3. Accept the debugging authorization prompt on your device"
    echo "4. Run 'adb devices' to verify"
    exit 1
fi

echo "Device IDs:"
echo "$DEVICES" | while read device; do
    echo "  - $device"
done

echo ""
echo "Device Details:"
adb devices -l | grep -v "List"

echo ""
echo "💡 To run on a specific device, use:"
echo "   npx expo run:android --device <device-id>"
echo ""
echo "💡 Or let Expo prompt you to select:"
echo "   npx expo run:android"

