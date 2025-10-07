#!/usr/bin/env node

/**
 * Check the user mismatch issue
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');

async function checkUserMismatch() {
  console.log('🔍 Checking User Mismatch Issue');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    const tokenUserId = 'device_1757018569006_jv85050rc';
    const publicId = 'k1N_';
    
    console.log(`\n1️⃣ Checking token user: ${tokenUserId}`);
    await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, email, first_name, last_name, public_id, role
        FROM users 
        WHERE id = ?
      `, [tokenUserId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          console.log('✅ Token user found:');
          console.log(`   ID: ${row.id}`);
          console.log(`   Email: ${row.email || 'NOT SET'}`);
          console.log(`   Name: ${row.first_name || 'NOT SET'} ${row.last_name || 'NOT SET'}`);
          console.log(`   Public ID: ${row.public_id || 'NOT SET'}`);
          console.log(`   Role: ${row.role}`);
        } else {
          console.log('❌ Token user not found in users table');
        }
        
        resolve();
      });
    });
    
    console.log(`\n2️⃣ Checking public ID: ${publicId}`);
    await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, email, first_name, last_name, public_id, role
        FROM users 
        WHERE public_id = ?
      `, [publicId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          console.log('✅ Public ID user found:');
          console.log(`   ID: ${row.id}`);
          console.log(`   Email: ${row.email}`);
          console.log(`   Name: ${row.first_name} ${row.last_name}`);
          console.log(`   Public ID: ${row.public_id}`);
          console.log(`   Role: ${row.role}`);
        } else {
          console.log('❌ Public ID not found');
        }
        
        resolve();
      });
    });
    
    console.log(`\n3️⃣ Valid tokens for token user (${tokenUserId}):`);
    await new Promise((resolve, reject) => {
      db.all(`
        SELECT token, expires_at, used_at,
               (julianday(expires_at) > julianday('now')) as is_valid
        FROM chat_tokens 
        WHERE user_id = ? AND used_at IS NULL
        ORDER BY created_at DESC
      `, [tokenUserId], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (rows.length > 0) {
          rows.forEach((row, index) => {
            const status = row.is_valid ? 'VALID' : 'EXPIRED';
            console.log(`${index + 1}. ${row.token} - ${status}`);
            console.log(`   Expires: ${row.expires_at}`);
          });
        } else {
          console.log('❌ No valid tokens found for this user');
        }
        
        resolve();
      });
    });
    
    console.log('\n🎯 Issue Analysis:');
    console.log('==================');
    console.log('The token belongs to a device user, but you\'re trying to access it');
    console.log('with a different user\'s public ID. This suggests:');
    console.log('1. The SMS was sent for the wrong user, OR');
    console.log('2. The public ID in the URL is wrong, OR');
    console.log('3. There\'s a mismatch in user accounts');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

checkUserMismatch().catch(console.error);

