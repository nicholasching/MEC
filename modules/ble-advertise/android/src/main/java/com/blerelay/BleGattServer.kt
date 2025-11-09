package com.blerelay

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.util.Base64
import android.util.Log
import java.util.UUID

/**
 * GATT Server for BLE communication
 * 
 * Service UUID: 597df698-a650-4a42-bfd6-d8fbe03602ae
 * Characteristic UUID: 5f1b1461-160a-4e99-b268-b9c8ef2c0abb
 */
class BleGattServer(private val context: Context) {
    companion object {
        private const val TAG = "BleGattServer"
        
        // Service UUID
        val SERVICE_UUID: UUID = UUID.fromString("597df698-a650-4a42-bfd6-d8fbe03602ae")
        
        // Characteristic UUID for message exchange
        val CHARACTERISTIC_UUID: UUID = UUID.fromString("5f1b1461-160a-4e99-b268-b9c8ef2c0abb")
        
        // Client Characteristic Configuration Descriptor UUID (for notifications)
        val CLIENT_CHARACTERISTIC_CONFIG: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
        
        // 16-bit service UUID for advertisement (extracted from full UUID)
        // We'll use the first 16 bits of the service UUID as a short UUID
        // For UUID 597df698-a650-4a42-bfd6-d8fbe03602ae, we can't directly convert to 16-bit
        // Instead, we'll use a custom 16-bit UUID in the advertisement and include full UUID in service data
        // Or we can use the service UUID directly in service UUID list (Android supports 128-bit UUIDs in advertisements)
    }
    
    private var gattServer: BluetoothGattServer? = null
    private var currentMessage: String = ""
    private var connectedDevices: MutableSet<BluetoothDevice> = mutableSetOf()
    private var messageUpdateCallback: ((String, String) -> Unit)? = null
    
    /**
     * Initialize and start the GATT server
     */
    fun start(bluetoothManager: BluetoothManager): Boolean {
        return try {
            val adapter = bluetoothManager.adapter
            gattServer = bluetoothManager.openGattServer(context, gattServerCallback)
            
            if (gattServer == null) {
                Log.e(TAG, "Failed to open GATT server")
                return false
            }
            
            // Create the service
            val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
            
            // Create the characteristic with read, write, and notify properties
            val characteristic = BluetoothGattCharacteristic(
                CHARACTERISTIC_UUID,
                BluetoothGattCharacteristic.PROPERTY_READ or 
                BluetoothGattCharacteristic.PROPERTY_WRITE or 
                BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                BluetoothGattCharacteristic.PERMISSION_READ or 
                BluetoothGattCharacteristic.PERMISSION_WRITE
            )
            
            // Add client characteristic configuration descriptor for notifications
            val descriptor = BluetoothGattDescriptor(
                CLIENT_CHARACTERISTIC_CONFIG,
                BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE
            )
            characteristic.addDescriptor(descriptor)
            
            // Set initial value as raw UTF-8 bytes - react-native-ble-plx will handle base64 encoding for JS bridge
            val initialMessageBytes = currentMessage.toByteArray(Charsets.UTF_8)
            characteristic.value = initialMessageBytes
            
            // Add characteristic to service
            service.addCharacteristic(characteristic)
            
            // Add service to GATT server
            val success = gattServer!!.addService(service)
            
            if (success) {
                Log.d(TAG, "✅ GATT server started successfully")
                Log.d(TAG, "Service UUID: $SERVICE_UUID")
                Log.d(TAG, "Characteristic UUID: $CHARACTERISTIC_UUID")
            } else {
                Log.e(TAG, "Failed to add service to GATT server")
            }
            
            success
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied starting GATT server: ${e.message}")
            false
        } catch (e: Exception) {
            Log.e(TAG, "Error starting GATT server: ${e.message}", e)
            false
        }
    }
    
    /**
     * Stop the GATT server
     */
    fun stop() {
        try {
            gattServer?.close()
            gattServer = null
            connectedDevices.clear()
            Log.d(TAG, "GATT server stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping GATT server: ${e.message}")
        }
    }
    
    /**
     * Update the message value
     */
    fun setMessage(message: String) {
        currentMessage = message
        val service = gattServer?.getService(SERVICE_UUID)
        val characteristic = service?.getCharacteristic(CHARACTERISTIC_UUID)
        
        if (characteristic != null) {
            // Store message as raw UTF-8 bytes - react-native-ble-plx will handle base64 encoding for JS bridge
            val messageBytes = message.toByteArray(Charsets.UTF_8)
            characteristic.value = messageBytes
            
            // Notify all connected devices
            connectedDevices.forEach { device ->
                try {
                    gattServer?.notifyCharacteristicChanged(device, characteristic, false)
                } catch (e: Exception) {
                    Log.w(TAG, "Error notifying device ${device.address}: ${e.message}")
                }
            }
            
            Log.d(TAG, "Message updated: ${message.take(50)}... (${message.length} chars, ${messageBytes.size} bytes UTF-8)")
        }
    }
    
    /**
     * Get current message
     */
    fun getMessage(): String {
        return currentMessage
    }
    
    /**
     * Set callback for message updates from clients
     * Callback receives: (message: String, deviceAddress: String)
     */
    fun setMessageUpdateCallback(callback: (String, String) -> Unit) {
        messageUpdateCallback = callback
    }
    
    /**
     * Get connected devices count
     */
    fun getConnectedDevicesCount(): Int {
        return connectedDevices.size
    }
    
