#!/usr/bin/env node

/**
 * Test script to demonstrate real-time synchronization between mobile app settings and Marketplace
 * This script simulates a service provider updating their profile from the mobile app
 */

const axios = require('axios');

const API_BASE_URL = 'http://192.168.0.129:3000/api/v1';

// Test data for profile update
const testProfileUpdate = {
  userId: 'test-provider-123',
  profile: {
    businessName: 'Майстор Иван - Електротехник',
    serviceCategory: 'electrician',
    description: 'Професионални електротехнически услуги с 15 години опит. Специализирам се в домашни инсталации, ремонт на електрически уреди и монтаж на осветление.',
    experienceYears: 15,
    hourlyRate: 45,
    city: 'София',
    neighborhood: 'Център',
    phoneNumber: '+359888123456',
    email: 'ivan.electrician@example.com',
    profileImageUrl: 'https://example.com/profile.jpg'
  },
  gallery: [
    'https://example.com/gallery1.jpg',
    'https://example.com/gallery2.jpg'
  ],
  certificates: [
    { title: 'Сертификат за електротехник' },
    { title: 'Курс за работа под напрежение' }
  ]
};

async function testRealTimeSync() {
  console.log('🚀 Starting Real-Time Sync Test');
  console.log('=====================================');
  
  try {
    console.log('📱 Simulating mobile app profile update...');
    console.log('Profile data:', JSON.stringify(testProfileUpdate, null, 2));
    
    // Send profile update request (simulating mobile app)
    const response = await axios.post(`${API_BASE_URL}/marketplace/providers/profile`, testProfileUpdate, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Profile update successful!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      console.log('');
      console.log('📡 Real-time update should now be broadcasted to Marketplace clients');
      console.log('');
      console.log('To test this:');
      console.log('1. Open the Marketplace in your browser: http://192.168.0.129:3000/search');
      console.log('2. Open browser developer tools and watch the console');
      console.log('3. Run this script again to see real-time updates');
      console.log('');
      console.log('Expected WebSocket events:');
      console.log('- provider_profile_updated (global)');
      console.log('- provider_profile_updated (location-София)');
      console.log('- provider_profile_updated (location-София-Център)');
      console.log('- provider_profile_updated (category-electrician)');
    } else {
      console.error('❌ Profile update failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure the backend server is running:');
      console.log('   cd ServiceTextPro/backend');
      console.log('   npm start');
    }
  }
}

// Additional test functions
async function testMultipleUpdates() {
  console.log('🔄 Testing multiple rapid updates...');
  
  const updates = [
    { ...testProfileUpdate, profile: { ...testProfileUpdate.profile, hourlyRate: 50 } },
    { ...testProfileUpdate, profile: { ...testProfileUpdate.profile, description: 'Обновено описание - специалист по домашни инсталации' } },
    { ...testProfileUpdate, profile: { ...testProfileUpdate.profile, experienceYears: 16 } }
  ];
  
  for (let i = 0; i < updates.length; i++) {
    console.log(`📱 Update ${i + 1}/3...`);
    try {
      await axios.post(`${API_BASE_URL}/marketplace/providers/profile`, updates[i]);
      console.log(`✅ Update ${i + 1} successful`);
    } catch (error) {
      console.error(`❌ Update ${i + 1} failed:`, error.message);
    }
    
    // Wait 2 seconds between updates
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function testLocationChange() {
  console.log('🏠 Testing location change...');
  
  const locationUpdate = {
    ...testProfileUpdate,
    profile: {
      ...testProfileUpdate.profile,
      city: 'Пловдив',
      neighborhood: 'Тракия'
    }
  };
  
  try {
    await axios.post(`${API_BASE_URL}/marketplace/providers/profile`, locationUpdate);
    console.log('✅ Location change successful - should trigger room changes');
  } catch (error) {
    console.error('❌ Location change failed:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--multiple')) {
    await testMultipleUpdates();
  } else if (args.includes('--location')) {
    await testLocationChange();
  } else {
    await testRealTimeSync();
  }
  
  console.log('');
  console.log('🎯 Test completed! Check the Marketplace for real-time updates.');
}

main().catch(console.error);


