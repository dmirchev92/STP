#!/usr/bin/env node

/**
 * Debug the timezone issue in token validation
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ServiceTextPro/backend/data/servicetext_pro.db');

function debugTimezoneIssue() {
  console.log('🕐 Debugging Timezone Issue in Token Validation');
  console.log('📍 Location: Sofia, Bulgaria (GMT+3)');
  console.log('='.repeat(60));
  
  const db = new sqlite3.Database(DB_PATH);
  
  // Check how dates are stored and compared
  const debugQuery = `
    SELECT 
      token,
      created_at,
      expires_at,
      datetime('now') as current_utc,
      datetime('now', 'localtime') as current_local,
      
      -- Raw comparison (what the validation uses)
      expires_at > datetime('now') as raw_comparison,
      
      -- Let's see the actual values
      typeof(expires_at) as expires_type,
      length(expires_at) as expires_length,
      
      -- Try different comparison methods
      datetime(expires_at) > datetime('now') as datetime_comparison,
      julianday(expires_at) > julianday('now') as julian_comparison,
      
      -- Calculate the difference in seconds
      (julianday(expires_at) - julianday('now')) * 86400 as seconds_diff
      
    FROM chat_tokens 
    WHERE token = 'HDTK4Z51'
  `;
  
  db.get(debugQuery, [], (err, row) => {
    if (err) {
      console.error('❌ Error:', err);
      db.close();
      return;
    }
    
    if (!row) {
      console.log('❌ Token not found');
      db.close();
      return;
    }
    
    console.log('🔍 Token Storage Analysis:');
    console.log(`   Token: ${row.token}`);
    console.log(`   Created At: ${row.created_at}`);
    console.log(`   Expires At: ${row.expires_at}`);
    console.log(`   Expires Type: ${row.expires_type}`);
    console.log(`   Expires Length: ${row.expires_length}`);
    console.log('');
    
    console.log('🕐 Time Comparison:');
    console.log(`   Current UTC: ${row.current_utc}`);
    console.log(`   Current Local: ${row.current_local}`);
    console.log('');
    
    console.log('🧪 Comparison Results:');
    console.log(`   Raw Comparison (expires_at > datetime('now')): ${row.raw_comparison}`);
    console.log(`   DateTime Comparison: ${row.datetime_comparison}`);
    console.log(`   Julian Day Comparison: ${row.julian_comparison}`);
    console.log(`   Seconds Difference: ${Math.round(row.seconds_diff)} seconds`);
    
    if (row.seconds_diff < 0) {
      const hoursOverdue = Math.abs(row.seconds_diff) / 3600;
      console.log(`   ⚠️  Token is ${Math.round(hoursOverdue)} hours OVERDUE`);
    } else {
      const hoursLeft = row.seconds_diff / 3600;
      console.log(`   ✅ Token has ${Math.round(hoursLeft)} hours LEFT`);
    }
    
    console.log('');
    console.log('🔍 Issue Analysis:');
    
    if (row.expires_at.includes('T') && row.expires_at.includes('Z')) {
      console.log('✅ Expires_at is stored in ISO format with timezone (good)');
    } else {
      console.log('⚠️  Expires_at might be stored without proper timezone info');
    }
    
    if (row.raw_comparison == 1 && row.seconds_diff < 0) {
      console.log('❌ CRITICAL BUG: Database comparison is wrong!');
      console.log('   The token is expired but SQLite thinks it\'s valid');
      console.log('   This is likely due to timezone handling in the comparison');
    }
    
    // Now let's fix this by testing different comparison methods
    console.log('\n🛠️  Testing Fix Methods:');
    
    const fixTestQuery = `
      SELECT 
        -- Current method (buggy)
        expires_at > datetime('now') as current_method,
        
        -- Method 1: Convert expires_at to UTC first
        datetime(expires_at) > datetime('now') as method1,
        
        -- Method 2: Use julianday for more precise comparison
        julianday(expires_at) > julianday('now') as method2,
        
        -- Method 3: Remove timezone and compare as UTC
        datetime(replace(expires_at, 'Z', '')) > datetime('now') as method3,
        
        -- Method 4: Convert both to same format
        datetime(substr(expires_at, 1, 19)) > datetime('now') as method4
        
      FROM chat_tokens 
      WHERE token = 'HDTK4Z51'
    `;
    
    db.get(fixTestQuery, [], (err, fixRow) => {
      if (err) {
        console.error('❌ Error testing fixes:', err);
      } else {
        console.log(`   Current Method: ${fixRow.current_method} (BUGGY)`);
        console.log(`   Method 1 (datetime): ${fixRow.method1}`);
        console.log(`   Method 2 (julianday): ${fixRow.method2}`);
        console.log(`   Method 3 (remove Z): ${fixRow.method3}`);
        console.log(`   Method 4 (substr): ${fixRow.method4}`);
        
        // Find which method gives the correct result (should be 0 for expired)
        const correctResult = row.seconds_diff < 0 ? 0 : 1;
        
        console.log('\n🎯 Recommended Fix:');
        if (fixRow.method2 == correctResult) {
          console.log('✅ Use julianday() comparison - most accurate');
        } else if (fixRow.method3 == correctResult) {
          console.log('✅ Remove timezone indicator before comparison');
        } else if (fixRow.method4 == correctResult) {
          console.log('✅ Use substring to remove timezone info');
        } else {
          console.log('❌ None of the test methods work - need deeper investigation');
        }
      }
      
      db.close();
    });
  });
}

debugTimezoneIssue();
