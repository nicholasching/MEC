#!/bin/bash
# Helper script to find ADB on Windows
# Usage: ./scripts/find-adb.sh

echo "🔍 Looking for ADB (Android Debug Bridge)..."
echo ""

# Check PATH
if command -v adb >/dev/null 2>&1; then
    echo "✅ Found in PATH: $(which adb)"
    adb version
    exit 0
fi

# Check ANDROID_HOME
if [ -n "$ANDROID_HOME" ]; then
    ADB_PATH="$ANDROID_HOME/platform-tools/adb.exe"
    if [ -f "$ADB_PATH" ]; then
        echo "✅ Found in ANDROID_HOME: $ADB_PATH"
        "$ADB_PATH" version
        exit 0
    fi
fi

# Check ANDROID_SDK_ROOT
if [ -n "$ANDROID_SDK_ROOT" ]; then
    ADB_PATH="$ANDROID_SDK_ROOT/platform-tools/adb.exe"
    if [ -f "$ADB_PATH" ]; then
        echo "✅ Found in ANDROID_SDK_ROOT: $ADB_PATH"
        "$ADB_PATH" version
        exit 0
    fi
fi

# Check common Windows locations
COMMON_LOCATIONS=(
    "$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
    "$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe"
    "/c/Users/$USER/AppData/Local/Android/Sdk/platform-tools/adb.exe"
    "C:/Users/$USER/AppData/Local/Android/Sdk/platform-tools/adb.exe"
)

for location in "${COMMON_LOCATIONS[@]}"; do
    if [ -f "$location" ]; then
        echo "✅ Found at: $location"
        "$location" version
        exit 0
    fi
done

echo "❌ ADB not found!"
echo ""
echo "💡 Please install ADB:"
echo "   1. Install Android Studio (includes ADB)"
echo "   2. Add to PATH: %LOCALAPPDATA%\\Android\\Sdk\\platform-tools"
echo "   3. Or set ANDROID_HOME environment variable"
exit 1

