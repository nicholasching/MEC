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

// Message format for global channel with routing
interface RoutedMessage {
  origin: string; // Original sender device ID
  hops: number; // Number of hops/retransfers (max 5)
  message: string; // Actual message text
  timestamp: number; // Timestamp when message was created
}

// Maximum number of hops/retransfers
const MAX_HOPS = 5;

class BLEService {
  private manager: BleManager;
  private isScanning: boolean = false;
  private isAdvertising: boolean = false;
  private discoveredDevices: Map<string, Device> = new Map();
  private connectedDevices: Map<string, Device> = new Map(); // deviceId -> Device
  private scanSubscription: any = null;
  private stateSubscription: any = null;
  private messageListeners: Set<(message: string, originDeviceId: string, senderDeviceId: string) => void> = new Set();
  private connectionListeners: Set<(deviceId: string, connected: boolean) => void> = new Set();
  private connectedDeviceCountListeners: Set<(count: number) => void> = new Set();
  private deviceCharacteristics: Map<string, Characteristic> = new Map(); // deviceId -> Characteristic
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map(); // deviceId -> reconnect timer
  private reconnectAttempts: Map<string, number> = new Map(); // deviceId -> reconnect attempt count
  private manualDisconnects: Set<string> = new Set(); // deviceId -> manually disconnected devices
  private reconnectCallbacks: Map<string, (device: Device, deviceId: string, message: string) => void> = new Map(); // deviceId -> callback
  // In reality, this should be a lot higher in an emergency situation as you want to make sure you try hardest to connect with others
  private maxReconnectAttempts: number = 20;
  private baseReconnectDelay: number = 1000; // 1 second
  private connectedDeviceCount: number = 0; // Connected device counter
  private processedMessageIds: Set<string> = new Set(); // Track processed messages to prevent duplicates
  private notificationListeners: Set<(title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void> = new Set();
  
  constructor() {
    this.manager = new BleManager();
    // Auto-start advertising and scanning when Bluetooth is ready
    this.setupAutoStart();
  }

  /**
   * Auto-start advertising and scanning when Bluetooth is ready
   */
  private setupAutoStart() {
    // Start listening once bluetooth is available
    this.stateSubscription = this.manager.onStateChange(async (state: State) => {
      console.log('BLE State:', state);
      if (state === State.PoweredOn) {
        console.log('Bluetooth is powered on - auto-starting...');
        try {
          // Wait a bit for permissions to be ready
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Start advertising
          await this.startAdvertising(ADVERTISEMENT_MESSAGE);
          
          // Start scanning and auto-connecting
          await this.startScanning((device, deviceId, message) => {
            // Device connected callback
            console.log(`Auto-connected to device: ${deviceId}`);
          });
        } catch (error) {
          console.error('Error auto-starting BLE:', error);
          // Don't throw - auto-start failures should be non-blocking
        }
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
          this.postNotification('Advertising Started', 'Device is now discoverable and accepting connections', 'success');
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
      this.postNotification('Device Connected', `Successfully connected to ${device.name || deviceId}`, 'success');

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
          // react-native-ble-plx returns the value as a base64-encoded string
          // The Android server now sends raw UTF-8 bytes, and react-native-ble-plx base64-encodes them for JS
          // So we just need to decode once from base64
          let message: string = '';
          if (messageValue.value) {
            try {
              // Decode from base64 (react-native-ble-plx always returns base64)
              const decoded = Buffer.from(messageValue.value, 'base64');
              message = decoded.toString('utf-8');
            } catch (e) {
              // If base64 decode fails, try using the value directly as UTF-8
              console.warn(`⚠️ Failed to decode base64, using raw value: ${e}`);
              message = messageValue.value;
            }
          } else {
            message = '';
          }
          console.log(`✅ Read message from ${deviceId}: ${message.substring(0, 50)}... (${message.length} chars)`);

        // Add to connected devices
        this.connectedDevices.set(deviceId, connectedDevice);
        this.connectedDeviceCount = this.connectedDevices.size;
        
        // Notify listeners
        this.connectionListeners.forEach((listener) => {
          listener(deviceId, true);
        });
        this.connectedDeviceCountListeners.forEach((listener) => {
          listener(this.connectedDeviceCount);
        });

        // Set up notifications for message updates
        await this.setupMessageNotifications(deviceId, targetCharacteristic);

        // Call onDeviceFound callback
        onDeviceFound(connectedDevice, deviceId, message);
      } catch (error) {
        console.error(`Error reading message from ${deviceId}:`, error);
      }

      // Store callback for reconnection
      this.reconnectCallbacks.set(deviceId, onDeviceFound);
      
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts.set(deviceId, 0);
      
      // Clear any existing reconnect timer
      if (this.reconnectTimers.has(deviceId)) {
        clearTimeout(this.reconnectTimers.get(deviceId)!);
        this.reconnectTimers.delete(deviceId);
      }

      // Set up disconnect monitoring with auto-reconnect
      connectedDevice.onDisconnected((error, device) => {
        if (error) {
          console.error(`Device ${deviceId} disconnected with error:`, error);
        } else {
          console.log(`Device ${deviceId} disconnected`);
        }
        
        this.connectedDevices.delete(deviceId);
        this.deviceCharacteristics.delete(deviceId);
        this.connectedDeviceCount = this.connectedDevices.size;
        
        // Notify listeners
        this.connectionListeners.forEach((listener) => {
          listener(deviceId, false);
        });
        this.connectedDeviceCountListeners.forEach((listener) => {
          listener(this.connectedDeviceCount);
        });
        
        // Auto-reconnect if not manually disconnected and scanning is active
        if (!this.manualDisconnects.has(deviceId) && this.isScanning) {
          this.attemptReconnect(deviceId, device);
        } else {
          // Clean up if manually disconnected
          this.manualDisconnects.delete(deviceId);
          this.reconnectCallbacks.delete(deviceId);
          this.reconnectAttempts.delete(deviceId);
        }
      });

    } catch (error: any) {
      console.error(`Error connecting to device ${deviceId}:`, error);
      this.postNotification('Connection Failed', `Failed to connect to device: ${error?.message || 'Unknown error'}`, 'error');
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
            // react-native-ble-plx returns the value as a base64-encoded string
            // The Android server now sends raw UTF-8 bytes, and react-native-ble-plx base64-encodes them for JS
            // So we just need to decode once from base64
            let messageData = '';
            try {
              // Decode from base64 (react-native-ble-plx always returns base64)
              const decoded = Buffer.from(characteristic.value, 'base64');
              messageData = decoded.toString('utf-8');
            } catch (e) {
              // If base64 decode fails, try using the value directly as UTF-8
              console.warn(`⚠️ Failed to decode base64 in notification: ${e}`);
              messageData = characteristic.value;
            }
            
            // Parse routed message
            this.handleRoutedMessage(messageData, deviceId);
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
   * Handle a routed message - parse, check origin/hops, and broadcast if needed
   */
  private handleRoutedMessage(messageData: string, senderDeviceId: string): void {
    try {
      // Try to parse as JSON (routed message)
      let routedMessage: RoutedMessage;
      try {
        routedMessage = JSON.parse(messageData);
        // Validate routed message structure
        if (!routedMessage.origin || typeof routedMessage.hops !== 'number' || !routedMessage.message) {
          throw new Error('Invalid routed message format');
        }
      } catch (e) {
        // If not JSON or invalid format, treat as plain message from sender
        // Create a routed message with origin = sender and hops = 0
        routedMessage = {
          origin: senderDeviceId,
          hops: 0,
          message: messageData,
          timestamp: Date.now(),
        };
      }

      // Create unique message ID using full message text to ensure uniqueness
      // Include origin, timestamp, and FULL message text (not just first 10 chars)
      const messageId = `${routedMessage.origin}-${routedMessage.timestamp}-${routedMessage.message}`;
      
      // Check if we've already processed this message
      if (this.processedMessageIds.has(messageId)) {
        console.log(`⚠️ Ignoring duplicate message: ${messageId.substring(0, 80)}...`);
        return;
      }

      // Check if message originated from this device (prevent loops)
      if (routedMessage.origin === DEVICE_ID) {
        console.log(`⚠️ Ignoring message from self (already shown in UI): ${routedMessage.message.substring(0, 50)}...`);
        return;
      }

      // Check hop count (max 5)
      if (routedMessage.hops >= MAX_HOPS) {
        console.log(`⚠️ Message exceeded max hops (${routedMessage.hops}): ${routedMessage.message.substring(0, 50)}...`);
        return;
      }

      // Mark message as processed
      this.processedMessageIds.add(messageId);
      
      // Clean up old message IDs (keep last 100)
      if (this.processedMessageIds.size > 100) {
        const idsArray = Array.from(this.processedMessageIds);
        this.processedMessageIds.clear();
        idsArray.slice(-100).forEach(id => this.processedMessageIds.add(id));
      }

      console.log(`📨 Message received from ${senderDeviceId} (origin: ${routedMessage.origin}, hops: ${routedMessage.hops}): ${routedMessage.message.substring(0, 50)}...`);

      // Notify listeners with the actual message text, origin, and sender
      this.messageListeners.forEach((listener) => {
        listener(routedMessage.message, routedMessage.origin, senderDeviceId);
      });

      // Broadcast to all other connected devices (except sender)
      this.broadcastMessage(routedMessage, senderDeviceId);
    } catch (error) {
      console.error(`Error handling routed message:`, error);
    }
  }

  /**
   * Broadcast a message to all connected devices (except sender)
   */
  private async broadcastMessage(routedMessage: RoutedMessage, senderDeviceId: string): Promise<void> {
    // Increment hop count for rebroadcast
    const broadcastMessage: RoutedMessage = {
      ...routedMessage,
      hops: routedMessage.hops + 1,
    };

    // Don't broadcast if max hops reached
    if (broadcastMessage.hops > MAX_HOPS) {
      return;
    }

    // Serialize message to JSON
    const messageJson = JSON.stringify(broadcastMessage);

    // Broadcast to all connected devices except sender
    const broadcastPromises: Promise<void>[] = [];
    this.connectedDevices.forEach((device, deviceId) => {
      if (deviceId !== senderDeviceId) {
        broadcastPromises.push(
          this.sendMessage(deviceId, messageJson).catch((error) => {
            console.error(`Error broadcasting to ${deviceId}:`, error);
          })
        );
      }
    });

    // Wait for all broadcasts (don't block on errors)
    await Promise.allSettled(broadcastPromises);
    console.log(`📡 Broadcasted message to ${broadcastPromises.length} device(s)`);
  }

  /**
   * Attempt to reconnect to a device with exponential backoff
   */
  private async attemptReconnect(deviceId: string, device: Device): Promise<void> {
    const attempts = this.reconnectAttempts.get(deviceId) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.log(`❌ Max reconnect attempts (${this.maxReconnectAttempts}) reached for device ${deviceId}`);
      this.reconnectCallbacks.delete(deviceId);
      this.reconnectAttempts.delete(deviceId);
      return;
    }
    
    // Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s, etc. (max 30s)
    const delay = Math.min(this.baseReconnectDelay * Math.pow(2, attempts), 30000);
    const nextAttempt = attempts + 1;
    
    console.log(`🔄 Attempting to reconnect to ${deviceId} (attempt ${nextAttempt}/${this.maxReconnectAttempts}) in ${delay}ms...`);
    
    this.reconnectAttempts.set(deviceId, nextAttempt);
    
    const timer = setTimeout(async () => {
      try {
        // Check if scanning is still active
        if (!this.isScanning) {
          console.log(`⏹️ Scanning stopped, cancelling reconnect for ${deviceId}`);
          this.reconnectCallbacks.delete(deviceId);
          this.reconnectAttempts.delete(deviceId);
          return;
        }
        
        // Check if already reconnected
        if (this.connectedDevices.has(deviceId)) {
          console.log(`✅ Device ${deviceId} already reconnected`);
          this.reconnectCallbacks.delete(deviceId);
          this.reconnectAttempts.delete(deviceId);
          return;
        }
        
        // Get the callback for this device
        const callback = this.reconnectCallbacks.get(deviceId);
        if (!callback) {
          console.log(`❌ No reconnect callback for device ${deviceId}`);
          return;
        }
        
        // Try to reconnect
        console.log(`🔄 Reconnecting to device ${deviceId}...`);
        await this.connectToDevice(device, callback);
      } catch (error) {
        console.error(`❌ Reconnect attempt failed for ${deviceId}:`, error);
        // Schedule next reconnect attempt
        this.attemptReconnect(deviceId, device);
      }
    }, delay);
    
    this.reconnectTimers.set(deviceId, timer);
  }

  /**
   * Disconnect from a device (manual disconnect - no auto-reconnect)
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      // Mark as manual disconnect to prevent auto-reconnect
      this.manualDisconnects.add(deviceId);
      
      // Clear any pending reconnect timers
      if (this.reconnectTimers.has(deviceId)) {
        clearTimeout(this.reconnectTimers.get(deviceId)!);
        this.reconnectTimers.delete(deviceId);
      }
      
      const device = this.connectedDevices.get(deviceId);
      if (!device) {
        console.log(`Device ${deviceId} not connected`);
        this.manualDisconnects.delete(deviceId);
        return;
      }

      await device.cancelConnection();
      this.connectedDevices.delete(deviceId);
      this.deviceCharacteristics.delete(deviceId);
      this.reconnectCallbacks.delete(deviceId);
      this.reconnectAttempts.delete(deviceId);
      this.manualDisconnects.delete(deviceId);
      console.log(`Disconnected from device: ${deviceId}`);
    } catch (error) {
      console.error(`Error disconnecting from device ${deviceId}:`, error);
      this.manualDisconnects.delete(deviceId);
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
      
      // Clear all reconnect timers when stopping scan
      this.reconnectTimers.forEach((timer) => {
        clearTimeout(timer);
      });
      this.reconnectTimers.clear();
      this.reconnectCallbacks.clear();
      this.reconnectAttempts.clear();
      this.manualDisconnects.clear();
      
      console.log('Stopped scanning');
    }
  }

  /**
   * Send a message to a connected device via GATT
   * If message is a plain string, it will be wrapped in a RoutedMessage with this device as origin
   */
  async sendMessage(deviceId: string, message: string): Promise<void> {
    try {
      const characteristic = this.deviceCharacteristics.get(deviceId);
      if (!characteristic) {
        throw new Error(`Device ${deviceId} not connected or characteristic not found`);
      }

      // If message is not JSON (plain text), wrap it in a RoutedMessage
      let messageToSend: string = message;
      try {
        const parsed = JSON.parse(message);
        // Check if it's already a valid RoutedMessage
        if (!parsed.origin || typeof parsed.hops !== 'number' || !parsed.message) {
          // Not a valid RoutedMessage, wrap it
          const routedMessage: RoutedMessage = {
            origin: DEVICE_ID,
            hops: 0,
            message: message,
            timestamp: Date.now(),
          };
          messageToSend = JSON.stringify(routedMessage);
        } else {
          // Already a valid RoutedMessage, use as-is
          messageToSend = message;
        }
      } catch (e) {
        // Not JSON, wrap it in a RoutedMessage
        const routedMessage: RoutedMessage = {
          origin: DEVICE_ID,
          hops: 0,
          message: message,
          timestamp: Date.now(),
        };
        messageToSend = JSON.stringify(routedMessage);
      }

      // react-native-ble-plx expects base64-encoded string for write operations
      // Convert message to UTF-8 bytes, then to base64
      const messageBytes = Buffer.from(messageToSend, 'utf-8');
      const base64Message = messageBytes.toString('base64');
      
      // Write to characteristic
      // react-native-ble-plx and Android BLE stack handle long writes automatically
      // With larger MTU (517 bytes), we can send much longer messages (up to ~512 bytes payload)
      await characteristic.writeWithResponse(base64Message);
      console.log(`✅ Message sent to ${deviceId}: ${message.substring(0, 50)}... (${messageBytes.length} bytes)`);
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send a message from the advertising device (broadcast to all connected devices)
   * This creates a new message with this device as origin and broadcasts it
   */
  async sendMessageFromServer(message: string): Promise<void> {
    try {
      if (!this.isAdvertising) {
        throw new Error('Not advertising. Start advertising first to send messages.');
      }
      
      // Create a routed message with this device as origin
      const routedMessage: RoutedMessage = {
        origin: DEVICE_ID,
        hops: 0,
        message: message,
        timestamp: Date.now(),
      };

      // Serialize to JSON
      const messageJson = JSON.stringify(routedMessage);

      // Create message ID and mark as processed BEFORE sending to prevent receiving our own message
      const messageId = `${routedMessage.origin}-${routedMessage.timestamp}-${routedMessage.message}`;
      this.processedMessageIds.add(messageId);
      
      // Clean up old message IDs (keep last 100)
      if (this.processedMessageIds.size > 100) {
        const idsArray = Array.from(this.processedMessageIds);
        this.processedMessageIds.clear();
        idsArray.slice(-100).forEach(id => this.processedMessageIds.add(id));
      }

      // Broadcast to all connected devices
      const broadcastPromises: Promise<void>[] = [];
      this.connectedDevices.forEach((device, deviceId) => {
        broadcastPromises.push(
          this.sendMessage(deviceId, messageJson).catch((error) => {
            console.error(`Error sending to ${deviceId}:`, error);
          })
        );
      });

      // Also update GATT server message for new connections
      if (Platform.OS === 'android' && BleAdvertise.isAvailable()) {
        await BleAdvertise.setMessage(messageJson);
      }

      // Wait for all sends (don't block on errors)
      await Promise.allSettled(broadcastPromises);
      console.log(`✅ Broadcasted message to ${broadcastPromises.length} device(s): ${message.substring(0, 50)}...`);
      
      // Notify local listeners (for UI update) AFTER marking as processed
      // This ensures if the message comes back through the mesh, it will be ignored
      this.messageListeners.forEach((listener) => {
        listener(message, DEVICE_ID, DEVICE_ID);
      });
    } catch (error: any) {
      console.error('Error sending message from server:', error);
      throw error;
    }
  }

  /**
   * Add a message listener
   * Listener receives: (message: string, originDeviceId: string, senderDeviceId: string)
   */
  onMessageReceived(listener: (message: string, originDeviceId: string, senderDeviceId: string) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  /**
   * Add a connected device count listener
   */
  onConnectedDeviceCountChanged(listener: (count: number) => void): () => void {
    this.connectedDeviceCountListeners.add(listener);
    return () => {
      this.connectedDeviceCountListeners.delete(listener);
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
   * Post a notification to all subscribed clients
   * @param title - Notification title
   * @param message - Notification message
   * @param type - Notification type (info, success, warning, error)
   */
  postNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    console.log(`📢 Notification [${type}]: ${title} - ${message}`);
    this.notificationListeners.forEach((listener) => {
      listener(title, message, type);
    });
  }

  /**
   * Add a notification listener
   * @param listener - Callback function (title: string, message: string, type?: string) => void
   * @returns Unsubscribe function
   */
  onNotification(listener: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
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
   * Get connected device count
   */
  getConnectedDeviceCount(): number {
    return this.connectedDeviceCount;
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
    
    // Clear reconnect timers
    this.reconnectTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.reconnectTimers.clear();
    this.reconnectCallbacks.clear();
    this.reconnectAttempts.clear();
    this.manualDisconnects.clear();
    
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
    this.notificationListeners.clear();

    if (this.stateSubscription) {
      this.stateSubscription.remove();
    }

    this.manager.destroy();
  }
}

// Export singleton instance
export const bleService = new BLEService();
