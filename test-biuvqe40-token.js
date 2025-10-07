#!/usr/bin/env node

/**
 * Test token BIUVQE40 directly to see why it's not working
 */

const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');
const API_BASE_URL = 'http://192.168.0.129:3000/api/v1';

async function testBIUVQE40Token() {
  console.log('🧪 Testing Token BIUVQE40 Directly');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    const token = 'BIUVQE40';
    const publicId = 'k1N_';
    const expectedUserId = 'c9b21cdf-542f-41f3-8f39-9be6cda9b2a6';
    
    console.log('\n1️⃣ Database verification...');
    const dbCheck = await new Promise((resolve, reject) => {
      db.get(`
        SELECT ct.token, ct.user_id, ct.expires_at, ct.used_at,
               u.public_id, u.email,
               julianday('now') as current_time,
               julianday(ct.expires_at) as token_expires,
               (julianday(ct.expires_at) > julianday('now')) as is_valid,
               (ct.used_at IS NULL) as is_not_used
        FROM chat_tokens ct
        JOIN users u ON ct.user_id = u.id
        WHERE ct.token = ?
      `, [token], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (dbCheck) {
      console.log('✅ Database check passed:');
      console.log(`   Token: ${dbCheck.token}`);
      console.log(`   User ID: ${dbCheck.user_id}`);
      console.log(`   User Email: ${dbCheck.email}`);
      console.log(`   Public ID: ${dbCheck.public_id}`);
      console.log(`   Expires: ${dbCheck.expires_at}`);
      console.log(`   Used: ${dbCheck.used_at || 'Not used'}`);
      console.log(`   Is Valid (time): ${dbCheck.is_valid ? 'YES' : 'NO'}`);
      console.log(`   Is Not Used: ${dbCheck.is_not_used ? 'YES' : 'NO'}`);
      console.log(`   Overall Valid: ${(dbCheck.is_valid && dbCheck.is_not_used) ? 'YES' : 'NO'}`);
      
      if (dbCheck.public_id !== publicId) {
        console.log(`   ❌ Public ID mismatch! Expected: ${publicId}, Got: ${dbCheck.public_id}`);
      }
      if (dbCheck.user_id !== expectedUserId) {
        console.log(`   ❌ User ID mismatch! Expected: ${expectedUserId}, Got: ${dbCheck.user_id}`);
      }
    } else {
      console.log('❌ Token not found in database with JOIN');
      
      // Try without JOIN
      const tokenOnly = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM chat_tokens WHERE token = ?', [token], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (tokenOnly) {
        console.log('⚠️ Token exists but JOIN failed:');
        console.log(`   Token: ${tokenOnly.token}`);
        console.log(`   User ID: ${tokenOnly.user_id}`);
        console.log(`   This suggests user doesn't exist or JOIN issue`);
      } else {
        console.log('❌ Token doesn\'t exist at all');
        db.close();
        return;
      }
    }
    
    console.log('\n2️⃣ Direct API test...');
    const apiUrl = `${API_BASE_URL}/chat/public/${publicId}/validate/${token}`;
    console.log(`🔗 Testing: ${apiUrl}`);
    
    try {
      const response = await axios.get(apiUrl);
      console.log('✅ API Success:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ API Error:');
      if (error.response) {
        console.log(`   Status: ${error.response.status} ${error.response.statusText}`);
        console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
      } else {
        console.log(`   Network Error: ${error.message}`);
      }
    }
    
    console.log('\n3️⃣ Testing Marketplace frontend URL...');
    const marketplaceUrl = `http://192.168.0.129:3002/u/${publicId}/c/${token}`;
    console.log(`🌐 Marketplace URL: ${marketplaceUrl}`);
    
    try {
      const marketplaceResponse = await axios.get(marketplaceUrl);
      console.log('✅ Marketplace page loads successfully');
      console.log(`   Status: ${marketplaceResponse.status}`);
      console.log(`   Content-Type: ${marketplaceResponse.headers['content-type']}`);
    } catch (marketplaceError) {
      console.log('❌ Marketplace page error:');
      if (marketplaceError.response) {
        console.log(`   Status: ${marketplaceError.response.status} ${marketplaceError.response.statusText}`);
      } else {
        console.log(`   Network Error: ${marketplaceError.message}`);
      }
    }
    
    console.log('\n4️⃣ Backend server status...');
    try {
      const healthResponse = await axios.get('http://192.168.0.129:3000/api/v1/health');
      console.log('✅ Backend server is running');
      console.log(`   Status: ${healthResponse.data.data?.status || 'unknown'}`);
    } catch (healthError) {
      console.log('❌ Backend server issue:', healthError.message);
    }
    
    try {
      const marketplaceHealthResponse = await axios.get('http://192.168.0.129:3002/api/health');
      console.log('✅ Marketplace server is running');
    } catch (marketplaceHealthError) {
      console.log('❌ Marketplace server issue:', marketplaceHealthError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    db.close();
  }
}

testBIUVQE40Token().catch(console.error);

