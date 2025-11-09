#!/bin/bash
# Fast method: Use Expo to build (with caching), then install APK on all devices
# This is faster than full Gradle build because Expo uses incremental builds
# Usage: ./scripts/fast-install-all.sh

echo "🔍 Checking for connected Android devices..."

DEVICES=$(adb devices | grep -v "List" | grep "device" | awk '{print $1}')

if [ -z "$DEVICES" ]; then
    echo "❌ No Android devices found. Please connect at least one device via USB."
    exit 1
fi

DEVICE_COUNT=$(echo "$DEVICES" | wc -l)
echo "✅ Found $DEVICE_COUNT device(s):"
FIRST_DEVICE=""
DEVICE_INDEX=0
for device in $DEVICES; do
    DEVICE_INFO=$(adb -s "$device" shell getprop ro.product.model 2>/dev/null || echo "Unknown")
    echo "   - $device ($DEVICE_INFO)"
    if [ $DEVICE_INDEX -eq 0 ]; then
        FIRST_DEVICE="$device"
    fi
    DEVICE_INDEX=$((DEVICE_INDEX + 1))
done

echo ""
echo "🚀 Fast build method: Using Expo (with incremental builds)"
echo ""

# Check if APK already exists and is recent (within last 5 minutes)
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
BUILD_NEEDED=true

if [ -f "$APK_PATH" ]; then
    # Check if APK is less than 5 minutes old
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        APK_AGE=$(($(date +%s) - $(stat -f %m "$APK_PATH")))
    else
        # Linux/Git Bash
        APK_AGE=$(($(date +%s) - $(stat -c %Y "$APK_PATH" 2>/dev/null || echo 0)))
    fi
    
    if [ $APK_AGE -lt 300 ]; then
        echo "✅ Recent APK found (${APK_AGE}s old), skipping build"
        echo "   Use --force-build to rebuild anyway"
        BUILD_NEEDED=false
    fi
fi

if [ "$1" == "--force-build" ]; then
    BUILD_NEEDED=true
    echo "🔄 Force build requested"
fi

if [ "$BUILD_NEEDED" = true ]; then
    echo "📦 Building with optimized Gradle (with caching)..."
    echo "   💡 Note: For even faster builds, use 'npx expo run:android' for single device"
    echo "   This script optimizes the Gradle build but still does a full build"
    echo ""
    
    # Use optimized Gradle build
    cd android
    ./gradlew assembleDebug --build-cache --parallel --configuration-cache 2>/dev/null || \
    ./gradlew assembleDebug --build-cache --parallel
    BUILD_RESULT=$?
    cd ..
    
    if [ $BUILD_RESULT -ne 0 ] || [ ! -f "$APK_PATH" ]; then
        echo "❌ Build failed!"
        exit 1
    fi
else
    echo "⏭️  Skipping build, using existing APK"
fi

if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK not found at $APK_PATH"
    exit 1
fi

echo ""
echo "✅ APK ready: $APK_PATH"
APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo "   Size: $APK_SIZE"
echo ""
echo "📱 Installing on all devices..."

# Install on each device
INSTALLED=0
FAILED=0

for device in $DEVICES; do
    echo ""
    echo "   Installing on $device..."
    adb -s "$device" install -r "$APK_PATH"
    if [ $? -eq 0 ]; then
        echo "   ✅ Installed successfully on $device"
        # Start the app
        echo "   🚀 Starting app on $device..."
        adb -s "$device" shell am start -n com.anonymous.BLErelay/.MainActivity
        INSTALLED=$((INSTALLED + 1))
    else
        echo "   ❌ Failed to install on $device"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "════════════════════════════════════════"
echo "✅ Installation complete!"
echo "   Installed: $INSTALLED device(s)"
if [ $FAILED -gt 0 ]; then
    echo "   Failed: $FAILED device(s)"
fi
echo ""
echo "💡 Next steps:"
echo "   1. Start Metro bundler: pnpm start"
echo "   2. The app should automatically connect to Metro bundler"
echo "   3. You can now test BLE communication between devices"
echo ""
echo "💡 Tip: If you just changed JS code, you can skip the build:"
echo "   ./scripts/fast-install-all.sh (uses cached APK if recent)"
echo "════════════════════════════════════════"

