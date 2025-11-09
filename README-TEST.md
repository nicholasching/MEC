# BLE GATT Communication Test Script

This Python script tests BLE GATT communication with the BLE Relay Android app.

## Requirements

1. Python 3.7 or higher
2. `bleak` library (cross-platform BLE library)
3. Bluetooth adapter on your computer
4. The Android app running and advertising

## Installation

1. Install the required Python packages:
```bash
pip install bleak
```

Or install from requirements file:
```bash
pip install -r requirements-test.txt
```

## Usage

1. Start the Android app and begin advertising
2. Run the test script:
```bash
python test_ble_gatt.py
```

## What the Script Does

1. **Scans for devices** - Looks for BLE devices advertising the service UUID pattern `2a5af6cd-0255-4884-b889-*`
2. **Connects to device** - Connects to the first device found with the expected service UUID
3. **Discovers services** - Lists all services and finds the target service and characteristic
4. **Reads message** - Reads the current message from the characteristic
5. **Enables notifications** - Sets up notifications to receive messages from the device
6. **Interactive messaging** - Allows you to send messages by typing and pressing Enter

## Features

- ✅ Automatic device scanning
- ✅ Service and characteristic discovery
- ✅ Message reading (base64-encoded UTF-8)
- ✅ Message writing (base64-encoded UTF-8)
- ✅ Notification support (receives messages from device)
- ✅ Interactive command-line interface
- ✅ Error handling and debugging output

## Expected Service UUID Format

- **Service UUID**: `2a5af6cd-0255-4884-b889-{random_suffix}`
- **Characteristic UUID**: Same as service UUID but last character changed (e.g., `3` → `a`)

## Troubleshooting

### No devices found
- Make sure the Android app is advertising
- Check that Bluetooth is enabled on both devices
- Ensure the devices are within range (typically < 10 meters)
- On Linux, you may need to run with `sudo` or configure Bluetooth permissions

### Connection timeout
- Check that the Android app is still advertising
- Verify Bluetooth is enabled
- Try moving the devices closer together
- Check Android logs for GATT server initialization errors

### Service not found
- Verify the service UUID in the Android app matches the expected pattern
- Check Android logs to see if the service was added successfully
- Ensure the GATT server is initialized before advertising starts

### Characteristic not found
- Check that the characteristic UUID matches (service UUID with last char modified)
- Verify the characteristic has the correct properties (read, write, notify)
- Check Android logs for characteristic creation errors

## Platform-Specific Notes

### Linux
- May require `sudo` to access Bluetooth
- Install: `sudo apt-get install libbluetooth-dev` (Debian/Ubuntu)
- Or: `sudo yum install bluez-libs-devel` (Fedora/RHEL)

### macOS
- Bluetooth should work out of the box
- May need to grant Bluetooth permissions in System Preferences

### Windows
- Should work out of the box with Windows 10/11
- May need to install Bluetooth drivers

## Example Output

```
============================================================
BLE GATT Communication Test Script
============================================================

🔍 Scanning for BLE devices...
Looking for service UUID pattern: 2a5af6cd-0255-4884-b889-*
Scanning for 10.0 seconds...

[Found] Unknown (24:24:B7:6F:4D:B8)
  Service UUID: 2a5af6cd-0255-4884-b889-797b74ab7c83
  RSSI: -45
  Advertisement message: Hello

============================================================
Connecting to the found device...
============================================================

🔌 Connecting to 24:24:B7:6F:4D:B8...
Service UUID: 2a5af6cd-0255-4884-b889-797b74ab7c83

Expected Characteristic UUID: 2a5af6cd-0255-4884-b889-797b74ab7c8a

✅ Connected to 24:24:B7:6F:4D:B8

============================================================
Discovering services...
============================================================

🔍 Discovering services...

Found 6 service(s):
  - 00001801-0000-1000-8000-00805f9b34fb (4 characteristics)
  - 00001800-0000-1000-8000-00805f9b34fb (3 characteristics)
  - 2a5af6cd-0255-4884-b889-797b74ab7c83 (1 characteristics)
    ✅ Found target service!
    - 2a5af6cd-0255-4884-b889-797b74ab7c8a (properties: ['read', 'write', 'notify'])
      ✅ Found target characteristic!

============================================================
Reading initial message...
============================================================

📖 Reading message from characteristic...
✅ Message read: Hello

============================================================
Enabling notifications...
============================================================

🔔 Enabling notifications...
✅ Notifications enabled

============================================================
Connected! You can now send messages.
Type your message and press Enter to send.
Type 'quit' or 'exit' to disconnect.
============================================================

> test message
📝 Writing message: test message
✅ Message written successfully

📨 Notification received: test message

> quit
🔌 Disconnected from device

✅ Test completed
```

