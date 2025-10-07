#!/usr/bin/env node

/**
 * Debug script to check why business name is not updating in Marketplace
 */

const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ServiceTextPro/backend/data/servicetext_pro.db');
const API_BASE_URL = 'http://192.168.0.129:3000/api/v1';

async function debugNameUpdate() {
  console.log('🔍 Debugging Business Name Update Issue');
  console.log('=====================================');
  
  const email = 'damirchev92@gmail.com';
  
  // Step 1: Check current database state
  console.log('\n1️⃣ Checking current database state...');
  await checkDatabaseState(email);
  
  // Step 2: Simulate a profile update
  console.log('\n2️⃣ Simulating profile update...');
  await simulateProfileUpdate(email);
  
  // Step 3: Check database after update
  console.log('\n3️⃣ Checking database after update...');
  await checkDatabaseState(email);
  
  // Step 4: Test Marketplace API
  console.log('\n4️⃣ Testing Marketplace search API...');
  await testMarketplaceAPI();
}

function checkDatabaseState(email) {
  return new Promise((resolve) => {
    const db = new sqlite3.Database(DB_PATH);
    
    db.get(
      `SELECT u.id, u.email, u.first_name, u.last_name, 
              spp.business_name, spp.service_category, spp.city, 
              spp.is_active, spp.updated_at
       FROM users u 
       LEFT JOIN service_provider_profiles spp ON u.id = spp.user_id 
       WHERE u.email = ?`,
      [email],
      (err, row) => {
        if (err) {
          console.error('❌ Database error:', err);
        } else if (row) {
          console.log('📊 Database state:', {
            userId: row.id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            businessName: row.business_name,
            serviceCategory: row.service_category,
            city: row.city,
            isActive: row.is_active,
            lastUpdated: row.updated_at
          });
        } else {
          console.log('❌ User not found in database');
        }
        
        db.close();
        resolve();
      }
    );
  });
}

async function simulateProfileUpdate(email) {
  try {
    // First get the user ID
    const db = new sqlite3.Database(DB_PATH);
    
    const userId = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM users WHERE email = ?`,
        [email],
        (err, row) => {
          db.close();
          if (err) reject(err);
          else resolve(row?.id);
        }
      );
    });
    
    if (!userId) {
      console.log('❌ Cannot simulate update - user ID not found');
      return;
    }
    
    const testBusinessName = `Test Business ${Date.now()}`;
    console.log(`📱 Updating business name to: "${testBusinessName}"`);
    
    const updateData = {
      userId: userId,
      profile: {
        businessName: testBusinessName,
        serviceCategory: 'electrician',
        description: 'Test description',
        experienceYears: 5,
        hourlyRate: 50,
        city: 'София',
        neighborhood: 'Център',
        phoneNumber: '+359888123456',
        email: 'test@example.com'
      }
    };
    
    const response = await axios.post(`${API_BASE_URL}/marketplace/providers/profile`, updateData, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data.success) {
      console.log('✅ Profile update API call successful');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('❌ Profile update failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error during profile update:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

async function testMarketplaceAPI() {
  try {
    console.log('🔍 Testing marketplace search API...');
    
    const response = await axios.get(`${API_BASE_URL}/marketplace/providers/search`, {
      params: { limit: 10 }
    });
    
    if (response.data.success) {
      const providers = response.data.data;
      console.log(`✅ Marketplace API returned ${providers.length} providers`);
      
      // Find our test user
      const testUser = providers.find(p => p.email === 'damirchev92@gmail.com');
      if (testUser) {
        console.log('✅ Test user found in marketplace results:', {
          id: testUser.id,
          email: testUser.email,
          businessName: testUser.businessName,
          isActive: testUser.isActive
        });
      } else {
        console.log('❌ Test user NOT found in marketplace results');
        console.log('Available providers:');
        providers.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.email} - ${p.businessName} (Active: ${p.isActive})`);
        });
      }
    } else {
      console.log('❌ Marketplace API failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Marketplace API error:', {
      message: error.message,
      status: error.response?.status
    });
  }
}

// Check WebSocket connection
async function checkWebSocketStatus() {
  console.log('\n5️⃣ Checking WebSocket status...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    if (response.data) {
      console.log('✅ Backend server is running');
    }
  } catch (error) {
    console.error('❌ Backend server not accessible:', error.message);
  }
  
  console.log('💡 To test WebSocket real-time updates:');
  console.log('1. Open Marketplace in browser: http://localhost:3002/search');
  console.log('2. Open browser dev tools console');
  console.log('3. Look for WebSocket connection messages');
  console.log('4. Update profile from mobile app');
  console.log('5. Check if "provider_profile_updated" event is received');
}

// Main execution
async function main() {
  await debugNameUpdate();
  await checkWebSocketStatus();
  
  console.log('\n🎯 Debug Summary:');
  console.log('================');
  console.log('1. Check if database update worked');
  console.log('2. Check if Marketplace API returns updated data');
  console.log('3. Check if WebSocket events are being sent');
  console.log('4. Check if Marketplace frontend receives updates');
}

main().catch(console.error);


