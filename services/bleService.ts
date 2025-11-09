import { Platform } from 'react-native';
import { BleManager, Characteristic, Device, Service, State } from 'react-native-ble-plx';
import BleAdvertise from '../modules/ble-advertise/src/index';
import { requestBluetoothPermissions } from '../utils/permissions';

// Buffer polyfill for React Native
const Buffer = require('buffer').Buffer;

// Device unique ID - generate a stable ID
let deviceIdCache: string | null = null;
export const getDeviceId = (): string => {
  if (deviceIdCache) {
    return deviceIdCache;
  }
  deviceIdCache = `DEVICE-${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  return deviceIdCache;
};

export const DEVICE_ID = getDeviceId();

// Default advertisement message
export const ADVERTISEMENT_MESSAGE = 'Hello from BLE Relay!';

// GATT Service and Characteristic UUIDs
export const SERVICE_UUID = '597df698-a650-4a42-bfd6-d8fbe03602ae';
export const CHARACTERISTIC_UUID = '5f1b1461-160a-4e99-b268-b9c8ef2c0abb';

// 16-bit UUID for advertisement scanning (derived from first 16 bits of full UUID)
// This matches the 16-bit UUID used in Android advertisement
// Format: 0000XXXX-0000-1000-8000-00805f9b34fb where XXXX is the 16-bit value
export const ADVERTISEMENT_SERVICE_UUID_16BIT = '0000597D-0000-1000-8000-00805f9b34fb';

// Client Characteristic Configuration Descriptor UUID (for notifications)
const CLIENT_CHARACTERISTIC_CONFIG_UUID = '00002902-0000-1000-8000-00805f9b34fb';

class BLEService {
  private manager: BleManager;
  private isScanning: boolean = false;
  private isAdvertising: boolean = false;
  private discoveredDevices: Map<string, Device> = new Map();
  private connectedDevices: Map<string, Device> = new Map(); // deviceId -> Device
  private scanSubscription: any = null;
  private stateSubscription: any = null;
  private messageListeners: Set<(deviceId: string, message: string) => void> = new Set();
  private connectionListeners: Set<(deviceId: string, connected: boolean) => void> = new Set();
  private deviceCharacteristics: Map<string, Characteristic> = new Map(); // deviceId -> Characteristic
  
  constructor() {
    this.manager = new BleManager();
    this.setupStateListener();
  }

  private setupStateListener() {
    this.stateSubscription = this.manager.onStateChange((state: State) => {
      console.log('BLE State:', state);
      if (state === State.PoweredOn) {
        console.log('Bluetooth is powered on');
      } else if (state === State.PoweredOff) {
        console.log('Bluetooth is powered off');
      }
    }, true);
  }

  /**
   * Start advertising this device with GATT server
   */
  async startAdvertising(message: string = ADVERTISEMENT_MESSAGE): Promise<void> {
    try {
      const state = await this.manager.state();
      if (state !== State.PoweredOn) {
        throw new Error('Bluetooth is not powered on');
      }

      // Always request permissions for Android
      if (Platform.OS === 'android') {
        console.log('Checking/Requesting Bluetooth permissions...');
        const granted = await requestBluetoothPermissions();
        if (!granted) {
          throw new Error('Bluetooth permissions are required. Please grant all permissions to use BLE advertising.');
        }
        console.log('✅ Permissions granted, proceeding with advertising...');
      }

      // Use native Android advertising if available
      if (Platform.OS === 'android' && BleAdvertise.isAvailable()) {
        try {
          const deviceName = `BLE-R`;
          
          const advertisementData = {
            name: deviceName,
            deviceId: DEVICE_ID,
            message: message,
          };

          console.log('📡 Calling native BleAdvertise.startAdvertising...');
          console.log('📡 Service UUID: ' + SERVICE_UUID);
          console.log('📡 Characteristic UUID: ' + CHARACTERISTIC_UUID);
          
          const result = await BleAdvertise.startAdvertising(advertisementData);
          
          console.log('📡 Native startAdvertising returned:', result);
          
          this.isAdvertising = true;
          console.log(`✅ Native BLE advertising started with GATT server`);
          console.log(`Device ID: ${DEVICE_ID}`);
          console.log(`Service UUID: ${SERVICE_UUID}`);
          console.log(`Initial message: ${message}`);
        } catch (nativeError: any) {
          const errorMessage = nativeError?.message || nativeError?.toString() || 'Unknown error';
          const errorCode = nativeError?.code || 'UNKNOWN';
          
          console.error('❌ Native advertising error:');
          console.error('  Code:', errorCode);
          console.error('  Message:', errorMessage);
          
          if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION') || errorCode === 'PERMISSION_DENIED') {
            const permissionError = 'Bluetooth permission required. Please grant BLUETOOTH_CONNECT permission in app settings.';
            console.error('❌ Permission error:', errorMessage);
            throw new Error(permissionError);
          }
          
          if (errorCode === 'ALREADY_ADVERTISING') {
            console.log('ℹ️ Already advertising, continuing...');
            this.isAdvertising = true;
            return;
          }
          
          throw new Error(`Failed to start advertising: ${errorMessage}`);
        }
      } else {
        // Simulated advertising
        this.isAdvertising = true;
        console.warn(`⚠️ SIMULATED ADVERTISING: No actual BLE packets are being broadcast`);
        console.warn(`⚠️ This device will NOT be discoverable by other devices`);
        console.log(`Device ID: ${DEVICE_ID}`);
        console.log(`Message: ${message}`);
      }
    } catch (error) {
      console.error('Error starting advertising:', error);
      throw error;
    }
  }

  /**
   * Stop advertising
   */
  async stopAdvertising(): Promise<void> {
    try {
      if (this.isAdvertising) {
        if (Platform.OS === 'android' && BleAdvertise.isAvailable()) {
          try {
            await BleAdvertise.stopAdvertising();
            console.log('Native BLE advertising stopped');
          } catch (nativeError: any) {
            console.error('Error stopping native advertising:', nativeError);
          }
        }
        
        this.isAdvertising = false;
        console.log('Stopped advertising');
      }
    } catch (error) {
      console.error('Error stopping advertising:', error);
      this.isAdvertising = false;
      throw error;
    }
  }

  /**
   * Start scanning for other devices with the service UUID
   */
  async startScanning(
    onDeviceFound: (device: Device, deviceId: string, message: string) => void
  ): Promise<void> {
    try {
      if (this.isScanning) {
        console.log('Already scanning');
        return;
      }

      const state = await this.manager.state();
      if (state !== State.PoweredOn) {
        throw new Error('Bluetooth is not powered on');
      }

      if (Platform.OS === 'android') {
        console.log('Checking/Requesting Bluetooth permissions for scanning...');
        const granted = await requestBluetoothPermissions();
        if (!granted) {
          throw new Error('Bluetooth permissions are required. Please grant all permissions to use BLE scanning.');
        }
        console.log('✅ Permissions granted, proceeding with scanning...');
      }

      this.discoveredDevices.clear();

      // Start scanning for devices with our service UUID
      // We scan for the 16-bit UUID used in advertisements, but will verify the full UUID in GATT
      console.log(`🔍 Scanning for devices with service UUID: ${ADVERTISEMENT_SERVICE_UUID_16BIT} (16-bit)`);
      console.log(`   Full GATT service UUID: ${SERVICE_UUID}`);
      
      this.scanSubscription = this.manager.startDeviceScan(
        [ADVERTISEMENT_SERVICE_UUID_16BIT], // Scan for devices advertising our 16-bit service UUID
        { 
          allowDuplicates: false,
          scanMode: 2, // Low latency mode
        },
        async (error, device) => {
          if (error) {
            console.error('Scan error:', error);
            return;
          }

          if (device) {
            await this.handleDiscoveredDevice(device, onDeviceFound);
          }
        }
      );

      this.isScanning = true;
      console.log('Started scanning for BLE devices with service UUID:', SERVICE_UUID);
    } catch (error) {
      console.error('Error starting scan:', error);
      throw error;
    }
  }

  /**
   * Handle discovered device - connect automatically and read message
   */
  private async handleDiscoveredDevice(
    device: Device,
    onDeviceFound: (device: Device, deviceId: string, message: string) => void
  ): Promise<void> {
    const deviceId = device.id;

    try {
      // Check if we already discovered this device
      if (this.discoveredDevices.has(deviceId)) {
        return; // Already processing this device
      }

      // Check if device has our service UUID in advertisement
      // It may advertise with 16-bit UUID, but we'll verify the full UUID in GATT after connecting
      const serviceUUIDs = device.serviceUUIDs || [];
      const has16BitUUID = serviceUUIDs.some((uuid: string) => 
        uuid.toLowerCase().includes('597d') || 
        uuid.toLowerCase() === ADVERTISEMENT_SERVICE_UUID_16BIT.toLowerCase()
      );
      const hasFullUUID = serviceUUIDs.includes(SERVICE_UUID);
      
      if (!has16BitUUID && !hasFullUUID) {
        return; // Not our service
      }

      console.log(`📱 Found device with service UUID: ${device.name || device.id}`);
      console.log(`   Service UUIDs: ${serviceUUIDs.join(', ')}`);
      console.log(`   RSSI: ${device.rssi}`);

      // Mark as discovered
      this.discoveredDevices.set(deviceId, device);

      // Automatically connect to the device
      await this.connectToDevice(device, onDeviceFound);
    } catch (error) {
      console.error('Error handling discovered device:', error);
    }
  }

  /**
   * Connect to a device and set up GATT communication
   */
  async connectToDevice(
    device: Device,
    onDeviceFound: (device: Device, deviceId: string, message: string) => void
  ): Promise<void> {
    const deviceId = device.id;

    try {
      // Check if already connected
      if (this.connectedDevices.has(deviceId)) {
        console.log(`Device ${deviceId} already connected`);
        return;
      }

      console.log(`🔌 Connecting to device: ${device.name || deviceId}...`);

      // Connect to device
      const connectedDevice = await device.connect();
      console.log(`✅ Connected to device: ${deviceId}`);

      // Discover services and characteristics first
      await connectedDevice.discoverAllServicesAndCharacteristics();
      console.log(`✅ Discovered services and characteristics for ${deviceId}`);

      // Request larger MTU for longer messages (default is 23 bytes, request 517 bytes)
      // Request MTU after service discovery for better compatibility
      try {
        const mtuResult = await connectedDevice.requestMTU(517);
        console.log(`✅ MTU requested for ${deviceId}, result: ${mtuResult}`);
        // Note: The actual MTU might be negotiated to a lower value (e.g., 185, 247, etc.)
        // But even 185 bytes is much better than the default 20 bytes
        // Wait a bit for MTU negotiation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`⚠️ Failed to request MTU for ${deviceId}:`, error);
        // Continue even if MTU request fails - will use default 20 bytes
        // react-native-ble-plx will handle chunking for long messages
      }

      // Find our service
      const services = await connectedDevice.services();
      const targetService = services.find((s: Service) => s.uuid.toLowerCase() === SERVICE_UUID.toLowerCase());

      if (!targetService) {
        console.error(`❌ Service ${SERVICE_UUID} not found on device ${deviceId}`);
        await connectedDevice.cancelConnection();
        return;
      }

      console.log(`✅ Found service: ${targetService.uuid}`);

      // Find our characteristic
      const characteristics = await targetService.characteristics();
      const targetCharacteristic = characteristics.find(
        (c: Characteristic) => c.uuid.toLowerCase() === CHARACTERISTIC_UUID.toLowerCase()
      );

      if (!targetCharacteristic) {
        console.error(`❌ Characteristic ${CHARACTERISTIC_UUID} not found on device ${deviceId}`);
        await connectedDevice.cancelConnection();
        return;
      }

      console.log(`✅ Found characteristic: ${targetCharacteristic.uuid}`);

      // Store characteristic for this device
      this.deviceCharacteristics.set(deviceId, targetCharacteristic);

      // Read initial message
      // For long messages, we may need to read in chunks, but react-native-ble-plx handles this automatically
      try {
        const messageValue = await targetCharacteristic.read();
        // react-native-ble-plx returns base64-encoded value
        // For longer messages, it should handle multiple reads automatically
        let message: string;
        if (messageValue.value) {
          try {
            // Try base64 decode first (react-native-ble-plx format)
            const decoded = Buffer.from(messageValue.value, 'base64');
            message = decoded.toString('utf-8');
          } catch (e) {
            // If base64 decode fails, try direct UTF-8
            message = Buffer.from(messageValue.value, 'utf-8').toString('utf-8');
          }
        } else {
          message = '';
        }
        console.log(`✅ Read message from ${deviceId}: ${message.substring(0, 50)}... (${message.length} chars, ${messageValue.value?.length || 0} bytes)`);

        // Add to connected devices
        this.connectedDevices.set(deviceId, connectedDevice);

        // Notify listeners
        this.connectionListeners.forEach((listener) => {
          listener(deviceId, true);
        });

        // Set up notifications for message updates
        await this.setupMessageNotifications(deviceId, targetCharacteristic);

        // Call onDeviceFound callback
        onDeviceFound(connectedDevice, deviceId, message);
      } catch (error) {
        console.error(`Error reading message from ${deviceId}:`, error);
      }

      // Set up disconnect monitoring
      connectedDevice.onDisconnected((error, device) => {
        if (error) {
          console.error(`Device ${deviceId} disconnected with error:`, error);
        } else {
          console.log(`Device ${deviceId} disconnected`);
        }
        
        this.connectedDevices.delete(deviceId);
        this.deviceCharacteristics.delete(deviceId);
        
        // Notify listeners
        this.connectionListeners.forEach((listener) => {
          listener(deviceId, false);
        });
      });

    } catch (error) {
      console.error(`Error connecting to device ${deviceId}:`, error);
      this.connectedDevices.delete(deviceId);
      this.deviceCharacteristics.delete(deviceId);
    }
  }

  /**
   * Set up notifications for message updates from a device
   */
  private async setupMessageNotifications(deviceId: string, characteristic: Characteristic): Promise<void> {
    try {
      // Monitor characteristic for updates
      characteristic.monitor((error, characteristic) => {
        if (error) {
          console.error(`Error monitoring characteristic for ${deviceId}:`, error);
          return;
        }

        if (characteristic && characteristic.value) {
          try {
            // react-native-ble-plx returns base64-encoded value
            // Decode it to get the actual message
            let message = '';
            try {
              const decoded = Buffer.from(characteristic.value, 'base64');
              message = decoded.toString('utf-8');
            } catch (e) {
              // If base64 decode fails, try treating as UTF-8 directly
              console.warn(`Failed to decode base64 in notification, trying UTF-8: ${e}`);
              message = characteristic.value;
            }
            console.log(`📨 Message received from ${deviceId}: ${message.substring(0, 50)}... (${message.length} chars)`);

            // Notify listeners
            this.messageListeners.forEach((listener) => {
              listener(deviceId, message);
            });
          } catch (error) {
            console.error(`Error parsing message from ${deviceId}:`, error);
          }
        }
      });

      console.log(`✅ Set up message notifications for ${deviceId}`);
    } catch (error) {
      console.error(`Error setting up notifications for ${deviceId}:`, error);
    }
  }

  /**
   * Disconnect from a device
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      const device = this.connectedDevices.get(deviceId);
      if (!device) {
        console.log(`Device ${deviceId} not connected`);
        return;
      }

      await device.cancelConnection();
      this.connectedDevices.delete(deviceId);
      this.deviceCharacteristics.delete(deviceId);
      console.log(`Disconnected from device: ${deviceId}`);
    } catch (error) {
      console.error(`Error disconnecting from device ${deviceId}:`, error);
    }
  }

  /**
   * Stop scanning
   */
  stopScanning(): void {
    if (this.scanSubscription) {
      this.manager.stopDeviceScan();
      this.scanSubscription = null;
      this.isScanning = false;
      console.log('Stopped scanning');
    }
  }

  /**
   * Send a message to a connected device via GATT
   */
  async sendMessage(deviceId: string, message: string): Promise<void> {
    try {
      const characteristic = this.deviceCharacteristics.get(deviceId);
      if (!characteristic) {
        throw new Error(`Device ${deviceId} not connected or characteristic not found`);
      }

      // react-native-ble-plx expects base64-encoded string for write operations
      // Convert message to UTF-8 bytes, then to base64
      const messageBytes = Buffer.from(message, 'utf-8');
      const base64Message = messageBytes.toString('base64');
      
      // Write to characteristic
      // react-native-ble-plx and Android BLE stack handle long writes automatically
      // With larger MTU (517 bytes), we can send much longer messages (up to ~512 bytes payload)
      await characteristic.writeWithResponse(base64Message);
      console.log(`✅ Message sent to ${deviceId}: ${message.substring(0, 50)}... (${message.length} chars, ${messageBytes.length} bytes)`);
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send a message from the advertising device (update GATT server)
   */
  async sendMessageFromServer(message: string): Promise<void> {
    try {
      if (!this.isAdvertising) {
        throw new Error('Not advertising. Start advertising first to send messages.');
      }
      
      if (Platform.OS === 'android' && BleAdvertise.isAvailable()) {
        // Update the GATT server message (will notify all connected devices)
        await BleAdvertise.setMessage(message);
        console.log(`✅ Message updated on GATT server: ${message.substring(0, 50)}... (${message.length} chars)`);
      } else {
        throw new Error('Native advertising not available. Cannot send messages.');
      }
    } catch (error: any) {
      console.error('Error sending message from server:', error);
      throw error;
    }
  }

  /**
   * Add a message listener
   */
  onMessageReceived(listener: (deviceId: string, message: string) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  /**
   * Add a connection listener
   */
  onDeviceConnectionChanged(listener: (deviceId: string, connected: boolean) => void): () => void {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Get discovered devices
   */
  getDiscoveredDevices(): Device[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Get connected devices
   */
  getConnectedDevices(): Device[] {
    return Array.from(this.connectedDevices.values());
  }

  /**
   * Check if scanning
   */
  getIsScanning(): boolean {
    return this.isScanning;
  }

  /**
   * Check if advertising
   */
  getIsAdvertising(): boolean {
    return this.isAdvertising;
  }

  /**
   * Get service UUID
   */
  getServiceUuid(): string {
    return SERVICE_UUID;
  }

  /**
   * Get characteristic UUID
   */
  getCharacteristicUuid(): string {
    return CHARACTERISTIC_UUID;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopScanning();
    this.stopAdvertising();
    
    // Disconnect all devices
    this.connectedDevices.forEach((device, deviceId) => {
      device.cancelConnection().catch((error) => {
        console.error(`Error disconnecting device ${deviceId}:`, error);
      });
    });
    this.connectedDevices.clear();
    this.deviceCharacteristics.clear();

    // Clear listeners
    this.messageListeners.clear();
    this.connectionListeners.clear();

    if (this.stateSubscription) {
      this.stateSubscription.remove();
    }

    this.manager.destroy();
  }
}

// Export singleton instance
export const bleService = new BLEService();
