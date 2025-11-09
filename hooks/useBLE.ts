import { useState, useEffect, useCallback } from 'react';
import { Device } from 'react-native-ble-plx';
import { bleService, DEVICE_ID, ADVERTISEMENT_MESSAGE, SERVICE_UUID, CHARACTERISTIC_UUID } from '@/services/bleService';

export interface DiscoveredDevice {
  device: Device;
  deviceId: string;
  message: string;
  name: string;
}

export interface GlobalMessage {
  text: string;
  timestamp: number;
  originDeviceId: string;
  senderDeviceId: string;
  sent: boolean; // true if sent by this device
}

export function useBLE() {
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<DiscoveredDevice[]>([]);
  const [globalMessages, setGlobalMessages] = useState<GlobalMessage[]>([]);
  const [connectedDeviceCount, setConnectedDeviceCount] = useState(0);
  const [advertisementMessage, setAdvertisementMessage] = useState(ADVERTISEMENT_MESSAGE);
  const [error, setError] = useState<string | null>(null);
  const [deviceId] = useState(DEVICE_ID);

  // Update discovered devices when new ones are found
  // With GATT, devices are automatically connected when discovered
  const handleDeviceFound = useCallback((device: Device, deviceId: string, message: string) => {
    const deviceName = device.name || device.localName || 'Unknown Device';
    
    // Add to discovered devices if not already there
    setDiscoveredDevices((prev) => {
      const exists = prev.some((d) => d.device.id === device.id);
      if (exists) {
        // Update existing device with new message
        return prev.map((d) => 
          d.device.id === device.id 
            ? { ...d, message, name: deviceName }
            : d
        );
      }

      const newDevice: DiscoveredDevice = {
        device,
        deviceId,
        message,
        name: deviceName,
      };

      return [...prev, newDevice];
    });

    // Also add to connected devices (since we auto-connect)
    setConnectedDevices((prev) => {
      const exists = prev.some((d) => d.device.id === device.id);
      if (exists) {
        // Update existing device
        return prev.map((d) => 
          d.device.id === device.id 
            ? { ...d, message, name: deviceName }
            : d
        );
      }

      return [...prev, {
        device,
        deviceId,
        message,
        name: deviceName,
      }];
    });
  }, []);

  // Start advertising
  const startAdvertising = useCallback(async (message?: string) => {
    try {
      setError(null);
      const msg = message || advertisementMessage;
      await bleService.startAdvertising(msg);
      setIsAdvertising(true);
      if (message) {
        setAdvertisementMessage(msg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to start advertising';
      setError(errorMsg);
      console.error('Error starting advertising:', err);
    }
  }, [advertisementMessage]);

  // Stop advertising
  const stopAdvertising = useCallback(async () => {
    try {
      setError(null);
      await bleService.stopAdvertising();
      setIsAdvertising(false);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to stop advertising';
      setError(errorMsg);
      console.error('Error stopping advertising:', err);
    }
  }, []);

  // Start scanning
  const startScanning = useCallback(async () => {
    try {
      setError(null);
      setDiscoveredDevices([]);
      await bleService.startScanning(handleDeviceFound);
      setIsScanning(true);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to start scanning';
      setError(errorMsg);
      console.error('Error starting scanning:', err);
      setIsScanning(false);
    }
  }, [handleDeviceFound]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    try {
      bleService.stopScanning();
      setIsScanning(false);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to stop scanning';
      setError(errorMsg);
      console.error('Error stopping scanning:', err);
    }
  }, []);

  // Connect to device (manual connection - though auto-connect happens on discovery)
  const connectToDevice = useCallback(async (discoveredDevice: DiscoveredDevice) => {
    try {
      setError(null);
      // Devices are automatically connected when discovered, but we can manually trigger
      // This will attempt to connect if not already connected
      await bleService.connectToDevice(discoveredDevice.device, handleDeviceFound);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to connect to device';
      setError(errorMsg);
      console.error('Error connecting to device:', err);
    }
  }, [handleDeviceFound]);

  // Disconnect from device
  const disconnectDevice = useCallback(async (deviceId: string, deviceName?: string) => {
    try {
      setError(null);
      await bleService.disconnectDevice(deviceId);
      setConnectedDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
      // Re-add to discovered devices
      setDiscoveredDevices((prev) => {
        const device = prev.find((d) => d.deviceId === deviceId);
        if (device) {
          return prev; // Already in discovered
        }
        // Find in connected devices before removing
        const connectedDevice = connectedDevices.find((d) => d.deviceId === deviceId);
        if (connectedDevice) {
          return [...prev, {
            device: connectedDevice.device,
            deviceId: connectedDevice.deviceId,
            message: connectedDevice.message,
            name: connectedDevice.name,
          }];
        }
        return prev;
      });
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to disconnect device';
      setError(errorMsg);
      console.error('Error disconnecting device:', err);
    }
  }, [connectedDevices]);

  // Update state from service
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAdvertising(bleService.getIsAdvertising());
      setIsScanning(bleService.getIsScanning());
      setConnectedDeviceCount(bleService.getConnectedDeviceCount());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Set up connected device count listener
  useEffect(() => {
    const removeListener = bleService.onConnectedDeviceCountChanged((count) => {
      setConnectedDeviceCount(count);
    });

    return () => {
      removeListener();
    };
  }, []);

  // Set up message listener for global channel messages
  useEffect(() => {
    const removeListener = bleService.onMessageReceived((message, originDeviceId, senderDeviceId) => {
      console.log('📨 Global channel message received:', { message, originDeviceId, senderDeviceId });
      
      // Add message to global channel
      const isSentByMe = originDeviceId === DEVICE_ID;
      const globalMessage: GlobalMessage = {
        text: message,
        timestamp: Date.now(),
        originDeviceId,
        senderDeviceId,
        sent: isSentByMe,
      };

      setGlobalMessages((prev) => {
        // Check for duplicates using FULL message text (not just timestamp)
        // Check if we already have this exact message from this origin
        const isDuplicate = prev.some(
          (msg) =>
            msg.originDeviceId === originDeviceId &&
            msg.text === message // Use full text comparison
        );

        if (isDuplicate) {
          console.log('⚠️ Ignoring duplicate message in UI:', message.substring(0, 50) + '...');
          return prev;
        }

        return [...prev, globalMessage];
      });
    });

    return () => {
      removeListener();
    };
  }, []);

  // Set up connection listener
  useEffect(() => {
    const removeListener = bleService.onDeviceConnectionChanged((deviceId, connected) => {
      console.log(`🔌 Device ${deviceId} ${connected ? 'connected' : 'disconnected'}`);
      if (!connected) {
        setConnectedDevices((prev) => {
          const device = prev.find((d) => 
            d.device.id === deviceId || 
            d.deviceId === deviceId ||
            d.device.id.toLowerCase().replace(/[:-]/g, '') === deviceId.toLowerCase().replace(/[:-]/g, '')
          );
          if (device) {
            // Move back to discovered devices
            setDiscoveredDevices((prevDiscovered) => {
              const exists = prevDiscovered.some((d) => d.device.id === device.device.id);
              if (exists) {
                return prevDiscovered;
              }
              return [...prevDiscovered, {
                device: device.device,
                deviceId: device.deviceId,
                message: device.message,
                name: device.name,
              }];
            });
          }
          return prev.filter((d) => 
            d.device.id !== deviceId && 
            d.deviceId !== deviceId &&
            d.device.id.toLowerCase().replace(/[:-]/g, '') !== deviceId.toLowerCase().replace(/[:-]/g, '')
          );
        });
      }
    });

    return () => {
      removeListener();
    };
  }, []);

  // Send message to global channel (broadcasts to all connected devices)
  const sendMessage = useCallback(async (message: string) => {
    try {
      setError(null);
      
      // Always broadcast to all connected devices via server
      if (isAdvertising) {
        // Add message to UI immediately for better UX (optimistic update)
        const globalMessage: GlobalMessage = {
          text: message,
          timestamp: Date.now(),
          originDeviceId: DEVICE_ID,
          senderDeviceId: DEVICE_ID,
          sent: true,
        };
        
        // Check if this exact message already exists (shouldn't happen, but just in case)
        setGlobalMessages((prev) => {
          const exists = prev.some(
            (msg) => msg.originDeviceId === DEVICE_ID && msg.text === message
          );
          if (exists) {
            console.log('⚠️ Message already in UI, not adding duplicate');
            return prev;
          }
          return [...prev, globalMessage];
        });
        
        // Send to all connected devices
        // The bleService will mark this message as processed so when it comes back
        // through the mesh network, it will be ignored
        await bleService.sendMessageFromServer(message);
      } else {
        throw new Error('Not advertising. Start advertising first to send messages.');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to send message';
      setError(errorMsg);
      console.error('Error sending message:', err);
    }
  }, [isAdvertising]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
      stopAdvertising();
    };
  }, [stopScanning, stopAdvertising]);

  return {
    // State
    isAdvertising,
    isScanning,
    discoveredDevices,
    connectedDevices,
    globalMessages,
    connectedDeviceCount,
    advertisementMessage,
    error,
    deviceId,
    serviceUuid: SERVICE_UUID,
    characteristicUuid: CHARACTERISTIC_UUID,

    // Actions
    startAdvertising,
    stopAdvertising,
    startScanning,
    stopScanning,
    connectToDevice,
    disconnectDevice,
    sendMessage,
    setAdvertisementMessage,
  };
}
