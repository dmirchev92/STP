#!/usr/bin/env node

/**
 * Debug the current token issue
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');

async function debugCurrentToken() {
  console.log('🔍 Debugging Current Token Issue');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Get the most recent tokens
    console.log('\n1️⃣ Most recent tokens in database:');
    await new Promise((resolve, reject) => {
      db.all(`
        SELECT token, user_id, created_at, expires_at, used_at,
               julianday('now') as current_time,
               julianday(expires_at) as token_expires,
               (julianday(expires_at) > julianday('now')) as is_valid
        FROM chat_tokens 
        ORDER BY created_at DESC 
        LIMIT 5
      `, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        rows.forEach((row, index) => {
          const status = row.used_at ? 'USED' : (row.is_valid ? 'VALID' : 'EXPIRED');
          console.log(`${index + 1}. ${row.token} - ${status}`);
          console.log(`   User: ${row.user_id}`);
          console.log(`   Created: ${row.created_at}`);
          console.log(`   Expires: ${row.expires_at}`);
          if (row.used_at) {
            console.log(`   Used: ${row.used_at}`);
          }
          console.log(`   Current time: ${new Date().toISOString()}`);
          console.log('');
        });
        
        resolve();
      });
    });
    
    // Check users with public IDs
    console.log('\n2️⃣ Users with their public IDs:');
    await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, email, first_name, last_name, public_id
        FROM users 
        WHERE role = 'tradesperson'
        ORDER BY created_at DESC
        LIMIT 5
      `, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.email}`);
          console.log(`   User ID: ${row.id}`);
          console.log(`   Public ID: ${row.public_id || 'NOT SET'}`);
          console.log(`   Name: ${row.first_name} ${row.last_name}`);
          console.log('');
        });
        
        resolve();
      });
    });
    
    console.log('\n3️⃣ What token are you trying to use?');
    console.log('Please provide the token and I\'ll check its status.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

debugCurrentToken().catch(console.error);

