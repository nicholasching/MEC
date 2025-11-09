import { useState, useEffect, useCallback } from 'react';
import { Device } from 'react-native-ble-plx';
import { bleService, DEVICE_ID, ADVERTISEMENT_MESSAGE, SERVICE_UUID, CHARACTERISTIC_UUID } from '@/services/bleService';

export interface DiscoveredDevice {
  device: Device;
  deviceId: string;
  message: string;
  name: string;
}

export interface ConnectedDevice {
  device: Device;
  deviceId: string;
  message: string;
  name: string;
  messages: Array<{ text: string; timestamp: number; sent: boolean }>;
}

export function useBLE() {
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
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

      const newConnectedDevice: ConnectedDevice = {
        device,
        deviceId,
        message,
        name: deviceName,
        messages: message ? [{
          text: message,
          timestamp: Date.now(),
          sent: false,
        }] : [],
      };

      return [...prev, newConnectedDevice];
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
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Set up message listener for messages received via GATT
  useEffect(() => {
    const removeListener = bleService.onMessageReceived((deviceId, message) => {
      console.log('📨 Message received via GATT:', deviceId, message);
      setConnectedDevices((prev) => {
        let found = false;
        const updated = prev.map((device) => {
          // Match by device.id (MAC address) or deviceId
          const deviceIdMatch = device.device.id === deviceId || 
                                device.deviceId === deviceId ||
                                device.device.id.toLowerCase().replace(/[:-]/g, '') === deviceId.toLowerCase().replace(/[:-]/g, '');
          
          if (deviceIdMatch) {
            found = true;
            return {
              ...device,
              message, // Update current message
              messages: [
                ...device.messages,
                {
                  text: message,
                  timestamp: Date.now(),
                  sent: false,
                },
              ],
            };
          }
          return device;
        });
        
        // If device not found, check discovered devices
        if (!found) {
          setDiscoveredDevices((prevDiscovered) => {
            const discoveredDevice = prevDiscovered.find((d) => 
              d.device.id === deviceId ||
              d.deviceId === deviceId ||
              d.device.id.toLowerCase().replace(/[:-]/g, '') === deviceId.toLowerCase().replace(/[:-]/g, '')
            );
            
            if (discoveredDevice) {
              // Add to connected devices
              const newConnectedDevice: ConnectedDevice = {
                device: discoveredDevice.device,
                deviceId: discoveredDevice.deviceId,
                message,
                name: discoveredDevice.name,
                messages: [{
                  text: message,
                  timestamp: Date.now(),
                  sent: false,
                }],
              };
              setConnectedDevices((prevConnected) => {
                const exists = prevConnected.some((d) => 
                  d.device.id === discoveredDevice.device.id ||
                  d.deviceId === discoveredDevice.deviceId
                );
                if (exists) {
                  return prevConnected.map((d) => 
                    d.device.id === discoveredDevice.device.id || d.deviceId === discoveredDevice.deviceId
                      ? { ...d, message, messages: [...d.messages, { text: message, timestamp: Date.now(), sent: false }] }
                      : d
                  );
                }
                return [...prevConnected, newConnectedDevice];
              });
            }
            
            return prevDiscovered.map((d) => 
              d.device.id === deviceId || d.deviceId === deviceId
                ? { ...d, message }
                : d
            );
          });
        }
        
        return updated;
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

  // Send message via GATT
  const sendMessage = useCallback(async (deviceId: string, message: string) => {
    try {
      setError(null);
      
      // Check if we're advertising (sending from server) or connected to a device (sending as client)
      if (isAdvertising) {
        // If we're advertising, update the GATT server message (broadcasts to all connected devices)
        await bleService.sendMessageFromServer(message);
        setAdvertisementMessage(message);
        
        // Add message to all connected devices (since we're broadcasting)
        setConnectedDevices((prev) => {
          return prev.map((device) => {
            return {
              ...device,
              messages: [
                ...device.messages,
                {
                  text: message,
                  timestamp: Date.now(),
                  sent: true,
                },
              ],
            };
          });
        });
      } else {
        // Send to specific device via GATT write
        await bleService.sendMessage(deviceId, message);
        
        // Add message to the specific device
        setConnectedDevices((prev) => {
          return prev.map((device) => {
            if (device.device.id === deviceId || device.deviceId === deviceId) {
              return {
                ...device,
                messages: [
                  ...device.messages,
                  {
                    text: message,
                    timestamp: Date.now(),
                    sent: true,
                  },
                ],
              };
            }
            return device;
          });
        });
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
