#!/bin/bash
# Run Expo app on all connected Android devices simultaneously
# Usage: ./scripts/run-all-android-devices.sh
# Note: Start Metro bundler separately with 'pnpm start' first!

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
echo "⚠️  IMPORTANT: Make sure Metro bundler is running first!"
echo "   Start it with: pnpm start"
echo ""
read -p "Press Enter to continue building for all devices..."

# Run on each device in background
for device in $DEVICES; do
    echo "📱 Building and installing on device: $device"
    npx expo run:android --device "$device" &
    DEVICE_PIDS="$DEVICE_PIDS $!"
done

echo "✅ Started build/install process on all devices"
echo "💡 Build processes are running in the background"
echo "💡 Each device will install the app when the build completes"

# Wait for all background jobs
wait
echo "✅ All builds completed!"

