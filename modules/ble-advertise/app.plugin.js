const { withAndroidManifest, withAppBuildGradle, withSettingsGradle, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to configure the native Android module
 */
module.exports = function withBleAdvertise(config) {
  // Ensure Android permissions are set
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = manifest['uses-permission'];

    // Add required permissions if not already present
    const requiredPermissions = [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.BLUETOOTH_ADVERTISE',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ];

    requiredPermissions.forEach((permission) => {
      if (!permissions.find((p) => p.$['android:name'] === permission)) {
        permissions.push({ $: { 'android:name': permission } });
      }
    });

    // Add BLUETOOTH_SCAN and BLUETOOTH_ADVERTISE with usesPermissionFlags for Android 12+
    const scanPermission = permissions.find(
      (p) => p.$['android:name'] === 'android.permission.BLUETOOTH_SCAN'
    );
    if (scanPermission && !scanPermission.$['android:usesPermissionFlags']) {
      scanPermission.$['android:usesPermissionFlags'] = 'neverForLocation';
    }

    const advertisePermission = permissions.find(
      (p) => p.$['android:name'] === 'android.permission.BLUETOOTH_ADVERTISE'
    );
    if (advertisePermission && !advertisePermission.$['android:usesPermissionFlags']) {
      advertisePermission.$['android:usesPermissionFlags'] = 'neverForLocation';
    }

    // Add feature declarations
    if (!manifest['uses-feature']) {
      manifest['uses-feature'] = [];
    }

    const features = manifest['uses-feature'];
    
    if (!features.find((f) => f.$['android:name'] === 'android.hardware.bluetooth_le')) {
      features.push({
        $: {
          'android:name': 'android.hardware.bluetooth_le',
          'android:required': 'false',
        },
      });
    }

    return config;
  });

  // Note: The actual module integration (settings.gradle, build.gradle, MainApplication.kt)
  // needs to be done manually or via the script after prebuild
  // This is because Expo's config plugins have limitations with custom native modules

  return config;
};

