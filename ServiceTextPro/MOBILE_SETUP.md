# ServiceText Pro - Mobile App Installation Guide

## Overview
The ServiceText Pro mobile app is built with React Native and can be installed on both Android and iOS devices. This guide will walk you through the installation process.

## Prerequisites

### For Development
- Node.js 20+ (installed at D:\NJS)
- Android Studio (for Android development)
- Xcode (for iOS development - Mac only)
- A physical device or emulator

### For Your Phone
- Android 7.0+ (API level 24+) OR iOS 13+
- USB cable for device connection
- Enable Developer Options (Android only)

## Quick Start - Android (Recommended for Testing)

### Step 1: Enable Developer Mode on Your Android Phone
1. Go to **Settings > About Phone**
2. Tap **Build Number** 7 times to enable Developer Options
3. Go back to **Settings > Developer Options**
4. Enable **USB Debugging**
5. Connect your phone to computer via USB
6. Allow USB debugging when prompted

### Step 2: Install the App
```bash
# Navigate to the project directory
cd ServiceTextPro

# Install dependencies (if not already done)
npm install

# Start Metro bundler in one terminal
npm start

# In another terminal, install on your connected Android device
npm run android
```

### Step 3: Alternative - Build APK File
If you want to install without connecting to computer:

```bash
# Build release APK
npm run build:android

# The APK will be created at:
# android/app/build/outputs/apk/release/app-release.apk
```

Transfer this APK file to your phone and install it directly.

## iOS Installation (Mac Required)

### Step 1: Install iOS Dependencies
```bash
cd ServiceTextPro/ios
pod install
```

### Step 2: Run on iOS Device
```bash
# Back to project root
cd ..

# Run on iOS (requires Mac + Xcode)
npm run ios
```

## Current App Features (Phase 1-6 Complete)

### ✅ Implemented Features
1. **User Authentication & Registration**
   - GDPR-compliant registration
   - Bulgarian phone number validation
   - Secure login/logout
   
2. **Dashboard & Analytics**
   - Real-time call monitoring
   - Performance metrics
   - Issue analysis display

3. **AI Conversation Engine**
   - Bulgarian NLP support
   - Automated issue classification
   - Smart response generation

4. **GDPR Compliance**
   - Consent management
   - Data access/export
   - Privacy controls

5. **Backend Integration**
   - REST API connectivity
   - Real-time WebSocket updates
   - Secure authentication

### 🔄 In Development (Phase 7)
- Complete messaging platform integration
- Enhanced testing suite
- Performance optimizations

## Testing the App

### Login Credentials for Testing
The app will connect to your local backend server at `http://localhost:3000`

**Test Account:**
- Email: `ivan@example.com`
- Password: `Test123!@#`

### Key Screens to Test
1. **Registration Screen** - Test GDPR consent flow
2. **Dashboard** - View analytics and metrics
3. **Conversation Screen** - Test AI chat functionality
4. **Settings** - GDPR privacy controls

## Troubleshooting

### Common Android Issues

**"Metro bundler not found"**
```bash
npx react-native start --reset-cache
```

**"Device not recognized"**
- Check USB debugging is enabled
- Try different USB cable
- Install device drivers

**"Build failed"**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Common iOS Issues

**"Pod install failed"**
```bash
cd ios
rm -rf Pods
rm Podfile.lock
pod install
```

**"Xcode build failed"**
- Open `ios/ServiceTextPro.xcworkspace` in Xcode
- Select your device/simulator
- Build and run from Xcode

## Development Mode vs Production

### Development Mode (Current)
- Hot reloading enabled
- Debug information visible
- Connects to local backend (`http://localhost:3000`)

### Production Mode (Future)
```bash
# Android production build
npm run android:release

# iOS production build  
npm run ios:release
```

## Backend Connection

The mobile app is configured to connect to:
- **Local Development**: `http://localhost:3000`
- **Production**: Will be configured later

Make sure your backend server is running:
```bash
cd backend
npm run dev
```

## Next Steps

1. **Install the app** on your phone using the steps above
2. **Start the backend** server (`cd backend && npm run dev`)
3. **Test the registration** flow with Bulgarian phone number
4. **Explore the dashboard** and AI conversation features
5. **Test GDPR controls** in the settings screen

## Support

If you encounter issues:
1. Check that Node.js and dependencies are installed
2. Ensure your phone has Developer Mode enabled
3. Verify the backend server is running
4. Check the Metro bundler logs for errors

The app is designed for Bulgarian tradespeople and includes:
- Bulgarian language support
- Local business compliance (ЕИК, ДДС)
- WhatsApp/Viber integration (Phase 8)
- Professional messaging templates

Ready to test your ServiceText Pro app! 📱