    /**
     * GATT server callback
     */
    private val gattServerCallback = object : BluetoothGattServerCallback() {
        override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    connectedDevices.add(device)
                    Log.d(TAG, "✅ Device connected: ${device.address}")
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    connectedDevices.remove(device)
                    Log.d(TAG, "❌ Device disconnected: ${device.address}")
                }
            }
        }
        
        override fun onServiceAdded(status: Int, service: BluetoothGattService) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                Log.d(TAG, "Service added successfully")
            } else {
                Log.e(TAG, "Failed to add service: $status")
            }
        }
        
        override fun onCharacteristicReadRequest(
            device: BluetoothDevice,
            requestId: Int,
            offset: Int,
            characteristic: BluetoothGattCharacteristic
        ) {
            if (characteristic.uuid == CHARACTERISTIC_UUID) {
                // Send raw UTF-8 bytes - react-native-ble-plx will handle base64 encoding for JS bridge
                val messageBytes = currentMessage.toByteArray(Charsets.UTF_8)
                
                // Handle long reads - Android BLE stack handles chunking automatically
                // We just need to return the correct portion based on offset
                val responseValue = if (offset < messageBytes.size) {
                    // Return from offset to end (Android will chunk based on MTU)
                    messageBytes.copyOfRange(offset, messageBytes.size)
                } else {
                    // Offset beyond data size - return empty
                    ByteArray(0)
                }
                
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, responseValue)
                Log.d(TAG, "Characteristic read by ${device.address}, offset=$offset, response size=${responseValue.size}, total=${messageBytes.size} bytes (message: ${currentMessage.length} chars)")
            } else {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, offset, null)
            }
        }
        
        override fun onCharacteristicWriteRequest(
            device: BluetoothDevice,
            requestId: Int,
            characteristic: BluetoothGattCharacteristic,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            if (characteristic.uuid == CHARACTERISTIC_UUID && value != null) {
                // react-native-ble-plx sends base64-encoded strings as UTF-8 bytes
                // We need to collect all chunks, decode from base64, then convert to string
                
                // Store the incoming value chunks
                // Android's BLE stack handles chunking automatically for long writes
                val existingValue = characteristic.value
                val newValue = if (offset == 0) {
                    // New write starting - replace existing value
                    value
                } else if (existingValue != null && offset == existingValue.size) {
                    // Continuation write - append to existing value
                    val combined = ByteArray(existingValue.size + value.size)
                    System.arraycopy(existingValue, 0, combined, 0, existingValue.size)
                    System.arraycopy(value, 0, combined, existingValue.size, value.size)
                    combined
                } else {
                    // Unexpected offset - log and use new value
                    Log.w(TAG, "Unexpected write offset: $offset, existing size: ${existingValue?.size ?: 0}")
                    value
                }
                
                // react-native-ble-plx sends base64-encoded string as UTF-8 bytes
                // Decode base64 to get the actual message
                try {
                    val base64String = String(newValue, Charsets.UTF_8)
                    val decodedBytes = Base64.decode(base64String, Base64.NO_WRAP)
                    currentMessage = String(decodedBytes, Charsets.UTF_8)
                } catch (e: Exception) {
                    // If base64 decode fails, try treating as raw UTF-8 (fallback)
                    Log.w(TAG, "Failed to decode base64, treating as UTF-8: ${e.message}")
                    currentMessage = String(newValue, Charsets.UTF_8)
                }
                
                val message = currentMessage
                
                // Update characteristic value with raw UTF-8 bytes (for notifications)
                val messageBytes = message.toByteArray(Charsets.UTF_8)
                characteristic.value = messageBytes
                
                // Notify callback with message and device address - this will trigger React Native to process the message
                // The callback should update the characteristic value and trigger notifications
                messageUpdateCallback?.invoke(message, device.address)
                
                if (responseNeeded) {
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
                }
                
                // IMPORTANT: We need to notify the LOCAL device (the one running this GATT server)
                // so that the React Native client receives the message through notifications
                // The React Native client will then handle routing and broadcasting to other devices
                // We notify the device that wrote to us, so it can receive the message back
                // Actually, we should notify ALL connected devices EXCEPT the one that wrote
                // But the React Native client will handle this, so we just notify the writing device
                // to trigger its notification handler
                
                // Actually, the issue is that when Device A writes to Device B's characteristic,
                // Device B's GATT server receives it and should notify Device B's React Native client.
                // But we removed the notification. We need to notify the LOCAL React Native client
                // by updating the characteristic and having the client monitor it.
                // The callback already does this by updating currentMessage, but we need to make sure
                // the React Native client is monitoring the characteristic.
                
                // The callback will be called, which should trigger the React Native client's notification handler
                // But we also need to make sure the characteristic value is updated so notifications work
                
                Log.d(TAG, "Message received from ${device.address}: ${message.take(50)}... (${message.length} chars)")
            } else {
                if (responseNeeded) {
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, offset, null)
                }
            }
        }
        
        override fun onDescriptorWriteRequest(
            device: BluetoothDevice,
            requestId: Int,
            descriptor: BluetoothGattDescriptor,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            if (descriptor.uuid == CLIENT_CHARACTERISTIC_CONFIG) {
                if (value != null && value.isNotEmpty()) {
                    val enable = value[0].toInt() == 0x01
                    if (enable) {
                        Log.d(TAG, "Notifications enabled for ${device.address}")
                    } else {
                        Log.d(TAG, "Notifications disabled for ${device.address}")
                    }
                }
                
                if (responseNeeded) {
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
                }
            } else {
                if (responseNeeded) {
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, offset, null)
                }
            }
        }
        
        override fun onNotificationSent(device: BluetoothDevice, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                Log.w(TAG, "Notification send failed to ${device.address}: $status")
            }
        }
    }
}

