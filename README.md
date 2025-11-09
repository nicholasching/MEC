# MEC - Mobile Emergency Chat

A disaster response communication app using **Bluetooth Low Energy (BLE)** mesh networking for offline peer-to-peer messaging when internet and cellular networks are unavailable.

## � Installation

### Step 1: Download the App
Download the latest APK from [Google Drive](https://drive.google.com/file/d/1PjPtcKWwy9MaAuHsu44lBqkadifdLprh/view?usp=sharing) page.

### Step 2: Download the Model Weights File for Local LLM
Download the latest version of Gemma 3:1b.litertlm from [Hugging Face](https://huggingface.co/litert-community/Gemma3-1B-IT/tree/main) page.

### Step 2: Install on Android
- Open the downloaded APK file on your Android device
- Grant installation permissions if prompted
- Open the app and allow Bluetooth permissions when requested

That's it! No internet or account required.

---

## 🚨 Key Features

### Emergency Mesh Network
- **Offline Communication**: Works without internet or cellular service
- **Automatic Mesh**: Messages relay through nearby devices (up to 5 hops)
- **Auto-Connect**: Devices automatically discover and connect to each other
- **No Setup Required**: Just open the app - advertising and scanning start automatically

### Quick Emergency Messages
Send pre-defined emergency alerts with one tap:
- 🆘 HELP - Need assistance immediately
- 🏥 MEDICAL - Urgent medical help needed
- 🚨 TRAPPED - Cannot move, need rescue
- � FLOOD - Water rising, danger zone
- 🔥 FIRE - Active fire in area
- ⚠️ EVACUATE - Leave area immediately

### Global Chat
- Broadcast messages to all connected devices
- View connection count and message history
- Messages automatically relay to extend range
- Real-time network status indicators

### Privacy & Security
- **100% Local**: All communication stays on-device
- **No Servers**: Direct device-to-device messaging
- **No Tracking**: No accounts, no data collection
- **Anonymous**: Device IDs are randomized

---

## 📱 Requirements

- **Android 8.0+** (API level 26 or higher)
- **Bluetooth 4.0+** with BLE support
- **Location Permission**: Required for BLE scanning on Android
- **~10 meters range** per device connection

---

## 🔧 How It Works

1. **Open the app** - Advertising and scanning start automatically
2. **Wait for connections** - Devices discover each other within ~10m
3. **Send messages** - Tap quick emergency buttons or use global chat
4. **Messages relay** - Connected devices forward messages automatically
5. **Mesh extends range** - Reach devices up to 50m+ away through relay

### Network Stats
- View connected device count
- Monitor total messages sent
- Check signal strength status
- See active connections

---

## ⚠️ Important Notes

- **Physical proximity required**: Devices must be within Bluetooth range (~10m)
- **Battery usage**: Continuous BLE operation uses ~10-15% battery per hour
- **Android only**: Currently supports Android devices only
- **Permissions**: Must grant Bluetooth and Location permissions for full functionality
- **Best for emergencies**: Designed for disaster scenarios when normal networks fail

---

## 📖 Use Cases

- **Natural disasters**: Earthquakes, hurricanes, floods
- **Search and rescue**: Coordinate rescue efforts in remote areas
- **Emergency evacuation**: Communicate during power/network outages
- **Disaster response teams**: Field coordination without infrastructure
- **Community alerts**: Warn neighbors of immediate dangers

---

## 🔒 Privacy

- No internet connection required or used
- No user accounts or registration
- No data sent to external servers
- Device IDs are randomly generated
- Messages stored only on device
- Bluetooth connections are local only

---

## 🛠️ Technical Details

- **Technology**: React Native + Expo
- **BLE Stack**: react-native-ble-plx
- **Native Modules**: Kotlin (Android)
- **Message Format**: GATT characteristics
- **Network Topology**: Mesh with automatic relay
- **Max Hops**: 5 (configurable)

---

## 📄 License

MIT

## 🙏 Acknowledgments

Built for emergency preparedness and disaster response scenarios where traditional communication infrastructure may be unavailable.
