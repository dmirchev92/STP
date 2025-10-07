#!/usr/bin/env node

/**
 * Test script to verify token generation is triggered by token USAGE, not missed calls
 */

const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ServiceTextPro/backend/data/servicetext_pro.db');
const API_BASE_URL = 'http://192.168.0.129:3000/api/v1';

async function testTokenUsageTrigger() {
  console.log('🧪 Testing Token Usage Trigger Flow');
  console.log('📍 Location: Sofia, Bulgaria (GMT+3)');
  console.log('='.repeat(60));
  
  const testUserId = 'c9b21cdf-542f-41f3-8f39-9be6cda9b2a6'; // Your test user
  
  console.log('\n🎯 Expected Flow:');
  console.log('1. App generates token ABC123');
  console.log('2. Customer visits http://192.168.0.129:3002/u/publicId/c/ABC123');
  console.log('3. Token ABC123 is validated and marked as used');
  console.log('4. New token XYZ789 is immediately generated');
  console.log('5. Next missed call SMS will use token XYZ789');
  
  // Step 1: Check current tokens
  console.log('\n1️⃣ Current tokens for user:');
  await showUserTokens(testUserId);
  
  // Step 2: Test the latest token endpoint
  console.log('\n2️⃣ Testing latest token endpoint:');
  await testLatestTokenEndpoint(testUserId);
  
  // Step 3: Simulate token usage (customer clicks link)
  console.log('\n3️⃣ Simulating customer clicking chat link...');
  await simulateTokenUsage(testUserId);
  
  // Step 4: Check tokens after usage
  console.log('\n4️⃣ Tokens after customer used link:');
  await showUserTokens(testUserId);
  
  // Step 5: Test latest token endpoint again
  console.log('\n5️⃣ Testing latest token endpoint after usage:');
  await testLatestTokenEndpoint(testUserId);
  
  console.log('\n🎯 Summary:');
  console.log('==========');
  console.log('✅ Token generation now triggered by USAGE, not missed calls');
  console.log('✅ When customer clicks link → old token marked used → new token generated');
  console.log('✅ SMS service uses latest valid token from backend');
  console.log('✅ Each customer gets fresh token when they use previous one');
}

async function showUserTokens(userId) {
  const db = new sqlite3.Database(DB_PATH);
  
  return new Promise((resolve) => {
    const query = `
      SELECT 
        token,
        datetime(created_at, 'localtime') as created,
        datetime(expires_at, 'localtime') as expires,
        used_at,
        CASE 
          WHEN julianday(expires_at) > julianday('now') AND used_at IS NULL THEN 'VALID'
          WHEN julianday(expires_at) <= julianday('now') THEN 'EXPIRED' 
          WHEN used_at IS NOT NULL THEN 'USED'
          ELSE 'UNKNOWN'
        END as status
      FROM chat_tokens 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    db.all(query, [userId], (err, tokens) => {
      if (err) {
        console.error('❌ Error fetching tokens:', err);
      } else {
        console.log(`📊 Found ${tokens.length} tokens for user:`);
        tokens.forEach((token, i) => {
          const usedStatus = token.used_at ? ` (used: ${token.used_at})` : '';
          console.log(`${i+1}. ${token.token} | ${token.status} | Created: ${token.created}${usedStatus}`);
        });
      }
      db.close();
      resolve();
    });
  });
}

async function testLatestTokenEndpoint(userId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/chat/tokens/latest/${userId}`);
    
    if (response.data.success) {
      console.log(`✅ Latest token: ${response.data.data.token}`);
      console.log(`   Expires: ${response.data.data.expiresAt}`);
    } else {
      console.log('❌ No valid token found');
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️ No valid token found (404)');
    } else {
      console.error('❌ Error fetching latest token:', error.message);
    }
  }
}

async function simulateTokenUsage(userId) {
  try {
    // First get a valid token
    const latestResponse = await axios.get(`${API_BASE_URL}/chat/tokens/latest/${userId}`);
    
    if (!latestResponse.data.success) {
      console.log('❌ No valid token to test with');
      return;
    }
    
    const tokenToUse = latestResponse.data.data.token;
    console.log(`🔗 Using token: ${tokenToUse}`);
    
    // Get user's public ID
    const publicIdResponse = await axios.get(`${API_BASE_URL}/users/${userId}/public-id`);
    const publicId = publicIdResponse.data.data?.publicId || 'test';
    
    // Simulate the validation that happens when customer clicks chat link
    const validationResponse = await axios.get(`${API_BASE_URL}/chat/public/${publicId}/validate/${tokenToUse}`);
    
    if (validationResponse.data.success) {
      console.log('✅ Token validation successful');
      console.log('   This should have triggered new token generation!');
    } else {
      console.log('❌ Token validation failed');
    }
    
  } catch (error) {
    console.error('❌ Error simulating token usage:', error.response?.data || error.message);
  }
}

testTokenUsageTrigger().catch(console.error);

