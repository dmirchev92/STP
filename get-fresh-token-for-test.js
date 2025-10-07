#!/usr/bin/env node

/**
 * Generate a fresh token for testing without marking it as used
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');

async function getFreshToken() {
  console.log('🔧 Generating Fresh Token for Testing');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    const authenticatedUserId = 'c9b21cdf-542f-41f3-8f39-9be6cda9b2a6'; // damirchev92@gmail.com
    const publicId = 'k1N_';
    
    console.log('\n1️⃣ Generating fresh token...');
    const newToken = generateShortSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO chat_tokens (token, user_id, expires_at, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [newToken, authenticatedUserId, expiresAt], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log(`✅ Generated fresh token: ${newToken}`);
    console.log(`   User ID: ${authenticatedUserId}`);
    console.log(`   Expires: ${expiresAt}`);
    console.log(`   Status: UNUSED (ready for testing)`);
    
    console.log('\n2️⃣ Verification...');
    const verification = await new Promise((resolve, reject) => {
      db.get(`
        SELECT ct.token, ct.user_id, ct.expires_at, ct.used_at,
               u.public_id, u.email,
               (julianday(ct.expires_at) > julianday('now')) as is_valid,
               (ct.used_at IS NULL) as is_not_used
        FROM chat_tokens ct
        JOIN users u ON ct.user_id = u.id
        WHERE ct.token = ?
      `, [newToken], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (verification) {
      console.log('✅ Verification successful:');
      console.log(`   Token: ${verification.token}`);
      console.log(`   User: ${verification.email}`);
      console.log(`   Public ID: ${verification.public_id}`);
      console.log(`   Valid: ${verification.is_valid ? 'YES' : 'NO'}`);
      console.log(`   Not Used: ${verification.is_not_used ? 'YES' : 'NO'}`);
      console.log(`   Ready: ${(verification.is_valid && verification.is_not_used) ? 'YES' : 'NO'}`);
    }
    
    const chatUrl = `http://192.168.0.129:3002/u/${publicId}/c/${newToken}`;
    console.log('\n🎯 TEST THIS URL:');
    console.log(`   ${chatUrl}`);
    
    console.log('\n💡 Instructions:');
    console.log('===============');
    console.log('1. Open the URL above in your browser');
    console.log('2. This token is fresh and unused');
    console.log('3. It should load the chat page successfully');
    console.log('4. After you use it, it will be marked as used');
    console.log('5. A new token will be generated for next time');
    
    console.log('\n🔍 What to expect:');
    console.log('- Page should load without errors');
    console.log('- You should see provider info (Mama Mia)');
    console.log('- You can fill in customer details and start chat');
    console.log('- Token will be marked as used after validation');
    
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

getFreshToken().catch(console.error);

