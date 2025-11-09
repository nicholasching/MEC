// Using native Text/View for a simplified UI
import { DiscoveredDevice, useBLE } from '@/hooks/useBLE';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
    startAdvertising,
    stopAdvertising,
    startScanning,
    stopScanning,
    connectToDevice,
    disconnectDevice,
    sendMessage,
    setAdvertisementMessage,
  } = useBLE();

  const [messageInput, setMessageInput] = useState('');
  const [broadcastInput, setBroadcastInput] = useState(advertisementMessage);
  
  // Fast, practical animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const alertPulse = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [globalMessages]);

  useEffect(() => {
    // Quick staggered fade-in
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(titleAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    // Alert pulse for emergency states
    Animated.loop(
      Animated.sequence([
        Animated.timing(alertPulse, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(alertPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeAnim, titleAnim, contentAnim, alertPulse]);

  const handleStartAdvertising = async () => {
    try {
      console.log('🔄 handleStartAdvertising called');
      console.log('🔄 Message:', broadcastInput || advertisementMessage);
      
      await startAdvertising(broadcastInput || advertisementMessage);
      
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
      
      if (errorMessage.includes('permission') || err?.code === 'PERMISSION_DENIED') {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      {/* Emergency warning stripes background */}
      <Animated.View style={{ opacity: fadeAnim, position: 'absolute', top: 0, left: 0, right: 0, height: 300, overflow: 'hidden', zIndex: 0 }}>
        <View
          style={{
            position: 'absolute',
            top: -150,
            left: '50%',
            width: 600,
            height: 600,
            borderRadius: 300,
            backgroundColor: '#dc2626',
            opacity: 0.15,
            transform: [{ translateX: -300 }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: -100,
            left: '20%',
            width: 400,
            height: 400,
            borderRadius: 200,
            backgroundColor: '#f59e0b',
            opacity: 0.1,
            transform: [{ translateX: -200 }],
          }}
        />
      </Animated.View>

      <ScrollView style={{ flex: 1, zIndex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <Animated.View style={{ opacity: titleAnim, paddingTop: 20, paddingHorizontal: 20 }}>
          {/* Emergency Alert Header */}
          <View style={{ 
            backgroundColor: 'rgba(220, 38, 38, 0.15)', 
            borderLeftWidth: 4, 
            borderLeftColor: '#dc2626',
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#dc2626', marginRight: 10 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Emergency Network
              </Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6, letterSpacing: -0.5 }}>
              Disaster Response Chat
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#999', lineHeight: 20 }}>
              Offline mesh network • Global broadcast channel
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#666', marginTop: 8, fontFamily: 'monospace' }}>
              Device: {deviceId.substring(0, 12)}...
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: contentAnim, paddingHorizontal: 20 }}>
          {/* Error Display */}
          {error && (
            <View style={{ 
              backgroundColor: 'rgba(220, 38, 38, 0.2)',
              borderLeftWidth: 3,
              borderLeftColor: '#dc2626',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 12, color: '#ff6b6b', fontWeight: '700' }}>⚠️ Error: {error}</Text>
            </View>
          )}

          {/* Status Dashboard */}
          <View style={{ 
            backgroundColor: '#1a1a1a', 
            borderRadius: 12, 
            padding: 18, 
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#2a2a2a',
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
              Network Status
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: '600' }}>Connected</Text>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#10b981' }}>
                  {connectedDeviceCount}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: '600' }}>Messages</Text>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#f59e0b' }}>
                  {globalMessages.length}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: '600' }}>Range</Text>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#3b82f6' }}>10m</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              Quick Actions
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!isAdvertising ? (
                <Animated.View style={{ flex: 1, transform: [{ scale: alertPulse }] }}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    style={{ 
                      backgroundColor: '#dc2626',
                      borderRadius: 10,
                      padding: 16,
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: '#ef4444',
                    }}
                    onPress={handleStartAdvertising}
                  >
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>📡</Text>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Broadcast
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={{ 
                    flex: 1,
                    backgroundColor: '#7f1d1d',
                    borderRadius: 10,
                    padding: 16,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#991b1b',
                  }}
                  onPress={handleStopAdvertising}
                >
                  <Text style={{ fontSize: 24, marginBottom: 4 }}>⏹️</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Stop
                  </Text>
                </TouchableOpacity>
              )}

              {!isScanning ? (
                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={{ 
                    flex: 1,
                    backgroundColor: '#ea580c',
                    borderRadius: 10,
                    padding: 16,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#f97316',
                  }}
                  onPress={handleStartScanning}
                >
                  <Text style={{ fontSize: 24, marginBottom: 4 }}>🔍</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Scan
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={{ 
                    flex: 1,
                    backgroundColor: '#7c2d12',
                    borderRadius: 10,
                    padding: 16,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#9a3412',
                  }}
                  onPress={stopScanning}
                >
                  <Text style={{ fontSize: 24, marginBottom: 4 }}>⏹️</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Stop
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Active Status Indicators */}
          {(isAdvertising || isScanning) && (
            <View style={{ marginBottom: 16 }}>
              {isAdvertising && (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: '#dc2626',
                }}>
                  <ActivityIndicator size="small" color="#dc2626" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>Broadcasting Signal</Text>
                    <Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{advertisementMessage}</Text>
                    {Platform.OS !== 'android' && (
                      <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: '600', marginTop: 4 }}>
                        ⚠️ iOS: Simulated mode
                      </Text>
                    )}
                  </View>
                </View>
              )}
              {isScanning && (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  backgroundColor: 'rgba(234, 88, 12, 0.1)',
                  padding: 12,
                  borderRadius: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: '#ea580c',
                }}>
                  <ActivityIndicator size="small" color="#ea580c" />
                  <Text style={{ fontSize: 12, color: '#fff', marginLeft: 10, fontWeight: '700' }}>
                    Scanning for devices...
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Broadcast Message Input */}
          <View style={{ 
            backgroundColor: '#1a1a1a', 
            borderRadius: 10, 
            padding: 16, 
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#2a2a2a',
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Broadcast Message (Initial)
            </Text>
            <TextInput
              style={{ 
                borderWidth: 1, 
                borderColor: '#333', 
                borderRadius: 8, 
                padding: 12, 
                fontSize: 14, 
                backgroundColor: '#0a0a0a', 
                color: '#fff',
                fontWeight: '500',
              }}
              value={broadcastInput}
              onChangeText={setBroadcastInput}
              placeholder="Emergency status or location..."
              placeholderTextColor="#555"
              maxLength={500}
            />
          </View>

          {/* Global Channel Chat */}
          <View style={{ 
            backgroundColor: '#1a1a1a',
            borderRadius: 10, 
            padding: 14, 
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#2a2a2a',
            borderLeftWidth: 3,
            borderLeftColor: '#3b82f6',
          }}>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: 12,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#2a2a2a',
            }}>
              <View style={{ 
                width: 32, 
                height: 32, 
                borderRadius: 16, 
                backgroundColor: '#3b82f6',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#000' }}>📢</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Global Channel
                </Text>
                <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                  Messages broadcast to all devices (max 5 hops)
                </Text>
              </View>
            </View>

            <View style={{ 
              borderWidth: 1, 
              borderColor: '#2a2a2a', 
              borderRadius: 8, 
              padding: 10, 
              backgroundColor: '#0a0a0a',
            }}>
              <ScrollView 
                style={{ maxHeight: 300, minHeight: 120, marginBottom: 10 }}
                ref={scrollViewRef}
                onContentSizeChange={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
                nestedScrollEnabled
              >
                {globalMessages.length === 0 ? (
                  <View style={{ padding: 30, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📡</Text>
                    <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', fontWeight: '600' }}>
                      No messages yet
                    </Text>
                    <Text style={{ fontSize: 11, color: '#555', textAlign: 'center', marginTop: 4 }}>
                      Send a message to broadcast
                    </Text>
                  </View>
                ) : (
                  globalMessages.map((msg, index) => {
                    const isSent = msg.sent;
                    const isFromOtherDevice = msg.originDeviceId !== deviceId;
                    return (
                      <View
                        key={`${msg.timestamp}-${index}`}
                        style={[
                          { 
                            padding: 12, 
                            marginBottom: 8, 
                            borderRadius: 10, 
                            maxWidth: '85%', 
                            minWidth: 50,
                          },
                          isSent 
                            ? { 
                                backgroundColor: '#dc2626', 
                                alignSelf: 'flex-end', 
                                marginLeft: '15%',
                                borderBottomRightRadius: 2,
                              } 
                            : { 
                                backgroundColor: '#2a2a2a', 
                                alignSelf: 'flex-start', 
                                marginRight: '15%',
                                borderBottomLeftRadius: 2,
                              },
                        ]}
                      >
                        {!isSent && (
                          <Text style={{ fontSize: 10, color: '#888', marginBottom: 4, fontFamily: 'monospace' }}>
                            From: {msg.originDeviceId.substring(0, 8)}...
                          </Text>
                        )}
                        <Text style={{ fontSize: 13, lineHeight: 18, color: '#fff', fontWeight: '500' }}>
                          {msg.text}
                        </Text>
                        <Text style={{ fontSize: 10, color: isSent ? 'rgba(255,255,255,0.7)' : '#888', marginTop: 4 }}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <TextInput
                  style={{ 
                    flex: 1, 
                    borderWidth: 1, 
                    borderColor: '#333', 
                    borderRadius: 8, 
                    padding: 10, 
                    fontSize: 13, 
                    backgroundColor: '#1a1a1a', 
                    color: '#fff', 
                    minHeight: 40, 
                    maxHeight: 80, 
                    marginRight: 8,
                    fontWeight: '500',
                  }}
                  value={messageInput}
                  onChangeText={setMessageInput}
                  placeholder="Broadcast to all devices..."
                  placeholderTextColor="#555"
                  onSubmitEditing={handleSendMessage}
                  multiline
                  returnKeyType="send"
                  blurOnSubmit={false}
                  maxLength={500}
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    { 
                      paddingHorizontal: 16, 
                      paddingVertical: 10, 
                      borderRadius: 8, 
                      justifyContent: 'center', 
                      minWidth: 60, 
                      alignItems: 'center',
                      borderWidth: 1,
                    }, 
                    !messageInput.trim() || !isAdvertising
                      ? { backgroundColor: '#2a2a2a', borderColor: '#333' } 
                      : { backgroundColor: '#dc2626', borderColor: '#ef4444' }
                  ]}
                  onPress={handleSendMessage}
                  disabled={!messageInput.trim() || !isAdvertising}
                >
                  <Text style={{ 
                    color: (!messageInput.trim() || !isAdvertising) ? '#666' : '#fff', 
                    fontSize: 13, 
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                  }}>
                    Send
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Connected Devices */}
          {connectedDevices.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 12,
                paddingBottom: 8,
                borderBottomWidth: 1,
                borderBottomColor: '#2a2a2a',
              }}>
                <View style={{ 
                  width: 28, 
                  height: 28, 
                  borderRadius: 14, 
                  backgroundColor: '#10b981',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>
                    {connectedDevices.length}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Active Connections
                </Text>
              </View>
              {connectedDevices.map((device, index) => (
                <View 
                  key={device.deviceId || device.device.id || `device-${index}`}
                  style={{ 
                    backgroundColor: '#1a1a1a',
                    borderRadius: 10, 
                    padding: 14, 
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: '#2a2a2a',
                    borderLeftWidth: 3,
                    borderLeftColor: '#10b981',
                  }}
                >
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 }}>
                        {device.name}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
                        {device.deviceId}
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={{ 
                        paddingVertical: 8, 
                        paddingHorizontal: 14, 
                        borderRadius: 6, 
                        backgroundColor: '#7f1d1d',
                        borderWidth: 1,
                        borderColor: '#991b1b',
                      }}
                      onPress={() => handleDisconnect(device.deviceId, device.name)}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                        Disconnect
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Emergency Info */}
          <View style={{ 
            backgroundColor: '#1a1a1a',
            borderRadius: 10, 
            padding: 16,
            borderWidth: 1,
            borderColor: '#2a2a2a',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>ℹ️</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                System Information
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: '#888', lineHeight: 18 }}>
              • Auto-starts advertising and scanning{'\n'}
              • Messages broadcast to all connected devices{'\n'}
              • Auto-relay with max 5 hops{'\n'}
              • Bluetooth must be enabled{'\n'}
              • Grant all required permissions{'\n'}
              • Works without internet or cellular{'\n'}
              • Maximum range: ~10 meters
            </Text>
            <View style={{ marginTop: 12, padding: 10, backgroundColor: '#0a0a0a', borderRadius: 6 }}>
              <Text style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
                Service: {serviceUuid.substring(0, 18)}...{'\n'}
                Char: {characteristicUuid.substring(0, 18)}...
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}