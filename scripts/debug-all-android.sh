#!/bin/bash

npx expo prebuild
cd android && ./gradlew app:installDebug -PreactNativeDevServerPort=8081
adb -s RFCX70AC1CE install -r app/build/outputs/apk/debug/app-debug.apk
adb -s 48211FDAQ000PT install -r app/build/outputs/apk/debug/app-debug.apk

npx react-native start --port 8081
# ./gradlew app:installDebug -PreactNativeDevServerPort=8082

