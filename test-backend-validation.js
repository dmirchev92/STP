#!/usr/bin/env node

/**
 * Test backend token validation directly
 */

const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');
const API_BASE_URL = 'http://192.168.0.129:3000/api/v1';

async function testBackendValidation() {
  console.log('🧪 Testing Backend Token Validation');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    const publicId = 'k1N_';
    const token = 'Q2ODIW10';
    const userId = 'c9b21cdf-542f-41f3-8f39-9be6cda9b2a6';
    
    console.log('\n1️⃣ Verifying token exists in database...');
    const dbToken = await new Promise((resolve, reject) => {
      db.get(`
        SELECT token, user_id, expires_at, used_at,
               julianday('now') as current_time,
               julianday(expires_at) as token_expires,
               (julianday(expires_at) > julianday('now')) as is_valid
        FROM chat_tokens 
        WHERE token = ?
      `, [token], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (dbToken) {
      console.log('✅ Token found in database:');
      console.log(`   Token: ${dbToken.token}`);
      console.log(`   User ID: ${dbToken.user_id}`);
      console.log(`   Expires: ${dbToken.expires_at}`);
      console.log(`   Used: ${dbToken.used_at || 'Not used'}`);
      console.log(`   Valid: ${dbToken.is_valid ? 'YES' : 'NO'}`);
      console.log(`   Current time: ${new Date().toISOString()}`);
    } else {
      console.log('❌ Token not found in database');
      return;
    }
    
    console.log('\n2️⃣ Verifying user and public ID match...');
    const userCheck = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, email, public_id
        FROM users 
        WHERE public_id = ?
      `, [publicId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (userCheck) {
      console.log('✅ Public ID user found:');
      console.log(`   User ID: ${userCheck.id}`);
      console.log(`   Email: ${userCheck.email}`);
      console.log(`   Public ID: ${userCheck.public_id}`);
      
      if (userCheck.id === dbToken.user_id) {
        console.log('✅ User IDs match!');
      } else {
        console.log('❌ User ID mismatch:');
        console.log(`   Token belongs to: ${dbToken.user_id}`);
        console.log(`   Public ID belongs to: ${userCheck.id}`);
      }
    } else {
      console.log('❌ Public ID not found');
    }
    
    console.log('\n3️⃣ Testing backend API endpoint...');
    const apiUrl = `${API_BASE_URL}/chat/public/${publicId}/validate/${token}`;
    console.log(`🔗 Testing URL: ${apiUrl}`);
    
    try {
      const response = await axios.get(apiUrl);
      console.log('✅ Backend API response:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Backend API error:');
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
    
    console.log('\n4️⃣ Testing raw SQL validation query...');
    const rawValidation = await new Promise((resolve, reject) => {
      db.get(`
        SELECT ct.user_id as userId, ct.expires_at as expiresAt
        FROM chat_tokens ct
        JOIN users u ON ct.user_id = u.id
        WHERE ct.token = ? 
          AND u.public_id = ?
          AND julianday(ct.expires_at) > julianday('now')
          AND ct.used_at IS NULL
      `, [token, publicId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (rawValidation) {
      console.log('✅ Raw SQL validation successful:');
      console.log(`   User ID: ${rawValidation.userId}`);
      console.log(`   Expires: ${rawValidation.expiresAt}`);
    } else {
      console.log('❌ Raw SQL validation failed');
      
      // Let's debug why it failed
      console.log('\n🔍 Debugging SQL validation failure...');
      
      // Check each condition separately
      console.log('   Checking token exists...');
      const tokenExists = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM chat_tokens WHERE token = ?', [token], (err, row) => {
          if (err) reject(err);
          else resolve(row.count > 0);
        });
      });
      console.log(`   Token exists: ${tokenExists}`);
      
      console.log('   Checking user join...');
      const userJoin = await new Promise((resolve, reject) => {
        db.get(`
          SELECT COUNT(*) as count 
          FROM chat_tokens ct
          JOIN users u ON ct.user_id = u.id
          WHERE ct.token = ? AND u.public_id = ?
        `, [token, publicId], (err, row) => {
          if (err) reject(err);
          else resolve(row.count > 0);
        });
      });
      console.log(`   User join successful: ${userJoin}`);
      
      console.log('   Checking expiration...');
      const notExpired = await new Promise((resolve, reject) => {
        db.get(`
          SELECT julianday(expires_at) > julianday('now') as valid
          FROM chat_tokens 
          WHERE token = ?
        `, [token], (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.valid : false);
        });
      });
      console.log(`   Not expired: ${notExpired}`);
      
      console.log('   Checking not used...');
      const notUsed = await new Promise((resolve, reject) => {
        db.get(`
          SELECT used_at IS NULL as not_used
          FROM chat_tokens 
          WHERE token = ?
        `, [token], (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.not_used : false);
        });
      });
      console.log(`   Not used: ${notUsed}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    db.close();
  }
}

testBackendValidation().catch(console.error);

