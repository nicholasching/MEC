@echo off
REM Run Expo dev client on all connected Android devices
REM Starts Metro bundler once, then builds and installs on all devices
REM Usage: scripts\run-dev-client-all.bat

echo Checking for connected Android devices...
echo.

REM Get all device IDs and start builds
set DEVICE_COUNT=0
for /f "tokens=1" %%i in ('adb devices ^| findstr "device" ^| findstr /v "List"') do (
    set /a DEVICE_COUNT+=1
    echo Found device: %%i
    echo Building and installing on device: %%i
    start "Device %%i" cmd /c "npx expo run:android --device %%i"
)

if %DEVICE_COUNT%==0 (
    echo.
    echo ERROR: No Android devices found. Please connect at least one device via USB.
    pause
    exit /b 1
)

echo.
echo Found %DEVICE_COUNT% device(s)
echo Starting Metro bundler...
echo.

REM Start Metro bundler in a new window
start "Metro Bundler" cmd /c "npx expo start --dev-client"

echo.
echo ========================================
echo Metro bundler and device builds started
echo ========================================
echo.
echo Each device build will open in a separate window
echo Metro bundler is running in a separate window
echo.
echo Close the windows individually to stop them
echo.
pause
