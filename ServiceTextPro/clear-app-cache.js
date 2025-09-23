// Add this function to your mobile app for testing
// You can call it from a debug menu or button

import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllAppCache = async () => {
  try {
    console.log('🗑️ Clearing all app cache...');
    
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    console.log('📋 Found keys:', keys);
    
    // Clear everything
    await AsyncStorage.multiRemove(keys);
    
    console.log('✅ All app cache cleared!');
    console.log('🔄 Please restart the app to see changes');
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing app cache:', error);
    return false;
  }
};

// Or clear specific conversation-related cache
export const clearConversationCache = async () => {
  try {
    console.log('🗑️ Clearing conversation cache...');
    
    const keys = await AsyncStorage.getAllKeys();
    const conversationKeys = keys.filter(key => 
      key.includes('conversation') || 
      key.includes('chat') || 
      key.includes('message')
    );
    
    if (conversationKeys.length > 0) {
      await AsyncStorage.multiRemove(conversationKeys);
      console.log('✅ Conversation cache cleared:', conversationKeys);
    } else {
      console.log('ℹ️ No conversation cache found');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing conversation cache:', error);
    return false;
  }
};
