import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DiscoveredDevice, useBLE } from '@/hooks/useBLE';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const {
    isAdvertising,
    isScanning,
    discoveredDevices,
    connectedDevices,
    globalMessages,
    connectedDeviceCount,
    advertisementMessage,
    error,
    deviceId,
    serviceUuid,
    characteristicUuid,
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
        <ThemedText type="title" style={styles.title}>BLE Relay - Global Channel</ThemedText>
        <ThemedText style={styles.subtitle}>Device ID: {deviceId}</ThemedText>
        <ThemedText style={styles.infoText}>Connected Devices: {connectedDeviceCount}</ThemedText>
        <ThemedText style={styles.infoText}>GATT-based global messaging channel</ThemedText>
        <ThemedText style={styles.infoText}>Service UUID: {serviceUuid}</ThemedText>
        <ThemedText style={styles.infoText}>Characteristic UUID: {characteristicUuid}</ThemedText>
        <ThemedText style={styles.infoText}>Messages broadcast to all connected devices (max 5 hops)</ThemedText>
      </ThemedView>

      {error && (
        <ThemedView style={styles.errorSection}>
          <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
        </ThemedView>
      )}

      {/* Status Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Status</ThemedText>
        <ThemedView style={styles.statusContainer}>
          <ThemedText style={styles.statusText}>
            {isAdvertising ? '🟢 Advertising' : '🔴 Not Advertising'}
          </ThemedText>
          <ThemedText style={styles.statusText}>
            {isScanning ? '🟢 Scanning' : '🔴 Not Scanning'}
          </ThemedText>
          <ThemedText style={styles.statusText}>
            Connected: {connectedDeviceCount} device(s)
          </ThemedText>
        </ThemedView>
        {Platform.OS !== 'android' && isAdvertising && (
          <ThemedText style={styles.warningText}>
            ⚠️ Simulated mode - device not discoverable on iOS
          </ThemedText>
        )}
      </ThemedView>

      {/* Global Channel Messages Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Global Channel ({globalMessages.length} messages)
        </ThemedText>
        <ThemedText style={styles.description}>
          All messages are broadcast to all connected devices. Messages from other devices are automatically relayed (max 5 hops).
        </ThemedText>

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
            {globalMessages.length === 0 ? (
              <ThemedView style={styles.emptyMessagesContainer}>
                <ThemedText style={styles.infoText}>No messages yet. Send a message to start!</ThemedText>
              </ThemedView>
            ) : (
              globalMessages.map((msg, index) => {
                const isSent = msg.sent;
                const isFromOtherDevice = msg.originDeviceId !== deviceId;
                return (
                  <View
                    key={`${msg.timestamp}-${index}`}
                    style={[
                      styles.message,
                      isSent ? styles.messageSent : styles.messageReceived,
                    ]}
                  >
                    {!isSent && (
                      <ThemedText style={styles.messageOrigin}>
                        From: {msg.originDeviceId.substring(0, 8)}...
                      </ThemedText>
                    )}
                    <ThemedText
                      style={[
                        styles.messageText,
                        isSent && styles.messageTextSent,
                      ]}
                    >
                      {msg.text}
                    </ThemedText>
                    <ThemedText style={[styles.messageTime, isSent && styles.messageTimeSent]}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </ThemedText>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              value={messageInput}
              onChangeText={setMessageInput}
              placeholder="Type a message to broadcast..."
              placeholderTextColor="#999"
              onSubmitEditing={handleSendMessage}
              multiline
              returnKeyType="send"
              blurOnSubmit={false}
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !messageInput.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageInput.trim()}
            >
              <ThemedText style={[styles.buttonText, { fontSize: 14 }]}>Send</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ThemedView>


      {/* Connected Devices Section */}
      {connectedDevices.length > 0 && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Connected Devices ({connectedDevices.length})
          </ThemedText>
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
        </ThemedView>
      )}

      {/* Info Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Information</ThemedText>
        <ThemedText style={styles.infoText}>
          • Advertising and scanning start automatically when the app launches{'\n'}
          • Advertising and scanning will automatically restart if they stop{'\n'}
          • Messages are broadcast to all connected devices{'\n'}
          • Messages are automatically relayed (max 5 hops) to reach all devices{'\n'}
          • Messages from your device are not re-broadcast (prevents loops){'\n'}
          • "I have connected." message is sent when a device connects{'\n'}
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
    flexWrap: 'wrap',
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
    maxHeight: 500,
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
  messageOrigin: {
    fontSize: 11,
    opacity: 0.7,
    marginBottom: 4,
    color: '#666',
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 4,
    color: '#666',
  },
  messageTimeSent: {
    color: '#fff',
    opacity: 0.8,
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
