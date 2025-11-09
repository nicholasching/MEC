#!/bin/bash
# Run Expo dev client on all connected Android devices (Interactive version)
# Lets you select devices interactively, then builds and starts Metro
# Usage: ./scripts/run-dev-client-all-interactive.sh

echo "🔍 Checking for connected Android devices..."

DEVICES=$(adb devices | grep -v "List" | grep "device" | awk '{print $1}')

if [ -z "$DEVICES" ]; then
    echo "❌ No Android devices found. Please connect at least one device via USB."
    exit 1
fi

DEVICE_COUNT=$(echo "$DEVICES" | wc -l)
echo "✅ Found $DEVICE_COUNT device(s):"

# Store device list in array
DEVICE_ARRAY=()
DEVICE_INDEX=0
for device in $DEVICES; do
    DEVICE_INFO=$(adb -s "$device" shell getprop ro.product.model 2>/dev/null || echo "Unknown")
    echo "   $((DEVICE_INDEX + 1)). $device ($DEVICE_INFO)"
    DEVICE_ARRAY+=("$device")
    DEVICE_INDEX=$((DEVICE_INDEX + 1))
done

echo ""
echo "📱 Building and installing on all devices..."
echo "💡 Expo will prompt you to select a device for each build"
echo "💡 Select a different device each time"
echo ""

# Build for each device - Expo will prompt for device selection
BUILD_COUNT=0
for device in "${DEVICE_ARRAY[@]}"; do
    BUILD_COUNT=$((BUILD_COUNT + 1))
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 Building for device $BUILD_COUNT/$DEVICE_COUNT"
    echo "💡 Select device from the list when prompted"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Run expo run:android without device flag - let Expo prompt for selection
    npx expo run:android
    
    if [ $? -eq 0 ]; then
        echo "✅ Build completed"
    else
        echo "❌ Build failed"
        echo "⚠️  Continuing with next device..."
    fi
    echo ""
done

echo "════════════════════════════════════════"
echo "✅ All builds completed!"
echo ""

echo "🚀 Starting Metro bundler with dev client..."
echo ""

# Start Metro bundler
npx expo start --dev-client

echo ""
echo "✅ Metro bundler started!"
echo "💡 All devices should automatically connect to Metro"
echo "💡 Hot reload is enabled - code changes will update on all devices"

