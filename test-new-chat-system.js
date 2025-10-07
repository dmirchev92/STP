#!/usr/bin/env node

/**
 * Test script for the new chat token system
 * Tests token generation, validation, and lifecycle management
 */

const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');
const API_BASE = 'http://192.168.0.129:3000/api/v1';
const MARKETPLACE_BASE = 'http://192.168.0.129:3002';

async function testNewChatSystem() {
  console.log('🧪 Testing New Chat Token System');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Test user (you can replace with actual user ID)
    const testUserId = 'c9b21cdf-542f-41f3-8f39-9be6cda9b2a6';
    
    console.log('\n1️⃣ Creating database tables...');
    await createTables(db);
    
    console.log('\n2️⃣ Testing token initialization...');
    const initResult = await testTokenInitialization(testUserId);
    
    console.log('\n3️⃣ Testing SMS template generation...');
    await testSMSGeneration(testUserId);
    
    console.log('\n4️⃣ Testing token validation...');
    await testTokenValidation(initResult.spIdentifier, initResult.currentToken);
    
    console.log('\n5️⃣ Testing marketplace page...');
    await testMarketplacePage(initResult.spIdentifier, initResult.currentToken);
    
    console.log('\n6️⃣ Testing token stats...');
    await testTokenStats(testUserId);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    db.close();
  }
}

async function createTables(db) {
  const sql = `
    -- Service Provider Identifiers Table
    CREATE TABLE IF NOT EXISTS service_provider_identifiers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        identifier TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Chat Tokens Table
    CREATE TABLE IF NOT EXISTS chat_tokens (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        sp_identifier TEXT NOT NULL,
        is_used INTEGER DEFAULT 0,
        used_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        conversation_id TEXT NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_sp_identifiers_user_id ON service_provider_identifiers(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_tokens_user_id ON chat_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_tokens_unused ON chat_tokens(user_id, is_used, expires_at);
  `;
  
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        console.error('❌ Failed to create tables:', err);
        reject(err);
      } else {
        console.log('✅ Database tables created/verified');
        resolve();
      }
    });
  });
}

async function testTokenInitialization(userId) {
  try {
    const response = await axios.post(`${API_BASE}/chat/tokens/initialize`, {}, {
      headers: {
        'Authorization': `Bearer test-token-${userId}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Token initialization successful:');
      console.log(`   SP Identifier: ${response.data.data.spIdentifier}`);
      console.log(`   Current Token: ${response.data.data.currentToken}`);
      console.log(`   Chat URL: ${response.data.data.chatUrl}`);
      
      return {
        spIdentifier: response.data.data.spIdentifier,
        currentToken: response.data.data.currentToken,
        chatUrl: response.data.data.chatUrl
      };
    } else {
      throw new Error('Token initialization failed: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error('❌ Token initialization failed:', error.message);
    throw error;
  }
}

async function testSMSGeneration(userId) {
  try {
    const response = await axios.get(`${API_BASE}/chat/url?baseUrl=${MARKETPLACE_BASE}`, {
      headers: {
        'Authorization': `Bearer test-token-${userId}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ SMS URL generation successful:');
      console.log(`   Chat URL: ${response.data.data.chatUrl}`);
      
      // Test SMS template content
      const smsContent = `Здравейте! Видях пропуснатото Ви обаждане. Моля, опишете проблема тук: ${response.data.data.chatUrl}

С уважение,
Иван Дамирчев
Електротехник с лиценз`;
      
      console.log('✅ Sample SMS content:');
      console.log(smsContent);
      
      return response.data.data.chatUrl;
    } else {
      throw new Error('SMS generation failed: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error('❌ SMS generation failed:', error.message);
    throw error;
  }
}

async function testTokenValidation(spIdentifier, token) {
  try {
    const response = await axios.get(`${API_BASE}/chat/public/${spIdentifier}/validate/${token}`);

    if (response.data.success) {
      console.log('✅ Token validation successful:');
      console.log(`   Valid: ${response.data.data.valid}`);
      console.log(`   User ID: ${response.data.data.userId}`);
      console.log(`   Conversation ID: ${response.data.data.conversationId}`);
      
      return {
        userId: response.data.data.userId,
        conversationId: response.data.data.conversationId
      };
    } else {
      throw new Error('Token validation failed: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error('❌ Token validation failed:', error.message);
    throw error;
  }
}

async function testMarketplacePage(spIdentifier, token) {
  try {
    const url = `${MARKETPLACE_BASE}/u/${spIdentifier}/c/${token}`;
    console.log(`🌐 Testing marketplace page: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    });
    
    console.log(`✅ Marketplace page response:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    
    if (response.status === 200) {
      console.log('   ✅ Page loaded successfully');
    } else {
      console.log(`   ⚠️ Page returned status ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Marketplace page test failed:', error.message);
    throw error;
  }
}

async function testTokenStats(userId) {
  try {
    const response = await axios.get(`${API_BASE}/chat/tokens/stats`, {
      headers: {
        'Authorization': `Bearer test-token-${userId}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Token stats retrieved:');
      const stats = response.data.data.stats;
      console.log(`   Total Generated: ${stats.totalGenerated}`);
      console.log(`   Current Unused: ${stats.currentUnused}`);
      console.log(`   Total Used: ${stats.totalUsed}`);
      console.log(`   Total Expired: ${stats.totalExpired}`);
    } else {
      throw new Error('Token stats failed: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error('❌ Token stats failed:', error.message);
    throw error;
  }
}

// Run the test
testNewChatSystem().catch(console.error);
