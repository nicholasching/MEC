package com.blerelay

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID

class BleAdvertiseModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var advertiseCallback: AdvertiseCallback? = null
    private var isAdvertising = false
    private var currentMessage: String = ""
    private var deviceId: String = ""
    private var advertiser: BluetoothLeAdvertiser? = null
    private var gattServer: BleGattServer? = null
    
    companion object {
        private const val TAG = "BleAdvertiseModule"
        
        // Service UUID for GATT (128-bit)
        val SERVICE_UUID: UUID = UUID.fromString("597df698-a650-4a42-bfd6-d8fbe03602ae")
        
        // 16-bit UUID for advertisement (derived from first 16 bits of full UUID)
        // We'll use 0x597D as the 16-bit UUID for advertisement
        // This is just for discovery - the full UUID is used in GATT service
        private const val ADVERTISEMENT_SERVICE_UUID_16BIT = 0x597D
        
        // Alternative: Use service data with manufacturer ID instead of service UUID
        // This gives us more control over the advertisement packet size
    }

    init {
        try {
            val bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            bluetoothAdapter = bluetoothManager?.adapter
        } catch (e: SecurityException) {
            Log.w(TAG, "Could not initialize Bluetooth adapter: ${e.message}")
        }
    }
    
    private fun getBluetoothLeAdvertiser(): BluetoothLeAdvertiser? {
        return try {
            bluetoothAdapter?.bluetoothLeAdvertiser
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied accessing Bluetooth LE Advertiser: ${e.message}")
            null
        }
    }
    
    private fun getBluetoothManager(): BluetoothManager? {
        return try {
            reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied accessing Bluetooth Manager: ${e.message}")
            null
        }
    }

    override fun getName(): String {
        return "BleAdvertiseModule"
    }

    /**
     * Create advertisement data with service UUID
     * Advertises the service UUID so devices can discover and connect
     * Uses 16-bit UUID in advertisement to save space (BLE limit is 31 bytes)
     */
    private fun createAdvertisementData(): AdvertiseData {
        val dataBuilder = AdvertiseData.Builder()
            .setIncludeTxPowerLevel(false)
            .setIncludeDeviceName(false) // Don't include device name to save space
        
        // Option 1: Use 16-bit UUID in advertisement (2 bytes instead of 16)
        // Convert 16-bit UUID to ParcelUuid (Android will handle it as 16-bit)
        val uuid16Bit = UUID.fromString(String.format("0000%04X-0000-1000-8000-00805f9b34fb", ADVERTISEMENT_SERVICE_UUID_16BIT))
        dataBuilder.addServiceUuid(ParcelUuid(uuid16Bit))
        
        // Option 2: Use service data with the full UUID (alternative approach)
        // This allows us to include the full UUID in a more compact way
        // val serviceData = SERVICE_UUID.toString().replace("-", "").substring(0, 16).toByteArray(Charsets.UTF_8)
        // dataBuilder.addServiceData(ParcelUuid(uuid16Bit), serviceData)
        
        val advertiseData = dataBuilder.build()
        Log.d(TAG, "Created advertisement data with 16-bit service UUID: 0x${Integer.toHexString(ADVERTISEMENT_SERVICE_UUID_16BIT)}")
        Log.d(TAG, "Full GATT service UUID: $SERVICE_UUID")
        
        return advertiseData
    }

    /**
     * Start advertising with GATT server
     */
    @ReactMethod
    fun startAdvertising(advertisementData: ReadableMap, promise: Promise) {
        try {
            if (isAdvertising) {
                promise.reject("ALREADY_ADVERTISING", "Already advertising")
                return
            }

            // Get advertiser (requires permissions)
            advertiser = getBluetoothLeAdvertiser()
            if (advertiser == null) {
                promise.reject("NO_ADVERTISER", "Bluetooth LE Advertiser not available. Check permissions.")
                return
            }

            if (bluetoothAdapter == null) {
                promise.reject("NO_ADAPTER", "Bluetooth adapter not available")
                return
            }
            
            // Check if Bluetooth is enabled
            var isBluetoothEnabled = false
            try {
                isBluetoothEnabled = bluetoothAdapter!!.isEnabled
            } catch (e: SecurityException) {
                promise.reject("PERMISSION_DENIED", "Bluetooth permission required: ${e.message}")
                return
            }
            
            if (!isBluetoothEnabled) {
                promise.reject("BLUETOOTH_DISABLED", "Bluetooth is not enabled")
                return
            }

            // Get advertisement data
            val deviceName = advertisementData.getString("name") ?: "BLE-R"
            deviceId = advertisementData.getString("deviceId") ?: ""
            val message = advertisementData.getString("message") ?: ""
            
            currentMessage = message
            
            Log.d(TAG, "Starting BLE advertising with GATT server")
            Log.d(TAG, "Device ID: $deviceId")
            Log.d(TAG, "Service UUID: $SERVICE_UUID")
            Log.d(TAG, "Initial message: ${message.take(50)}... (${message.length} chars)")
            
            // Start GATT server first
            val bluetoothManager = getBluetoothManager()
            if (bluetoothManager == null) {
                promise.reject("NO_BLUETOOTH_MANAGER", "Bluetooth Manager not available")
                return
            }
            
            gattServer = BleGattServer(reactApplicationContext)
            val gattServerStarted = gattServer!!.start(bluetoothManager)
            
            if (!gattServerStarted) {
                promise.reject("GATT_SERVER_FAILED", "Failed to start GATT server")
                return
            }
            
            // Set initial message
            if (message.isNotEmpty()) {
                gattServer!!.setMessage(message)
            }
            
            // Set up message update callback
            gattServer!!.setMessageUpdateCallback { updatedMessage ->
                currentMessage = updatedMessage
                // Emit event to React Native if needed
                Log.d(TAG, "Message updated via GATT: ${updatedMessage.take(50)}...")
            }
            
            // Create advertisement data with service UUID
            val advertiseData = createAdvertisementData()
            
            // Create advertisement callback
            advertiseCallback = object : AdvertiseCallback() {
                override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
                    isAdvertising = true
                    Log.d(TAG, "✅ BLE advertising started successfully")
                    Log.d(TAG, "✅ GATT server is ready to accept connections")
                    promise.resolve("Advertising started")
                }
                
                override fun onStartFailure(errorCode: Int) {
                    isAdvertising = false
                    val errorMessage = when (errorCode) {
                        AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE -> "Advertisement data is too large"
                        AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Too many advertisers"
                        AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED -> "Advertising already started"
                        AdvertiseCallback.ADVERTISE_FAILED_INTERNAL_ERROR -> "Internal error"
                        AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "Feature unsupported"
                        else -> "Unknown error: $errorCode"
                    }
                    Log.e(TAG, "❌ BLE advertising failed: $errorMessage")
                    
                    // Clean up GATT server if advertising failed
                    gattServer?.stop()
                    gattServer = null
                    
                    promise.reject("ADVERTISE_FAILED", errorMessage)
                }
            }
            
            // Start advertising (connectable mode to allow GATT connections)
            advertiser?.startAdvertising(
                AdvertiseSettings.Builder()
                    .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_BALANCED)
                    .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                    .setConnectable(true) // Connectable to allow GATT connections
                    .setTimeout(0) // Advertise indefinitely
                    .build(),
                advertiseData,
                advertiseCallback!!
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error starting advertising", e)
            gattServer?.stop()
            gattServer = null
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun stopAdvertising(promise: Promise) {
        try {
            if (!isAdvertising) {
                promise.reject("NOT_ADVERTISING", "Not currently advertising")
                return
            }

            // Stop advertising
            advertiseCallback?.let { callback ->
                try {
                    advertiser?.stopAdvertising(callback)
                } catch (e: SecurityException) {
                    Log.e(TAG, "Permission denied stopping advertising: ${e.message}")
                } catch (e: Exception) {
                    Log.e(TAG, "Error stopping advertising: ${e.message}")
                }
                advertiseCallback = null
            }
            
            // Stop GATT server
            gattServer?.stop()
            gattServer = null

            isAdvertising = false
            currentMessage = ""
            Log.d(TAG, "BLE advertising stopped")
            promise.resolve("Advertising stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping advertising", e)
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun isAdvertising(promise: Promise) {
        promise.resolve(isAdvertising)
    }

    @ReactMethod
    fun setMessage(message: String, promise: Promise) {
        try {
            if (!isAdvertising) {
                promise.reject("NOT_ADVERTISING", "Not currently advertising")
                return
            }
            
            if (gattServer == null) {
                promise.reject("GATT_SERVER_NOT_READY", "GATT server not ready")
                return
            }
            
            currentMessage = message
            gattServer!!.setMessage(message)
            
            Log.d(TAG, "Message updated: ${message.take(50)}... (${message.length} chars)")
            promise.resolve("Message updated")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting message", e)
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }
    
    @ReactMethod
    fun getMessage(promise: Promise) {
        try {
            if (gattServer == null) {
                promise.reject("GATT_SERVER_NOT_READY", "GATT server not ready")
                return
            }
            
            val message = gattServer!!.getMessage()
            promise.resolve(message)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting message", e)
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }
    
    @ReactMethod
    fun getConnectedDevicesCount(promise: Promise) {
        try {
            if (gattServer == null) {
                promise.resolve(0)
                return
            }
            
            val count = gattServer!!.getConnectedDevicesCount()
            promise.resolve(count)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting connected devices count", e)
            promise.resolve(0)
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        // Cleanup
        advertiseCallback?.let { callback ->
            try {
                advertiser?.stopAdvertising(callback)
            } catch (e: Exception) {
                // Ignore
            }
        }
        gattServer?.stop()
        gattServer = null
    }
}
