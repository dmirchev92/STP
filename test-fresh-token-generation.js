#!/usr/bin/env node

/**
 * Test script to verify fresh token generation for each missed call
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ServiceTextPro/backend/data/servicetext_pro.db');

async function testFreshTokenGeneration() {
  console.log('🧪 Testing Fresh Token Generation for Missed Calls');
  console.log('📍 Location: Sofia, Bulgaria (GMT+3)');
  console.log('='.repeat(60));
  
  const db = new sqlite3.Database(DB_PATH);
  
  // Show current tokens in the system
  console.log('\n1️⃣ Current tokens in database:');
  
  const currentTokensQuery = `
    SELECT 
      token,
      user_id,
      datetime(created_at, 'localtime') as created_local,
      datetime(expires_at, 'localtime') as expires_local,
      used_at,
      CASE 
        WHEN julianday(expires_at) > julianday('now') AND used_at IS NULL THEN 'VALID'
        WHEN julianday(expires_at) <= julianday('now') THEN 'EXPIRED' 
        WHEN used_at IS NOT NULL THEN 'USED'
        ELSE 'UNKNOWN'
      END as status
    FROM chat_tokens 
    ORDER BY created_at DESC
    LIMIT 10
  `;
  
  db.all(currentTokensQuery, [], (err, tokens) => {
    if (err) {
      console.error('❌ Error fetching tokens:', err);
    } else {
      console.log(`📊 Found ${tokens.length} recent tokens:`);
      tokens.forEach((token, i) => {
        console.log(`${i+1}. ${token.token} | User: ${token.user_id} | Status: ${token.status}`);
        console.log(`   Created: ${token.created_local} | Expires: ${token.expires_local}`);
        if (token.used_at) console.log(`   Used: ${token.used_at}`);
        console.log('');
      });
    }
    
    console.log('🎯 Expected Behavior After Changes:');
    console.log('=====================================');
    console.log('✅ Each missed call will generate a FRESH token');
    console.log('✅ Old tokens remain valid for their 24-hour period');
    console.log('✅ Multiple customers can have different active tokens');
    console.log('✅ No token reuse between different missed calls');
    console.log('');
    console.log('🔄 What happens now:');
    console.log('1. Customer A calls → missed → gets Token ABC123 (expires in 24h)');
    console.log('2. Customer B calls → missed → gets Token XYZ789 (expires in 24h)');
    console.log('3. Customer A can still use ABC123 if within 24h');
    console.log('4. Customer B can use XYZ789 independently');
    console.log('');
    console.log('🛡️  Security Benefits:');
    console.log('• Each customer gets a unique token');
    console.log('• No token sharing between customers');
    console.log('• Tokens still expire after 24 hours');
    console.log('• Used tokens are marked to prevent reuse');
    console.log('');
    console.log('📱 To test this:');
    console.log('1. Restart the mobile app to apply changes');
    console.log('2. Simulate multiple missed calls');
    console.log('3. Check that each SMS gets a different token');
    console.log('4. Verify all tokens work independently');
    
    db.close();
  });
}

testFreshTokenGeneration();

