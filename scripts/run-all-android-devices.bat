@echo off
REM Run Expo app on all connected Android devices simultaneously
REM Usage: scripts\run-all-android-devices.bat

echo Checking for connected Android devices...

REM Get all device IDs
for /f "tokens=1" %%i in ('adb devices ^| findstr "device" ^| findstr /v "List"') do (
    echo Building and installing on device: %%i
    start "Device %%i" cmd /c "npx expo run:android --device %%i"
)

echo.
echo Started build/install process on all devices
echo Each device will open in a separate window
echo.
echo To start Metro bundler separately, run: npx expo start

pause

