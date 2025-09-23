# ServiceText Pro - Dependencies and Setup Guide

## 📋 Complete Dependencies List

### Core React Native Dependencies
```json
{
  "react": "19.1.0",
  "react-native": "0.81.1",
  "react-test-renderer": "19.1.0"
}
```

### Navigation & UI Dependencies
```json
{
  "@react-navigation/bottom-tabs": "^7.4.6",
  "@react-navigation/native": "^7.1.17",
  "@react-navigation/stack": "^7.4.7",
  "react-native-gesture-handler": "^2.28.0",
  "react-native-safe-area-context": "^5.6.1",
  "react-native-screens": "^4.15.4",
  "react-native-svg": "^15.12.1"
}
```

### State Management Dependencies
```json
{
  "@reduxjs/toolkit": "^2.8.2",
  "react-redux": "^9.2.0"
}
```

### Storage & Data Dependencies
```json
{
  "@react-native-async-storage/async-storage": "^2.2.0",
  "axios": "^1.11.0"
}
```

### Device Features Dependencies
```json
{
  "@react-native-picker/picker": "^2.11.1",
  "react-native-call-log": "^2.1.2",
  "react-native-contacts": "^8.0.6",
  "react-native-permissions": "^5.4.2",
  "react-native-send-intent": "^1.3.0"
}
```

### Charts & Analytics Dependencies
```json
{
  "react-native-chart-kit": "^6.12.0"
}
```

### External Services Dependencies
```json
{
  "node-telegram-bot-api": "^0.66.0"
}
```

### Development Dependencies
```json
{
  "@babel/core": "^7.25.2",
  "@babel/preset-env": "^7.25.3",
  "@babel/plugin-transform-runtime": "^7.25.3",
  "@react-native-community/cli": "latest",
  "@react-native-community/cli-platform-android": "20.0.0",
  "@react-native-community/cli-platform-ios": "20.0.0",
  "@react-native/babel-preset": "0.81.1",
  "@react-native/eslint-config": "0.81.1",
  "@react-native/gradle-plugin": "0.81.1",
  "@react-native/metro-config": "0.81.1",
  "@react-native/typescript-config": "0.81.1",
  "@types/jest": "^29.5.13",
  "@types/react": "^19.1.0",
  "@types/react-test-renderer": "^19.1.0",
  "eslint": "^8.19.0",
  "jest": "^29.6.3",
  "prettier": "2.8.8",
  "typescript": "^5.8.3"
}
```

### Additional React Native Core Dependencies
```json
{
  "@react-native/new-app-screen": "0.81.1"
}
```

## 🔧 Critical Configuration Files

### 1. package.json Overrides (IMPORTANT!)
```json
{
  "overrides": {
    "react": "19.1.0",
    "@types/react": "^19.1.0"
  }
}
```
**Why needed**: Forces all packages to use the same React version, preventing hook conflicts.

### 2. babel.config.js
```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-transform-runtime', {
      helpers: true,
      regenerator: true,
    }]
  ],
};
```

### 3. metro.config.js
```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const config = {
  watchFolders: [
    path.resolve(__dirname, '../node_modules'),
    path.resolve(__dirname, './node_modules'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, './node_modules'),
      path.resolve(__dirname, '../node_modules'),
    ],
  },
  server: {
    host: '192.168.0.129',
    port: 8081,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

### 4. android/settings.gradle
```gradle
pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
plugins { id("com.facebook.react.settings") }
extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand() }
rootProject.name = 'ServiceTextPro'
include ':app'
includeBuild('../node_modules/@react-native/gradle-plugin')
```

## 🚀 Setup Instructions

### Prerequisites
1. **Node.js**: >= 18.0.0
2. **NPM**: >= 8.0.0
3. **Android Studio**: Latest version with Android SDK
4. **JDK**: 11 or higher
5. **React Native CLI**: Install globally

### Step-by-Step Setup

#### 1. Install Global Dependencies
```bash
npm install -g @react-native-community/cli
```

#### 2. Clone and Install Project Dependencies
```bash
cd ServiceTextPro
npm install
```

#### 3. Clean Cache (if needed)
```bash
npm cache clean --force
npx react-native start --reset-cache
```

#### 4. Android Setup
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

#### 5. Start Metro Development Server
```bash
npx react-native start --host 192.168.0.129 --port 8081
```

## ⚠️ Common Issues and Solutions

### Issue 1: Babel Runtime Error
**Error**: `Unable to resolve module @babel/runtime/helpers/interopRequireDefault`
**Solution**: Ensure `@babel/plugin-transform-runtime` is installed and configured in babel.config.js

### Issue 2: React Hook Errors
**Error**: `Invalid hook call. Hooks can only be called inside of the body of a function component`
**Solution**: Use package overrides to force React 19.1.0 across all dependencies

### Issue 3: Gradle Plugin Not Found
**Error**: `Plugin [id: 'com.facebook.react.settings'] was not found`
**Solution**: Ensure `@react-native/gradle-plugin` is installed and paths in settings.gradle are correct

### Issue 4: Metro Cache Corruption
**Error**: `Error while reading cache, falling back to a full crawl`
**Solution**: Run `npx react-native start --reset-cache`

## 📱 Testing the Setup

### Verify Installation
1. **Dependencies**: `npm ls` should show no missing dependencies
2. **React Version**: `npm ls react` should show React 19.1.0 across all packages
3. **Android Build**: Android Studio should sync without errors
4. **Metro Server**: Should start on http://192.168.0.129:8081

### Quick Test Commands
```bash
# Check dependencies
npm ls react

# Test Metro server
npx react-native start

# Test Android build
npx react-native run-android

# Clean and rebuild if needed
npx react-native clean
```

## 🔄 Workspace Configuration

**Important**: This project is configured to work WITHOUT workspace mode to avoid dependency conflicts.

Root package.json has workspaces disabled:
```json
{
  "_workspaces_disabled": [
    "ServiceTextPro",
    "Marketplace", 
    "backend"
  ]
}
```

Each project (ServiceTextPro, Marketplace, backend) should have its own node_modules.

## 📝 Version Compatibility Matrix

| Package | Version | React Native Compatibility |
|---------|---------|----------------------------|
| React | 19.1.0 | ✅ 0.81.1 |
| React Native | 0.81.1 | ✅ Latest |
| Node.js | >= 18.0.0 | ✅ Recommended |
| @react-native/gradle-plugin | 0.81.1 | ✅ Matches RN version |

## 🎯 Next Steps After Setup

1. Test the app on Android device/emulator
2. Verify all features work (navigation, Redux, device permissions)
3. Run tests: `npm test`
4. Build release APK: `cd android && ./gradlew assembleRelease`

---

**Last Updated**: January 2025
**React Native Version**: 0.81.1
**Target Platform**: Android (Primary), iOS (Secondary)

