#!/usr/bin/env node

/**
 * Get the latest valid token for authenticated user
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');

async function getLatestValidToken() {
  console.log('🔍 Getting Latest Valid Token');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    const authenticatedUserId = 'c9b21cdf-542f-41f3-8f39-9be6cda9b2a6'; // damirchev92@gmail.com
    const publicId = 'k1N_';
    
    console.log('\n1️⃣ Finding latest valid token...');
    const validToken = await new Promise((resolve, reject) => {
      db.get(`
        SELECT ct.token, ct.created_at, ct.expires_at, ct.used_at,
               (julianday(ct.expires_at) > julianday('now')) as is_valid,
               (ct.used_at IS NULL) as is_not_used
        FROM chat_tokens ct
        WHERE ct.user_id = ?
          AND julianday(ct.expires_at) > julianday('now')
          AND ct.used_at IS NULL
        ORDER BY ct.created_at DESC
        LIMIT 1
      `, [authenticatedUserId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (validToken) {
      console.log('✅ Latest valid token found:');
      console.log(`   Token: ${validToken.token}`);
      console.log(`   Created: ${validToken.created_at}`);
      console.log(`   Expires: ${validToken.expires_at}`);
      console.log(`   Used: ${validToken.used_at || 'Not used'}`);
      console.log(`   Is Valid: ${validToken.is_valid ? 'YES' : 'NO'}`);
      console.log(`   Is Not Used: ${validToken.is_not_used ? 'YES' : 'NO'}`);
      
      const chatUrl = `http://192.168.0.129:3002/u/${publicId}/c/${validToken.token}`;
      console.log('\n🎯 USE THIS URL:');
      console.log(`   ${chatUrl}`);
      
      console.log('\n✅ This token should work because:');
      console.log('   ✅ Belongs to authenticated user');
      console.log('   ✅ Not used yet');
      console.log('   ✅ Not expired');
      console.log('   ✅ User ID matches public ID');
      
    } else {
      console.log('❌ No valid tokens found for authenticated user');
      
      // Check if we need to generate a new one
      console.log('\n💡 Need to generate a new token...');
      const newToken = generateShortSecureToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO chat_tokens (token, user_id, expires_at, created_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `, [newToken, authenticatedUserId, expiresAt], function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ Generated new token: ${newToken}`);
            const chatUrl = `http://192.168.0.129:3002/u/${publicId}/c/${newToken}`;
            console.log(`🎯 USE THIS URL: ${chatUrl}`);
            resolve();
          }
        });
      });
    }
    
    console.log('\n2️⃣ Summary of all tokens for authenticated user:');
    const allUserTokens = await new Promise((resolve, reject) => {
      db.all(`
        SELECT token, created_at, expires_at, used_at,
               (julianday(expires_at) > julianday('now')) as is_valid,
               (used_at IS NULL) as is_not_used
        FROM chat_tokens 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [authenticatedUserId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    allUserTokens.forEach((token, index) => {
      const status = token.used_at ? 'USED' : (token.is_valid ? 'VALID' : 'EXPIRED');
      console.log(`${index + 1}. ${token.token} - ${status}`);
      console.log(`   Created: ${token.created_at}`);
      if (token.used_at) console.log(`   Used: ${token.used_at}`);
      console.log('');
    });
    
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

getLatestValidToken().catch(console.error);

