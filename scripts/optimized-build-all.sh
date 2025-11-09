#!/bin/bash
# Optimized Gradle build with caching and parallel execution
# Faster than regular assembleDebug, but still slower than Expo's incremental build
# Usage: ./scripts/optimized-build-all.sh

echo "🔍 Checking for connected Android devices..."

DEVICES=$(adb devices | grep -v "List" | grep "device" | awk '{print $1}')

if [ -z "$DEVICES" ]; then
    echo "❌ No Android devices found. Please connect at least one device via USB."
    exit 1
fi

DEVICE_COUNT=$(echo "$DEVICES" | wc -l)
echo "✅ Found $DEVICE_COUNT device(s):"
echo "$DEVICES" | while read device; do
    DEVICE_INFO=$(adb -s "$device" shell getprop ro.product.model 2>/dev/null || echo "Unknown")
    echo "   - $device ($DEVICE_INFO)"
done

echo ""
echo "📦 Building APK with optimizations..."
echo "   - Build cache enabled"
echo "   - Parallel execution enabled"
echo "   - Configuration cache enabled (if supported)"
echo ""

# Build APK with optimizations
cd android

# Try configuration cache first (Gradle 6.6+)
if ./gradlew help --configuration-cache 2>&1 | grep -q "Configuration cache"; then
    echo "   Using configuration cache..."
    ./gradlew assembleDebug --build-cache --parallel --configuration-cache
else
    echo "   Using build cache and parallel execution..."
    ./gradlew assembleDebug --build-cache --parallel
fi

BUILD_RESULT=$?
cd ..

if [ $BUILD_RESULT -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK not found at $APK_PATH"
    exit 1
fi

echo "✅ Build successful!"
echo "📦 APK location: $APK_PATH"
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
echo "════════════════════════════════════════"

