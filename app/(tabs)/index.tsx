// Using native Text/View for a simplified UI
import { ConnectedDevice, DiscoveredDevice, useBLE } from '@/hooks/useBLE';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const {
    isAdvertising,
    isScanning,
    discoveredDevices,
    connectedDevices,
    advertisementMessage,
    startAdvertising,
    stopAdvertising,
    startScanning,
    stopScanning,
    connectToDevice,
    disconnectDevice,
    sendMessage,
  } = useBLE();

  const [messageInput, setMessageInput] = useState(advertisementMessage);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ padding: 16, marginBottom: 8 }}>
        <Text style={{ fontWeight: '500', marginBottom: 32, marginTop: 32, fontSize: 28, color: '#fff' }}>Local communication, always ready when you need it.</Text>
        {/* <ThemedText style={styles.subtitle}>Device ID: {deviceId}</ThemedText>
        <ThemedText style={styles.infoText}>GATT-based communication</ThemedText>
        <ThemedText style={styles.infoText}>Service UUID: {serviceUuid}</ThemedText>
        <ThemedText style={styles.infoText}>Characteristic UUID: {characteristicUuid}</ThemedText>
        <ThemedText style={styles.infoText}>Devices advertise service UUID, then connect via GATT for messaging</ThemedText> */}
        {/* <ThemedText style={styles.subtitle}>Users Connected:</ThemedText>
        <ThemedText style={styles.subtitle}>1000000</ThemedText> */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', padding: 16, borderRadius: 12}}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>


            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 2}}>
              <Text style={{ fontSize: 18, fontWeight: '400', color: '#ddd' }}>Users{"\n"}connected</Text>
              <Text style={{ fontSize: 48, fontWeight: '700', color: '#fff' }}>78</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Advertising Section */}
      <View style={{ padding: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#fff' }}>Advertising</Text>

        
        <TextInput
          style={{ borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#1a1a1a', color: '#fff' }}
          value={messageInput}
          onChangeText={setMessageInput}
          placeholder="Initial message (stored in GATT characteristic)"
          placeholderTextColor="#666"
          maxLength={500}
        />

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
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, color: '#ccc' }}>Advertising: {advertisementMessage}</Text>
              {Platform.OS !== 'android' && (
                <Text style={{ fontSize: 12, color: '#FF9500', fontWeight: '600', marginTop: 4 }}>⚠️ Simulated mode - device not discoverable</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Scanning Section */}
      <View style={{ padding: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#fff' }}>Scanning</Text>

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
      </View>

      {/* Discovered Devices Section */}
      {discoveredDevices.length > 0 && (
        <View style={{ padding: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#fff' }}>
            Discovered Devices ({discoveredDevices.length})
          </Text>
          <Text style={{ fontSize: 14, color: '#999', lineHeight: 20, marginBottom: 12 }}>
            Note: Devices are automatically connected when discovered. These are devices that were discovered but not yet fully connected.
          </Text>
          {discoveredDevices.map((device, index) => (
            <View key={device.device.id || index} style={{ borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#111' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>{device.name}</Text>
              <Text style={{ fontSize: 14, color: '#999', marginTop: 4 }}>ID: {device.deviceId}</Text>
              <Text style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>Initial Message: {device.message || 'No message'}</Text>
              <TouchableOpacity style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#34C759' }} onPress={() => handleConnect(device)}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Connect</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Connected Devices Section */}
      {connectedDevices.length > 0 && (
        <View style={{ padding: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#fff' }}>Connected Devices ({connectedDevices.length})</Text>
          {connectedDevices.map((device, index) => (
            <DeviceChat
              key={device.deviceId || device.device.id || `device-${index}`}
              device={device}
              onSendMessage={(message) => sendMessage(device.deviceId || device.device.id, message)}
              onDisconnect={() => handleDisconnect(device.deviceId, device.name)}
            />
          ))}
        </View>
      )}

      {/* Info Section */}
      <View style={{ padding: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#fff' }}>Information</Text>
        <Text style={{ fontSize: 14, color: '#999', lineHeight: 20 }}>
          • Make sure Bluetooth is enabled on your device{'\n'}
          • Grant Bluetooth and location permissions (required for BLE on Android){'\n'}
          • Devices advertise with service UUID and accept automatic connections{'\n'}
          • Messages are exchanged via GATT characteristics{'\n'}
          • Devices will be discovered when advertising and within range (~10 meters)
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// All styles are now inlined in the components above

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
    <View style={{ borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#111' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#222' }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>{device.name}</Text>
          <Text style={{ fontSize: 14, color: '#999', marginTop: 2 }}>ID: {device.deviceId}</Text>
        </View>
        <TouchableOpacity
          style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF3B30' }}
          onPress={onDisconnect}
        >
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      <View style={{ borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <ScrollView 
          style={{ maxHeight: 300, minHeight: 100, marginBottom: 8, padding: 4 }}
          ref={scrollViewRef}
          onContentSizeChange={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          nestedScrollEnabled
        >
          {device.messages.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, color: '#999', lineHeight: 20 }}>No messages yet. Start a conversation!</Text>
            </View>
          ) : (
            device.messages.map((msg, index) => (
              <View
                key={`${msg.timestamp}-${index}`}
                style={[
                  { padding: 10, marginBottom: 8, borderRadius: 12, maxWidth: '80%', minWidth: 50 },
                  msg.sent ? { backgroundColor: '#007AFF', alignSelf: 'flex-end', marginLeft: '20%' } : { backgroundColor: '#333', alignSelf: 'flex-start', marginRight: '20%' },
                ]}
              >
                <Text style={[{ fontSize: 14, lineHeight: 20 }, msg.sent ? { color: '#fff' } : { color: '#fff' }]}>
                  {msg.text}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <TextInput
            style={{ flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#1a1a1a', color: '#fff', minHeight: 40, maxHeight: 100, marginRight: 8 }}
            value={messageInput}
            onChangeText={setMessageInput}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            onSubmitEditing={handleSend}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, justifyContent: 'center', minWidth: 60, alignItems: 'center' }, !messageInput.trim() ? { backgroundColor: '#666', opacity: 0.5 } : { backgroundColor: '#007AFF' }]}
            onPress={handleSend}
            disabled={!messageInput.trim()}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
