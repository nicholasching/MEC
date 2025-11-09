import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

/**
 * Request Bluetooth permissions for Android 12+ (API 31+)
 * This will always show a permission dialog if permissions are not granted
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true; // iOS handles permissions differently
  }

  try {
    // Check Android version
    if (Platform.Version >= 31) {
      // Android 12+ requires runtime permissions
      console.log('Requesting Bluetooth permissions for Android 12+...');
      
      // Always request permissions - this will show the system dialog if permissions are not granted
      // Note: If permissions are already granted, requestMultiple will return immediately with GRANTED status
      // If permissions were previously denied, it may not show a dialog - we'll handle that case below
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, // Still needed for scanning
      ]);

      console.log('Permission request results:', granted);

      const scanGranted = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN];
      const advertiseGranted = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE];
      const connectGranted = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT];
      const locationGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

      const allGranted = 
        scanGranted === PermissionsAndroid.RESULTS.GRANTED &&
        advertiseGranted === PermissionsAndroid.RESULTS.GRANTED &&
        connectGranted === PermissionsAndroid.RESULTS.GRANTED;

      if (!allGranted) {
        // Check if any permissions were denied permanently
        const anyPermanentlyDenied = 
          scanGranted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
          advertiseGranted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
          connectGranted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

        if (anyPermanentlyDenied) {
          Alert.alert(
            'Permissions Required',
            'Bluetooth permissions are required for BLE advertising. They have been permanently denied. Please enable them in app settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: async () => {
                  try {
                    await Linking.openSettings();
                  } catch (error) {
                    console.error('Error opening settings:', error);
                  }
                }
              },
            ]
          );
        } else {
          // Permissions were denied but can be requested again
          // On Android, if permissions were previously denied, the system might not show the dialog again immediately
          // We should guide the user to try again or go to settings
          const anyDenied = 
            scanGranted === PermissionsAndroid.RESULTS.DENIED ||
            advertiseGranted === PermissionsAndroid.RESULTS.DENIED ||
            connectGranted === PermissionsAndroid.RESULTS.DENIED;
          
          Alert.alert(
            'Permissions Required',
            anyDenied 
              ? 'Bluetooth permissions are required. The system permission dialog may not appear again if permissions were previously denied. Please grant permissions in app settings, or try again.'
              : 'Bluetooth permissions are required for BLE advertising. Please grant all permissions when prompted.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: async () => {
                  try {
                    await Linking.openSettings();
                  } catch (error) {
                    console.error('Error opening settings:', error);
                  }
                }
              },
              {
                text: 'Try Again',
                onPress: async () => {
                  // Wait a moment before retrying to give the system time
                  await new Promise(resolve => setTimeout(resolve, 500));
                  return await requestBluetoothPermissions();
                }
              },
            ]
          );
        }
        return false;
      }

      console.log('✅ All Bluetooth permissions granted');
      return true;
    } else {
      // Android 11 and below - request location permission for scanning
      console.log('Requesting location permission for Android 11 and below...');
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs location permission to scan for Bluetooth devices.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Location permission granted');
        return true;
      } else {
        console.log('❌ Location permission denied:', granted);
        Alert.alert(
          'Permission Required',
          'Location permission is required for Bluetooth scanning on Android 11 and below.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
  } catch (err) {
    console.error('Error requesting permissions:', err);
    Alert.alert(
      'Error',
      `Failed to request permissions: ${err instanceof Error ? err.message : 'Unknown error'}`,
      [{ text: 'OK' }]
    );
    return false;
  }
}

/**
 * Check if Bluetooth permissions are granted
 */
export async function checkBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    if (Platform.Version >= 31) {
      const hasScan = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      const hasAdvertise = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
      const hasConnect = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      return hasScan && hasAdvertise && hasConnect;
    } else {
      const hasLocation = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      return hasLocation;
    }
  } catch (err) {
    console.warn('Error checking permissions:', err);
    return false;
  }
}

