// Using native Text/View for a simplified UI
import { DiscoveredDevice, useBLE } from '@/hooks/useBLE';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, Keyboard, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  const [showChatPage, setShowChatPage] = useState(false);
  const [systemInfoExpanded, setSystemInfoExpanded] = useState(false);
  const systemInfoHeight = useRef(new Animated.Value(0)).current;
  
  // Fast, practical animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (showChatPage) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [globalMessages, showChatPage]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (showChatPage) {
        Keyboard.dismiss();
        setShowChatPage(false);
        return true; // Prevent default behavior
      }
      return false; // Let default behavior happen
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [showChatPage]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  // Calculate signal strength based on connections
  const getSignalStrength = () => {
    if (!isAdvertising) return 'Off';
    if (connectedDeviceCount === 0) return 'Weak';
    if (connectedDeviceCount === 1) return 'Fair';
    if (connectedDeviceCount === 2) return 'Good';
    return 'Strong';
  };

  const getSignalColor = () => {
    const strength = getSignalStrength();
    if (strength === 'Off') return '#666';
    if (strength === 'Weak') return '#dc2626';
    if (strength === 'Fair') return '#f59e0b';
    if (strength === 'Good') return '#10b981';
    return '#10b981';
  };

  const toggleSystemInfo = () => {
    const toValue = systemInfoExpanded ? 0 : 1;
    setSystemInfoExpanded(!systemInfoExpanded);
    Animated.spring(systemInfoHeight, {
      toValue,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  // Chat Page Component
  if (showChatPage) {
    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
        <View style={{ paddingTop: statusBarHeight, flex: 1 }}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Chat Header */}
          <View style={{ 
            backgroundColor: '#1a1a1a',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#2a2a2a',
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setShowChatPage(false);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#2a2a2a',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 14,
              }}
            >
              <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.3 }}>
                Global Channel
              </Text>
              <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                {connectedDeviceCount} connected · {globalMessages.length} messages
              </Text>
            </View>
          </View>

          {/* Messages */}
          <ScrollView 
            style={{ flex: 1, backgroundColor: '#0a0a0a' }}
            contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
            ref={scrollViewRef}
            onContentSizeChange={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: false });
              }, 50);
            }}
            keyboardShouldPersistTaps="handled"
          >
            {globalMessages.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 }}>
                <View style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: '#1a1a1a',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 24,
                  borderWidth: 2,
                  borderColor: '#2a2a2a',
                }}>
                  <Text style={{ fontSize: 48 }}>📡</Text>
                </View>
                <Text style={{ fontSize: 18, color: '#fff', textAlign: 'center', fontWeight: '700', marginBottom: 10 }}>
                  No messages yet
                </Text>
                <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', maxWidth: 260, lineHeight: 20 }}>
                  Send a message to broadcast to all connected devices in the network
                </Text>
              </View>
            ) : (
              globalMessages.map((msg, index) => {
                const isSent = msg.sent;
                return (
                  <View
                    key={`${msg.timestamp}-${index}`}
                    style={[
                      { 
                        marginBottom: 12,
                        maxWidth: '80%',
                      },
                      isSent ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
                    ]}
                  >
                    {!isSent && (
                      <Text style={{ 
                        fontSize: 10, 
                        color: '#666', 
                        marginBottom: 6, 
                        marginLeft: 12,
                        fontFamily: 'monospace',
                        fontWeight: '600',
                      }}>
                        {msg.originDeviceId.substring(0, 8)}...
                      </Text>
                    )}
                    <View style={[
                      { 
                        padding: 14, 
                        borderRadius: 16,
                      },
                      isSent 
                        ? { 
                            backgroundColor: '#dc2626', 
                            borderBottomRightRadius: 4,
                          } 
                        : { 
                            backgroundColor: '#1a1a1a', 
                            borderBottomLeftRadius: 4,
                            borderWidth: 1,
                            borderColor: '#2a2a2a',
                          },
                    ]}>
                      <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', fontWeight: '500' }}>
                        {msg.text}
                      </Text>
                      <Text style={{ 
                        fontSize: 10, 
                        color: isSent ? 'rgba(255,255,255,0.6)' : '#666', 
                        marginTop: 6,
                        fontWeight: '500',
                      }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Message Input */}
          <View style={{ 
            backgroundColor: '#1a1a1a',
            borderTopWidth: 1,
            borderTopColor: '#2a2a2a',
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 12 : 16,
          }}>
            {error && (
              <View style={{
                backgroundColor: 'rgba(220, 38, 38, 0.15)',
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
                borderLeftWidth: 3,
                borderLeftColor: '#dc2626',
              }}>
                <Text style={{ fontSize: 11, color: '#ff6b6b', fontWeight: '600' }}>⚠️ {error}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <TextInput
                style={{ 
                  flex: 1, 
                  borderWidth: 1, 
                  borderColor: '#2a2a2a', 
                  borderRadius: 20, 
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: 10, 
                  fontSize: 14, 
                  backgroundColor: '#0a0a0a', 
                  color: '#fff', 
                  minHeight: 40, 
                  maxHeight: 100, 
                  marginRight: 10,
                  fontWeight: '500',
                }}
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="Type a message..."
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
                    width: 48,
                    height: 48,
                    borderRadius: 24, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                  }, 
                  !messageInput.trim() || !isAdvertising
                    ? { backgroundColor: '#2a2a2a' } 
                    : { backgroundColor: '#dc2626' }
                ]}
                onPress={handleSendMessage}
                disabled={!messageInput.trim() || !isAdvertising}
              >
                <Text style={{ fontSize: 20 }}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
        </View>
        </SafeAreaView>
      </View>
    );
  }

  // Main Dashboard
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <Animated.View style={{ 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }}>
        <ScrollView 
          style={{ height: '100%' }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ 
            padding: 20,
            paddingTop: 50,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ 
                width: 8, 
                height: 8, 
                borderRadius: 4, 
                backgroundColor: '#dc2626',
                marginRight: 8,
              }} />
              <Text style={{ 
                fontSize: 11, 
                fontWeight: '700', 
                color: '#dc2626', 
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}>
                Emergency Network
              </Text>
            </View>
            <Text style={{ 
              fontSize: 32, 
              fontWeight: '800', 
              color: '#fff', 
              marginBottom: 6,
              letterSpacing: -0.5,
            }}>
              Disaster Response
            </Text>
          </View>

          {/* Error Banner */}
          {error && (
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <View style={{ 
                backgroundColor: 'rgba(220, 38, 38, 0.15)',
                borderLeftWidth: 3,
                borderLeftColor: '#dc2626',
                padding: 14,
                borderRadius: 12,
              }}>
                <Text style={{ fontSize: 12, color: '#ff6b6b', fontWeight: '700' }}>⚠️ {error}</Text>
              </View>
            </View>
          )}

          {/* Big Chat Button */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowChatPage(true)}
              style={{
                backgroundColor: '#dc2626',
                borderRadius: 20,
                padding: 28,
                borderWidth: 2,
                borderColor: '#ef4444',
                shadowColor: '#dc2626',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Text style={{ fontSize: 28 }}>📢</Text>
                </View>
                <View style={{ flex: 1, marginTop: 20, marginBottom: 20}}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4, letterSpacing: 0.3 }}>
                    Global Chat
                  </Text>
                  <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', fontWeight: '600' }}>
                    Tap to view
                  </Text>
                </View>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 12,
                }}>
                  <Text style={{ fontSize: 24, color: '#fff', fontWeight: '700' }}>→</Text>
                </View>
              </View>
              
              {globalMessages.length > 0 && (
                <View style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255, 255, 255, 0.15)',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#10b981',
                      marginRight: 8,
                    }} />
                    <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Latest Message
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500', lineHeight: 18 }} numberOfLines={2}>
                    {globalMessages[globalMessages.length - 1].text}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Emergency Buttons */}
          <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
            <Text style={{ 
              fontSize: 12, 
              fontWeight: '400', 
              color: '#999', 
              marginTop: 8,
              marginBottom: 16,
              margin: "auto",
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              Quick Emergency Messages
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setMessageInput('HELP - Need assistance immediately');
                  setShowChatPage(true);
                }}
                style={{
                  backgroundColor: '#991b1b',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#b91c1c',
                  flex: 1,
                  minWidth: '48%',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
                  HELP
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setMessageInput('MEDICAL EMERGENCY - Urgent medical help needed');
                  setShowChatPage(true);
                }}
                style={{
                  backgroundColor: '#991b1b',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#b91c1c',
                  flex: 1,
                  minWidth: '48%',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
                  MEDICAL
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setMessageInput('TRAPPED - Cannot move, need rescue');
                  setShowChatPage(true);
                }}
                style={{
                  backgroundColor: '#991b1b',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#b91c1c',
                  flex: 1,
                  minWidth: '48%',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
                  TRAPPED
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setMessageInput('FLOOD - Water rising, danger zone');
                  setShowChatPage(true);
                }}
                style={{
                  backgroundColor: '#991b1b',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#b91c1c',
                  flex: 1,
                  minWidth: '48%',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
                  FLOOD
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setMessageInput('FIRE - Active fire in area');
                  setShowChatPage(true);
                }}
                style={{
                  backgroundColor: '#991b1b',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#b91c1c',
                  flex: 1,
                  minWidth: '48%',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
                  FIRE
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setMessageInput('MUST EVACUATE - Leave area immediately');
                  setShowChatPage(true);
                }}
                style={{
                  backgroundColor: '#991b1b',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#b91c1c',
                  flex: 1,
                  minWidth: '48%',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
                  EVACUATE
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={{ 
            flexDirection: 'row', 
            paddingHorizontal: 20,
            marginBottom: 24,
            gap: 12,
          }}>
            <View style={{ 
              flex: 1,
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#2a2a2a',
            }}>
              <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Connected
              </Text>
              <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff' }}>
                {connectedDeviceCount}
              </Text>
            </View>
            <View style={{ 
              flex: 1,
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#2a2a2a',
            }}>
              <Text style={{ fontSize: 11, color: '#f59e0b', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Messages
              </Text>
              <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff' }}>
                {globalMessages.length}
              </Text>
            </View>
            <View style={{ 
              flex: 1,
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#2a2a2a',
            }}>
              <Text style={{ fontSize: 11, color: getSignalColor(), fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Signal
              </Text>
              <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff' }}>
                {getSignalStrength()}
              </Text>
            </View>
          </View>

          {/* Network Status */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 18,
              borderWidth: 1,
              borderColor: '#2a2a2a',
            }}>
              <Text style={{ 
                fontSize: 12, 
                fontWeight: '700', 
                color: '#fff', 
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                Network Status
              </Text>
              {isAdvertising && (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(220, 38, 38, 0.15)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <ActivityIndicator size="small" color="#dc2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700', marginBottom: 2 }}>
                      Broadcasting Signal
                    </Text>
                    <Text style={{ fontSize: 11, color: '#666' }}>
                      Device discoverable and accepting connections
                    </Text>
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
                }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(234, 88, 12, 0.15)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <ActivityIndicator size="small" color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>
                      Scanning for Devices
                    </Text>
                    <Text style={{ fontSize: 11, color: '#666' }}>
                      Looking for nearby devices...
                    </Text>
                  </View>
                </View>
              )}
              {!isAdvertising && !isScanning && (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(100, 100, 100, 0.15)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Text style={{ fontSize: 16 }}>⏳</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#666', fontWeight: '700' }}>
                    Initializing network...
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Connected Devices */}
          {connectedDevices.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#10b981',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#000' }}>
                    {connectedDevices.length}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Active Connections
                </Text>
              </View>
              <View style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#2a2a2a',
                overflow: 'hidden',
              }}>
                {connectedDevices.map((device, index) => (
                  <View 
                    key={device.deviceId || device.device.id || `device-${index}`}
                    style={[
                      { 
                        padding: 16,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      },
                      index < connectedDevices.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: '#2a2a2a',
                      }
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 }}>
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
                        borderRadius: 8, 
                        backgroundColor: '#7f1d1d',
                        borderWidth: 1,
                        borderColor: '#991b1b',
                      }}
                      onPress={() => handleDisconnect(device.deviceId, device.name)}
                    >
                      <Text style={{ 
                        color: '#fff', 
                        fontSize: 11, 
                        fontWeight: '800', 
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                      }}>
                        Disconnect
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* System Information - Collapsible */}
          <View style={{ paddingHorizontal: 20 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleSystemInfo}
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 16,
                padding: 18,
                borderWidth: 1,
                borderColor: '#2a2a2a',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>

                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    System Information
                  </Text>
                </View>
                <Animated.Text style={{ 
                  fontSize: 16, 
                  color: '#666',
                  transform: [{
                    rotate: systemInfoHeight.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg']
                    })
                  }]
                }}>
                  ▼
                </Animated.Text>
              </View>

              <Animated.View style={{
                maxHeight: systemInfoHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 500]
                }),
                opacity: systemInfoHeight,
                overflow: 'hidden',
              }}>
                <View style={{ paddingTop: 14 }}>
                  <Text style={{ fontSize: 12, color: '#888', lineHeight: 20 }}>
                    • Auto-starts advertising and scanning{'\n'}
                    • Messages broadcast to all connected devices{'\n'}
                    • Auto-relay with max 5 hops{'\n'}
                    • Bluetooth must be enabled{'\n'}
                    • Works without internet or cellular{'\n'}
                    • Maximum range: ~10 meters
                  </Text>
                  <View style={{ 
                    marginTop: 14, 
                    padding: 12, 
                    backgroundColor: '#0a0a0a', 
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#2a2a2a',
                  }}>
                    <Text style={{ fontSize: 10, color: '#666', fontFamily: 'monospace', lineHeight: 16 }}>
                      Service: {serviceUuid.substring(0, 18)}...{'\n'}
                      Char: {characteristicUuid.substring(0, 18)}...
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}