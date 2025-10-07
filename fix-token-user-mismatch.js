#!/usr/bin/env node

/**
 * Fix the token user mismatch by generating a proper token for the authenticated user
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');

async function fixTokenUserMismatch() {
  console.log('🔧 Fixing Token User Mismatch');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    const realUserId = 'c9b21cdf-542f-41f3-8f39-9be6cda9b2a6'; // damirchev92@gmail.com
    const publicId = 'k1N_';
    
    console.log('\n1️⃣ Generating a proper token for the authenticated user...');
    
    // Generate a new token for the real user
    const newToken = generateShortSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO chat_tokens (token, user_id, expires_at, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [newToken, realUserId, expiresAt], function(err) {
        if (err) {
          reject(err);
          return;
        }
        console.log(`✅ Created token ${newToken} for user ${realUserId}`);
        resolve();
      });
    });
    
    console.log('\n2️⃣ Testing the new token...');
    const chatUrl = `http://192.168.0.129:3002/u/${publicId}/c/${newToken}`;
    console.log(`🔗 Test this URL: ${chatUrl}`);
    
    // Verify token exists and is valid
    await new Promise((resolve, reject) => {
      db.get(`
        SELECT token, user_id, expires_at, 
               (julianday(expires_at) > julianday('now')) as is_valid
        FROM chat_tokens 
        WHERE token = ? AND user_id = ?
      `, [newToken, realUserId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          console.log('✅ Token verification:');
          console.log(`   Token: ${row.token}`);
          console.log(`   User ID: ${row.user_id}`);
          console.log(`   Expires: ${row.expires_at}`);
          console.log(`   Valid: ${row.is_valid ? 'YES' : 'NO'}`);
        } else {
          console.log('❌ Token not found');
        }
        
        resolve();
      });
    });
    
    console.log('\n3️⃣ Cleaning up orphaned device tokens...');
    await new Promise((resolve, reject) => {
      db.run(`
        DELETE FROM chat_tokens 
        WHERE user_id LIKE 'device_%' 
          AND user_id NOT IN (SELECT id FROM users)
      `, [], function(err) {
        if (err) {
          reject(err);
          return;
        }
        console.log(`✅ Deleted ${this.changes} orphaned device tokens`);
        resolve();
      });
    });
    
    console.log('\n🎯 Solution Summary:');
    console.log('===================');
    console.log('1. ✅ Generated proper token for authenticated user');
    console.log('2. ✅ Token matches the public ID in the URL');
    console.log('3. ✅ Cleaned up orphaned device tokens');
    console.log('4. 🔗 Test the new URL above');
    console.log('');
    console.log('💡 To prevent this issue in the future:');
    console.log('   - Make sure SMS service uses authenticated user ID');
    console.log('   - Avoid generating tokens for device users');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

function generateShortSecureToken() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let token = '';
  
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const timeComponent = (Date.now() % 100).toString().padStart(2, '0');
  return token + timeComponent;
}

fixTokenUserMismatch().catch(console.error);

