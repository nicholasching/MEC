const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin to configure the Gemma LLM native module
 */
module.exports = function withGemmaLLM(config) {
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
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ];

    requiredPermissions.forEach((permission) => {
      if (!permissions.find((p) => p.$['android:name'] === permission)) {
        permissions.push({ $: { 'android:name': permission } });
      }
    });

    return config;
  });

  // Note: The actual module integration (settings.gradle, build.gradle, MainApplication.kt)
  // needs to be done manually or via the script after prebuild
  // This is because Expo's config plugins have limitations with custom native modules

  return config;
};

