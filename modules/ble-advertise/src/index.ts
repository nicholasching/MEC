import { NativeModules, Platform } from 'react-native';

const { BleAdvertiseModule } = NativeModules;

export interface AdvertisementData {
  name?: string;
  deviceId?: string;
  message?: string;
}

class BleAdvertise {
  /**
   * Check if the module is available
   */
  isAvailable(): boolean {
    if (Platform.OS !== 'android') {
      return false;
    }
    return BleAdvertiseModule != null;
  }

  /**
   * Start BLE advertising
   */
  async startAdvertising(data: AdvertisementData): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('BleAdvertiseModule is not available on this platform');
    }

    try {
      if (!BleAdvertiseModule.startAdvertising) {
        throw new Error('startAdvertising method not found on BleAdvertiseModule');
      }
      
      const result = await BleAdvertiseModule.startAdvertising(data);
      return result as string;
    } catch (error: any) {
      console.error('Error calling startAdvertising:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to start advertising';
      throw new Error(errorMessage);
    }
  }

  /**
   * Stop BLE advertising
   */
  async stopAdvertising(): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('BleAdvertiseModule is not available on this platform');
    }

    try {
      if (!BleAdvertiseModule.stopAdvertising) {
        throw new Error('stopAdvertising method not found on BleAdvertiseModule');
      }
      
      const result = await BleAdvertiseModule.stopAdvertising();
      return result as string;
    } catch (error: any) {
      console.error('Error calling stopAdvertising:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to stop advertising';
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if currently advertising
   */
  async isAdvertising(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return await BleAdvertiseModule.isAdvertising();
    } catch (error: any) {
      console.error('Error checking advertising status:', error);
      return false;
    }
  }

  /**
   * Update the advertisement message (must be advertising)
   */
  async setMessage(message: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('BleAdvertiseModule is not available on this platform');
    }

    try {
      if (!BleAdvertiseModule.setMessage) {
        throw new Error('setMessage method not found on BleAdvertiseModule');
      }
      
      const result = await BleAdvertiseModule.setMessage(message);
      return result as string;
    } catch (error: any) {
      console.error('Error calling setMessage:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to set message';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get current message from GATT server
   */
  async getMessage(): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('BleAdvertiseModule is not available on this platform');
    }

    try {
      if (!BleAdvertiseModule.getMessage) {
        throw new Error('getMessage method not found on BleAdvertiseModule');
      }
      
      const result = await BleAdvertiseModule.getMessage();
      return result as string;
    } catch (error: any) {
      console.error('Error calling getMessage:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to get message';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get number of connected devices
   */
  async getConnectedDevicesCount(): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      if (!BleAdvertiseModule.getConnectedDevicesCount) {
        return 0;
      }
      
      const result = await BleAdvertiseModule.getConnectedDevicesCount();
      return result as number;
    } catch (error: any) {
      console.error('Error calling getConnectedDevicesCount:', error);
      return 0;
    }
  }
}

export default new BleAdvertise();
