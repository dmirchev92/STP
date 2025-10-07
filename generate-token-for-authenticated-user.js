#!/usr/bin/env node

/**
 * Generate a token directly for the authenticated user (damirchev92@gmail.com)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');

async function generateTokenForAuthenticatedUser() {
  console.log('🔧 Generating Token for Authenticated User');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    const userEmail = 'damirchev92@gmail.com';
    const publicId = 'k1N_';
    
    console.log('\n1️⃣ Finding authenticated user...');
    const user = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, email, public_id, first_name, last_name
        FROM users 
        WHERE email = ?
      `, [userEmail], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!user) {
      console.log('❌ User not found:', userEmail);
      return;
    }
    
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Public ID: ${user.public_id}`);
    
    console.log('\n2️⃣ Cleaning up old tokens for this user...');
    await new Promise((resolve, reject) => {
      db.run(`
        DELETE FROM chat_tokens 
        WHERE user_id = ?
      `, [user.id], function(err) {
        if (err) reject(err);
        else {
          console.log(`✅ Deleted ${this.changes} old tokens`);
          resolve();
        }
      });
    });
    
    console.log('\n3️⃣ Generating new token...');
    const newToken = generateShortSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO chat_tokens (token, user_id, expires_at, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [newToken, user.id, expiresAt], function(err) {
        if (err) reject(err);
        else {
          console.log(`✅ Created token: ${newToken}`);
          resolve();
        }
      });
    });
    
    console.log('\n4️⃣ Verifying token...');
    const verification = await new Promise((resolve, reject) => {
      db.get(`
        SELECT ct.token, ct.user_id, ct.expires_at, ct.used_at,
               u.public_id,
               (julianday(ct.expires_at) > julianday('now')) as is_valid,
               (ct.used_at IS NULL) as is_not_used
        FROM chat_tokens ct
        JOIN users u ON ct.user_id = u.id
        WHERE ct.token = ? AND u.public_id = ?
      `, [newToken, publicId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (verification) {
      console.log('✅ Token verification successful:');
      console.log(`   Token: ${verification.token}`);
      console.log(`   User ID: ${verification.user_id}`);
      console.log(`   Public ID: ${verification.public_id}`);
      console.log(`   Expires: ${verification.expires_at}`);
      console.log(`   Is Valid: ${verification.is_valid ? 'YES' : 'NO'}`);
      console.log(`   Is Not Used: ${verification.is_not_used ? 'YES' : 'NO'}`);
      
      const chatUrl = `http://192.168.0.129:3002/u/${publicId}/c/${newToken}`;
      console.log('\n🎯 SUCCESS! Use this URL:');
      console.log(`   ${chatUrl}`);
      
      console.log('\n💡 This token should work because:');
      console.log('   ✅ Token belongs to authenticated user');
      console.log('   ✅ User ID matches public ID');
      console.log('   ✅ Token is not used');
      console.log('   ✅ Token is not expired');
      console.log('   ✅ All validation criteria met');
      
    } else {
      console.log('❌ Token verification failed');
    }
    
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

generateTokenForAuthenticatedUser().catch(console.error);

