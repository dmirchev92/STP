#!/usr/bin/env node

/**
 * Debug token NATVD361 specifically
 */

const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');
const API_BASE_URL = 'http://192.168.0.129:3000/api/v1';

async function debugTokenNATVD361() {
  console.log('🔍 Debugging Token NATVD361');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    const token = 'NATVD361';
    const publicId = 'k1N_';
    
    console.log('\n1️⃣ Checking if token exists in database...');
    const tokenData = await new Promise((resolve, reject) => {
      db.get(`
        SELECT token, user_id, created_at, expires_at, used_at,
               julianday('now') as current_time,
               julianday(expires_at) as token_expires,
               (julianday(expires_at) > julianday('now')) as is_valid,
               (used_at IS NULL) as is_not_used
        FROM chat_tokens 
        WHERE token = ?
      `, [token], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (tokenData) {
      console.log('✅ Token found in database:');
      console.log(`   Token: ${tokenData.token}`);
      console.log(`   User ID: ${tokenData.user_id}`);
      console.log(`   Created: ${tokenData.created_at}`);
      console.log(`   Expires: ${tokenData.expires_at}`);
      console.log(`   Used At: ${tokenData.used_at || 'NOT USED'}`);
      console.log(`   Is Valid (time): ${tokenData.is_valid ? 'YES' : 'NO'}`);
      console.log(`   Is Not Used: ${tokenData.is_not_used ? 'YES' : 'NO'}`);
      console.log(`   Overall Valid: ${(tokenData.is_valid && tokenData.is_not_used) ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ Token NOT found in database!');
      console.log('   This explains the 404 error.');
      
      // Check recent tokens
      console.log('\n📊 Recent tokens in database:');
      const recentTokens = await new Promise((resolve, reject) => {
        db.all(`
          SELECT token, user_id, created_at, expires_at, used_at,
                 (julianday(expires_at) > julianday('now')) as is_valid,
                 (used_at IS NULL) as is_not_used
          FROM chat_tokens 
          ORDER BY created_at DESC 
          LIMIT 10
        `, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      recentTokens.forEach((row, index) => {
        const status = row.used_at ? 'USED' : (row.is_valid ? 'VALID' : 'EXPIRED');
        console.log(`${index + 1}. ${row.token} - ${status} (${row.user_id.substring(0, 8)}...)`);
        console.log(`   Created: ${row.created_at}`);
        if (row.is_valid && !row.used_at) {
          console.log(`   🎯 This token is VALID: http://192.168.0.129:3002/u/k1N_/c/${row.token}`);
        }
        console.log('');
      });
      
      db.close();
      return;
    }
    
    console.log('\n2️⃣ Checking user and public ID relationship...');
    const userCheck = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, email, public_id
        FROM users 
        WHERE id = ?
      `, [tokenData.user_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (userCheck) {
      console.log('✅ Token user found:');
      console.log(`   User ID: ${userCheck.id}`);
      console.log(`   Email: ${userCheck.email}`);
      console.log(`   Public ID: ${userCheck.public_id}`);
      
      if (userCheck.public_id === publicId) {
        console.log('✅ Public ID matches!');
      } else {
        console.log('❌ Public ID mismatch:');
        console.log(`   Expected: ${publicId}`);
        console.log(`   Actual: ${userCheck.public_id}`);
      }
    } else {
      console.log('❌ Token user not found in users table');
    }
    
    console.log('\n3️⃣ Testing backend API directly...');
    const apiUrl = `${API_BASE_URL}/chat/public/${publicId}/validate/${token}`;
    console.log(`🔗 API URL: ${apiUrl}`);
    
    try {
      const response = await axios.get(apiUrl);
      console.log('✅ Backend API Success:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Backend API Error:');
      if (error.response) {
        console.log(`   Status: ${error.response.status} ${error.response.statusText}`);
        console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
        
        if (error.response.status === 404) {
          console.log('\n💡 404 Error Analysis:');
          console.log('   - This suggests the API endpoint doesn\'t exist');
          console.log('   - Or the route pattern doesn\'t match');
          console.log('   - Let\'s check if the backend server is running the right routes');
        }
      } else {
        console.log(`   Network Error: ${error.message}`);
      }
    }
    
    console.log('\n4️⃣ Testing basic backend connectivity...');
    try {
      const healthResponse = await axios.get(`http://192.168.0.129:3000/api/v1/health`);
      console.log('✅ Backend health check passed');
    } catch (error) {
      console.log('❌ Backend health check failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    db.close();
  }
}

debugTokenNATVD361().catch(console.error);

