/**
 * ServiceText Pro - Bulgarian Market Development
 * React Native App for Bulgarian Tradespeople
 * 
 * Phase 7: Mobile-Backend Integration Demo
 * @format
 */

import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View, Alert } from 'react-native';
import { Provider } from 'react-redux';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { store } from './src/store';
import { AuthBus } from './src/utils/AuthBus';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import ApiService from './src/services/ApiService';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingSession();
    const unsubscribe = AuthBus.subscribe('logout', () => {
      setCurrentUser(null);
    });
    return () => unsubscribe();
  }, []);

  const checkExistingSession = async () => {
    try {
      const isAuthenticated = ApiService.getInstance().isAuthenticated();
      console.log('App.tsx - isAuthenticated:', isAuthenticated);
      
      if (isAuthenticated) {
        // Fast-path: render app immediately when token exists
        console.log('App.tsx - Token present, rendering app immediately and verifying user in background');
        setCurrentUser({ id: 'local', email: '', firstName: '', lastName: '', role: 'tradesperson' });

        // Verify in background without blocking UI
        ApiService.getInstance().getCurrentUser()
          .then((response) => {
            console.log('App.tsx - getCurrentUser response (bg):', response);
            if (response.success && response.data) {
              setCurrentUser(response.data);
            } else {
              console.log('App.tsx - Background user fetch failed; staying in app with local session');
            }
          })
          .catch((err) => {
            console.log('App.tsx - Background user fetch error:', err);
          });
      }
    } catch (error) {
      console.log('App.tsx - No existing session found:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      // Import callDetectionService to clear user data
      const { ModernCallDetectionService } = await import('./src/services/ModernCallDetectionService');
      const callDetectionService = ModernCallDetectionService.getInstance();
      
      await callDetectionService.clearUserData(); // Clear user-specific data
      await ApiService.getInstance().logout();
      setCurrentUser(null);
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: safeAreaInsets.top }]}>
        {/* Loading screen would go here */}
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
