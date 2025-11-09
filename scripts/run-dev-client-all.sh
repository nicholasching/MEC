#!/bin/bash
# Run Expo dev client on all connected Android devices
# Builds APK using Gradle, installs on all devices, then starts Metro
# Usage: ./scripts/run-dev-client-all.sh

echo "🔍 Checking for ADB (Android Debug Bridge)..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Try to find ADB
ADB_CMD=""
if command_exists adb; then
    ADB_CMD="adb"
    echo "✅ Found ADB in PATH"
elif [ -n "$ANDROID_HOME" ] && [ -f "$ANDROID_HOME/platform-tools/adb.exe" ]; then
    ADB_CMD="$ANDROID_HOME/platform-tools/adb.exe"
    echo "✅ Found ADB in ANDROID_HOME: $ADB_CMD"
elif [ -n "$ANDROID_SDK_ROOT" ] && [ -f "$ANDROID_SDK_ROOT/platform-tools/adb.exe" ]; then
    ADB_CMD="$ANDROID_SDK_ROOT/platform-tools/adb.exe"
    echo "✅ Found ADB in ANDROID_SDK_ROOT: $ADB_CMD"
else
    # Try common Windows locations (multiple path formats)
    WINDOWS_USER=$(whoami 2>/dev/null || echo "$USER" || echo "Nick")
    
    # Try different path formats for Windows
    POSSIBLE_PATHS=(
        "/c/Users/$WINDOWS_USER/AppData/Local/Android/Sdk/platform-tools/adb.exe"
        "C:/Users/$WINDOWS_USER/AppData/Local/Android/Sdk/platform-tools/adb.exe"
        "/c/Users/$USER/AppData/Local/Android/Sdk/platform-tools/adb.exe"
        "C:/Users/$USER/AppData/Local/Android/Sdk/platform-tools/adb.exe"
        "$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe"
    )
    
    # Also try with LOCALAPPDATA if set
    if [ -n "$LOCALAPPDATA" ]; then
        POSSIBLE_PATHS+=("$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe")
        # Convert Windows path to Git Bash path if needed
        if [[ "$LOCALAPPDATA" == *":"* ]]; then
            # Convert C:\Users\... to /c/Users/...
            LOCALAPPDATA_BASH=$(echo "$LOCALAPPDATA" | sed 's|^C:|/c|' | sed 's|\\|/|g')
            POSSIBLE_PATHS+=("$LOCALAPPDATA_BASH/Android/Sdk/platform-tools/adb.exe")
        fi
    fi
    
    for path in "${POSSIBLE_PATHS[@]}"; do
        if [ -f "$path" ]; then
            ADB_CMD="$path"
            echo "✅ Found ADB: $ADB_CMD"
            break
        fi
    done
    
    if [ -z "$ADB_CMD" ]; then
        echo "❌ ADB not found!"
        echo ""
        echo "💡 Please install ADB or add it to your PATH:"
        echo "   1. Install Android Studio (includes ADB)"
        echo "   2. Add ADB to PATH:"
        echo "      - Location: %LOCALAPPDATA%\\Android\\Sdk\\platform-tools"
        echo "      - Or set ANDROID_HOME environment variable"
        echo "   3. Or install ADB standalone"
        echo ""
        echo "💡 Run 'pnpm android:find-adb' to search for ADB"
        echo "💡 After installing, restart your terminal and try again"
        exit 1
    fi
fi

echo ""
echo "🔍 Checking for connected Android devices..."

# Restart ADB server to avoid hanging
echo "💡 Restarting ADB server..."
$ADB_CMD kill-server 2>/dev/null || true
sleep 1
$ADB_CMD start-server 2>&1 | head -5 || true
sleep 1

# Get devices
echo "💡 Querying devices..."
DEVICES_OUTPUT=$($ADB_CMD devices 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Error running adb devices"
    echo "💡 Output: $DEVICES_OUTPUT"
    exit 1
fi

# Parse devices
DEVICES=$(echo "$DEVICES_OUTPUT" | awk 'NR>1 && /device$/ {print $1}')

if [ -z "$DEVICES" ]; then
    echo "❌ No Android devices found"
    echo ""
    echo "ADB output:"
    echo "$DEVICES_OUTPUT"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Connect your device via USB"
    echo "   2. Enable USB Debugging on your device"
    echo "   3. Accept the debugging authorization prompt"
    echo "   4. Try: $ADB_CMD devices"
    exit 1
fi

# Count and display devices
DEVICE_COUNT=$(echo "$DEVICES" | wc -l | tr -d ' ')
echo "✅ Found $DEVICE_COUNT device(s):"

DEVICE_ARRAY=()
DEVICE_INDEX=0
for device in $DEVICES; do
    DEVICE_INFO=$($ADB_CMD -s "$device" shell getprop ro.product.model 2>/dev/null || echo "Unknown")
    echo "   $((DEVICE_INDEX + 1)). $device ($DEVICE_INFO)"
    DEVICE_ARRAY+=("$device")
    DEVICE_INDEX=$((DEVICE_INDEX + 1))
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 1: Building APK using Gradle"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 This may take a few minutes for the first build..."
echo ""

if [ ! -d "android" ]; then
    echo "❌ Android directory not found!"
    echo "💡 Run 'npx expo prebuild --platform android' first"
    exit 1
fi

# Build APK
cd android
./gradlew assembleDebug --build-cache --parallel
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
echo "📦 APK: $APK_PATH"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📲 Step 2: Installing APK on all devices"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0

for device in "${DEVICE_ARRAY[@]}"; do
    echo "📲 Installing on: $device"
    if $ADB_CMD -s "$device" install -r "$APK_PATH"; then
        echo "✅ Installed on: $device"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo "🚀 Starting app..."
        $ADB_CMD -s "$device" shell am start -n com.anonymous.BLErelay/.MainActivity
    else
        echo "❌ Failed on: $device"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
done

echo "📊 Summary: ✅ $SUCCESS_COUNT/$DEVICE_COUNT successful"
if [ $FAIL_COUNT -gt 0 ]; then
    echo "            ❌ $FAIL_COUNT/$DEVICE_COUNT failed"
fi
echo ""

if [ $SUCCESS_COUNT -eq 0 ]; then
    echo "❌ No devices installed. Not starting Metro."
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Step 3: Starting Metro bundler"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Metro will connect to all devices"
echo "💡 Hot reload enabled"
echo "💡 Press Ctrl+C to stop"
echo ""

npx expo start --dev-client
