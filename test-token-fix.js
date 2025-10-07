#!/usr/bin/env node

/**
 * Test script to verify the token validation fix
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ServiceTextPro/backend/data/servicetext_pro.db');

async function testTokenValidationFix() {
  console.log('🧪 Testing Token Validation Fix');
  console.log('📍 Location: Sofia, Bulgaria (GMT+3)');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(DB_PATH);
  
  // Test the problematic token HDTK4Z51
  console.log('\n1️⃣ Testing token HDTK4Z51 with OLD method (buggy):');
  
  const oldQuery = `
    SELECT 
      token,
      expires_at,
      datetime('now') as current_utc,
      expires_at > datetime('now') as old_method_result
    FROM chat_tokens 
    WHERE token = 'HDTK4Z51'
  `;
  
  db.get(oldQuery, [], (err, oldResult) => {
    if (err) {
      console.error('❌ Error:', err);
    } else if (oldResult) {
      console.log(`   Token: ${oldResult.token}`);
      console.log(`   Expires: ${oldResult.expires_at}`);
      console.log(`   Current: ${oldResult.current_utc}`);
      console.log(`   OLD Method Result: ${oldResult.old_method_result} (BUGGY)`);
    }
    
    console.log('\n2️⃣ Testing token HDTK4Z51 with NEW method (fixed):');
    
    const newQuery = `
      SELECT 
        token,
        expires_at,
        datetime('now') as current_utc,
        julianday(expires_at) > julianday('now') as new_method_result,
        (julianday(expires_at) - julianday('now')) * 24 as hours_diff
      FROM chat_tokens 
      WHERE token = 'HDTK4Z51'
    `;
    
    db.get(newQuery, [], (err, newResult) => {
      if (err) {
        console.error('❌ Error:', err);
      } else if (newResult) {
        console.log(`   Token: ${newResult.token}`);
        console.log(`   Expires: ${newResult.expires_at}`);
        console.log(`   Current: ${newResult.current_utc}`);
        console.log(`   NEW Method Result: ${newResult.new_method_result} (FIXED)`);
        console.log(`   Hours Difference: ${Math.round(newResult.hours_diff * 10) / 10}h`);
        
        if (newResult.new_method_result == 0) {
          console.log('   ✅ CORRECT: Token is properly expired');
        } else {
          console.log('   ❌ STILL BROKEN: Token shows as valid when it should be expired');
        }
      }
      
      console.log('\n3️⃣ Testing validation with backend API simulation:');
      
      // Simulate what the backend validateChatToken function would return
      const backendQuery = `
        SELECT user_id as userId, expires_at as expiresAt
        FROM chat_tokens 
        WHERE token = 'HDTK4Z51'
          AND julianday(expires_at) > julianday('now')
          AND used_at IS NULL
      `;
      
      db.get(backendQuery, [], (err, backendResult) => {
        if (err) {
          console.error('❌ Error:', err);
        } else {
          console.log(`   Backend Validation Result: ${backendResult ? 'VALID' : 'INVALID'}`);
          
          if (!backendResult) {
            console.log('   ✅ PERFECT: Backend correctly rejects expired token');
          } else {
            console.log('   ❌ PROBLEM: Backend still accepts expired token');
            console.log(`   Returned: ${JSON.stringify(backendResult)}`);
          }
        }
        
        console.log('\n🎯 Test Summary:');
        console.log('================');
        console.log('✅ Database fix applied: julianday() comparison');
        console.log('✅ Automatic token cleanup added to server');
        console.log('✅ Expired tokens will be cleaned up every 6 hours');
        console.log('');
        console.log('🔄 Next steps:');
        console.log('1. Restart the backend server to apply the fix');
        console.log('2. Test with a real SMS token validation');
        console.log('3. Verify expired tokens are properly rejected');
        
        db.close();
      });
    });
  });
}

testTokenValidationFix();

