import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConnectedDevice, DiscoveredDevice, useBLE } from '@/hooks/useBLE';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const {
    isAdvertising,
    isScanning,
    discoveredDevices,
    connectedDevices,
    globalMessages,
    connectedDeviceCount,
    advertisementMessage,
    startAdvertising,
    stopAdvertising,
    startScanning,
    stopScanning,
    connectToDevice,
    disconnectDevice,
    sendMessage,
  } = useBLE();

  const [messageInput, setMessageInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [globalMessages]);

  const handleStartAdvertising = async () => {
    try {
      console.log('🔄 handleStartAdvertising called');
      console.log('🔄 Message:', messageInput || advertisementMessage);
      
      // Permissions will be requested automatically by the service
      // The permission dialog will show if permissions are not granted
      await startAdvertising(messageInput || advertisementMessage);
      
      console.log('🔄 startAdvertising completed successfully');
      
      if (Platform.OS === 'android') {
        Alert.alert('Success', 'Started BLE advertising! Your device is now discoverable.');
      } else {
        Alert.alert('Success', 'Started advertising (simulated mode on iOS)');
      }
    } catch (err: any) {
      console.error('❌ Error in handleStartAdvertising:', err);
      console.error('❌ Error message:', err?.message);
      console.error('❌ Error code:', err?.code);
      console.error('❌ Full error:', err);
      
      const errorMessage = err?.message || err?.toString() || 'Failed to start advertising';
      
      // Don't show duplicate alerts - permission function already shows alerts
      if (errorMessage.includes('permission') || err?.code === 'PERMISSION_DENIED') {
        // Permission alert is already shown by requestBluetoothPermissions
        // Just log it here
        console.log('Permission error handled by permission request function');
      } else if (errorMessage.includes('too large')) {
        Alert.alert(
          'Message Too Long',
          'Message is too large. Maximum message size is approximately 512 bytes per GATT write.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handleStopAdvertising = async () => {
    try {
      await stopAdvertising();
      Alert.alert('Success', 'Stopped advertising');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to stop advertising');
    }
  };

  const handleStartScanning = async () => {
    try {
      await startScanning();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to start scanning');
    }
  };

  const handleConnect = async (device: DiscoveredDevice) => {
    try {
      await connectToDevice(device);
      Alert.alert('Success', `Connected to ${device.name}`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to connect to device');
    }
  };

  const handleDisconnect = async (deviceId: string, deviceName: string) => {
    try {
      await disconnectDevice(deviceId);
      Alert.alert('Success', `Disconnected from ${deviceName}`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to disconnect from device');
    }
  };

  const handleSendMessage = async () => {
    if (messageInput.trim()) {
      try {
        await sendMessage(messageInput.trim());
        setMessageInput('');
        // Scroll to bottom after sending
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Error sending message:', error);
        // Don't clear input on error so user can retry
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.section}>
        <ThemedText type="title" style={styles.title}>BLE Relay</ThemedText>
        <ThemedText style={styles.subtitle}>Device ID: {deviceId}</ThemedText>
        <ThemedText style={styles.infoText}>GATT-based communication</ThemedText>
        <ThemedText style={styles.infoText}>Service UUID: {serviceUuid}</ThemedText>
        <ThemedText style={styles.infoText}>Characteristic UUID: {characteristicUuid}</ThemedText>
        <ThemedText style={styles.infoText}>Devices advertise service UUID, then connect via GATT for messaging</ThemedText>
      </ThemedView>

      {error && (
        <ThemedView style={styles.errorSection}>
          <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
        </ThemedView>
      )}

      {/* Advertising Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Advertising</ThemedText>
        <ThemedText style={styles.description}>
          {Platform.OS === 'android' 
            ? 'Advertise this device with GATT server. Devices will automatically connect when discovered.'
            : '⚠️ iOS: Simulated mode only - this device will NOT be discoverable. Native GATT server requires Android.'}
        </ThemedText>
        
        <TextInput
          style={styles.input}
          value={messageInput}
          onChangeText={setMessageInput}
          placeholder="Initial message (stored in GATT characteristic)"
          placeholderTextColor="#999"
          maxLength={500}
        />
        <ThemedText style={styles.infoText}>
          Note: Messages are sent via GATT characteristics (up to ~512 bytes per write). Initial message is stored in the characteristic.
        </ThemedText>

        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          {!isAdvertising ? (
            <TouchableOpacity 
              style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flex: 1, marginRight: 8, backgroundColor: '#007AFF' }}
              onPress={handleStartAdvertising}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Start Advertising</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flex: 1, marginRight: 8, backgroundColor: '#FF3B30' }}
              onPress={handleStopAdvertising}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Stop Advertising</Text>
            </TouchableOpacity>
          )}
        </View>

        {isAdvertising && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <ActivityIndicator size="small" color="#007AFF" />
            <ThemedView style={styles.statusTextContainer}>
              <ThemedText style={styles.statusText}>Advertising: {advertisementMessage}</ThemedText>
              {Platform.OS !== 'android' && (
                <ThemedText style={styles.warningText}>
                  ⚠️ Simulated mode - device not discoverable
                </ThemedText>
              )}
            </ThemedView>
          </ThemedView>
        )}
      </View>

      {/* Scanning Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Scanning</ThemedText>
        <ThemedText style={styles.description}>
          Scan for nearby BLE devices advertising the service UUID. Devices will automatically connect and exchange messages via GATT.
        </ThemedText>

        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          {!isScanning ? (
            <TouchableOpacity 
              style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flex: 1, marginRight: 8, backgroundColor: '#007AFF' }}
              onPress={handleStartScanning}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Start Scanning</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flex: 1, marginRight: 8, backgroundColor: '#FF3B30' }}
              onPress={stopScanning}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Stop Scanning</Text>
            </TouchableOpacity>
          )}
        </View>

        {isScanning && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={{ fontSize: 14, color: '#ccc', marginLeft: 12 }}>Scanning for devices...</Text>
          </View>
        )}
      </ThemedView>

      {/* Discovered Devices Section */}
      {discoveredDevices.length > 0 && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Discovered Devices ({discoveredDevices.length})
          </ThemedText>
          <ThemedText style={styles.infoText}>
            Note: Devices are automatically connected when discovered. These are devices that were discovered but not yet fully connected.
          </ThemedText>
          {discoveredDevices.map((device, index) => (
            <ThemedView key={device.device.id} style={styles.deviceCard}>
              <ThemedText style={styles.deviceName}>{device.name}</ThemedText>
              <ThemedText style={styles.deviceId}>ID: {device.deviceId}</ThemedText>
              <ThemedText style={styles.deviceMessage}>Initial Message: {device.message || 'No message'}</ThemedText>
              <TouchableOpacity 
                style={[styles.button, styles.buttonSuccess, styles.deviceButton]}
                onPress={() => handleConnect(device)}
              >
                <ThemedText style={styles.buttonText}>
                  Connect (Auto-connect enabled)
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ))}
        </ThemedView>
      )}

      {/* Connected Devices Section */}
      {connectedDevices.length > 0 && (
        <View style={{ padding: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#fff' }}>Connected Devices ({connectedDevices.length})</Text>
          {connectedDevices.map((device, index) => (
            <ThemedView key={device.deviceId || device.device.id || `device-${index}`} style={styles.deviceCard}>
              <ThemedText style={styles.deviceName}>{device.name}</ThemedText>
              <ThemedText style={styles.deviceId}>ID: {device.deviceId}</ThemedText>
              <TouchableOpacity 
                style={[styles.button, styles.buttonDanger, styles.deviceButton]}
                onPress={() => handleDisconnect(device.deviceId, device.name)}
              >
                <ThemedText style={styles.buttonText}>Disconnect</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ))}
        </View>
      )}

      {/* Info Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Information</ThemedText>
        <ThemedText style={styles.infoText}>
          • Make sure Bluetooth is enabled on your device{'\n'}
          • Grant Bluetooth and location permissions (required for BLE on Android){'\n'}
          • Devices will be discovered when advertising and within range (~10 meters)
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  errorSection: {
    backgroundColor: '#ffebee',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: Platform.select({ ios: '#fff', android: '#fff', default: '#fff' }),
    color: Platform.select({ ios: '#000', android: '#000', default: '#000' }),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonSuccess: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    opacity: 0.8,
  },
  statusTextContainer: {
    flex: 1,
    gap: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
  },
  deviceCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
  },
  deviceId: {
    fontSize: 14,
    opacity: 0.7,
  },
  deviceMessage: {
    fontSize: 14,
    opacity: 0.8,
  },
  deviceButton: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  chatContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatMessages: {
    maxHeight: 300,
    minHeight: 100,
    marginBottom: 8,
    padding: 4,
  },
  emptyMessagesContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    padding: 10,
    marginBottom: 8,
    borderRadius: 12,
    maxWidth: '80%',
    minWidth: 50,
  },
  messageSent: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    marginLeft: '20%',
  },
  messageReceived: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
    marginRight: '20%',
  },
  messageText: {
    color: '#000',
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextSent: {
    color: '#fff',
  },
  chatInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: Platform.select({ ios: '#fff', android: '#fff', default: '#fff' }),
    color: Platform.select({ ios: '#000', android: '#000', default: '#000' }),
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
});

// Device Chat Component
function DeviceChat({
  device,
  onSendMessage,
  onDisconnect,
}: {
  device: ConnectedDevice;
  onSendMessage: (message: string) => void;
  onDisconnect: () => void;
}) {
  const [messageInput, setMessageInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [device.messages]);

  const handleSend = async () => {
    if (messageInput.trim()) {
      try {
        await onSendMessage(messageInput.trim());
        setMessageInput('');
        // Scroll to bottom after sending
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Error sending message:', error);
        // Don't clear input on error so user can retry
      }
    }
  };

  return (
    <ThemedView style={styles.deviceCard}>
      <View style={styles.chatHeader}>
        <View>
          <ThemedText style={styles.deviceName}>{device.name}</ThemedText>
          <ThemedText style={styles.deviceId}>ID: {device.deviceId}</ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={onDisconnect}
        >
          <ThemedText style={styles.buttonText}>Disconnect</ThemedText>
        </TouchableOpacity>
      </View>

      <ThemedView style={styles.chatContainer}>
        <ScrollView 
          style={styles.chatMessages}
          ref={scrollViewRef}
          onContentSizeChange={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          nestedScrollEnabled
        >
          {device.messages.length === 0 ? (
            <ThemedView style={styles.emptyMessagesContainer}>
              <ThemedText style={styles.infoText}>No messages yet. Start a conversation!</ThemedText>
            </ThemedView>
          ) : (
            device.messages.map((msg, index) => (
              <View
                key={`${msg.timestamp}-${index}`}
                style={[
                  styles.message,
                  msg.sent ? styles.messageSent : styles.messageReceived,
                ]}
              >
                <ThemedText
                  style={[
                    styles.messageText,
                    msg.sent && styles.messageTextSent,
                  ]}
                >
                  {msg.text}
                </ThemedText>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            value={messageInput}
            onChangeText={setMessageInput}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            onSubmitEditing={handleSend}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageInput.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!messageInput.trim()}
          >
            <ThemedText style={[styles.buttonText, { fontSize: 14 }]}>Send</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </ThemedView>
  );
}
