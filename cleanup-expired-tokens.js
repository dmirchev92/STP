#!/usr/bin/env node

/**
 * Script to clean up expired chat tokens and fix the validation issue
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ServiceTextPro/backend/data/servicetext_pro.db');

async function cleanupExpiredTokens() {
  console.log('🧹 Cleaning up expired chat tokens...');
  console.log('='.repeat(50));
  
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err.message);
      return;
    }
    console.log('✅ Connected to database');
  });

  // First, let's see what we're about to delete
  console.log('\n📊 Checking expired tokens...');
  
  const checkQuery = `
    SELECT 
      token, 
      user_id,
      datetime(created_at, 'localtime') as created,
      datetime(expires_at, 'localtime') as expires,
      (julianday('now') - julianday(expires_at)) * 24 as hours_overdue
    FROM chat_tokens 
    WHERE expires_at < datetime('now')
    ORDER BY expires_at DESC
  `;
  
  db.all(checkQuery, [], (err, expiredTokens) => {
    if (err) {
      console.error('❌ Error checking expired tokens:', err);
      db.close();
      return;
    }
    
    if (expiredTokens.length === 0) {
      console.log('✅ No expired tokens found!');
      db.close();
      return;
    }
    
    console.log(`\n🗑️  Found ${expiredTokens.length} expired tokens to delete:`);
    expiredTokens.forEach((token, i) => {
      const hoursOverdue = Math.floor(token.hours_overdue);
      console.log(`${i+1}. ${token.token} - expired ${token.expires} (${hoursOverdue}h ago)`);
    });
    
    // Now delete them
    console.log('\n🗑️  Deleting expired tokens...');
    
    const deleteQuery = `DELETE FROM chat_tokens WHERE expires_at < datetime('now')`;
    
    db.run(deleteQuery, [], function(err) {
      if (err) {
        console.error('❌ Error deleting expired tokens:', err);
      } else {
        console.log(`✅ Successfully deleted ${this.changes} expired tokens`);
      }
      
      // Verify the cleanup
      console.log('\n🔍 Verifying cleanup...');
      
      db.get(`SELECT COUNT(*) as remaining FROM chat_tokens WHERE expires_at < datetime('now')`, [], (err, result) => {
        if (err) {
          console.error('❌ Error verifying cleanup:', err);
        } else {
          console.log(`📊 Remaining expired tokens: ${result.remaining}`);
          
          if (result.remaining === 0) {
            console.log('✅ All expired tokens successfully cleaned up!');
          } else {
            console.log('⚠️  Some expired tokens still remain - manual intervention needed');
          }
        }
        
        // Show remaining valid tokens
        db.all(`
          SELECT 
            token, 
            datetime(expires_at, 'localtime') as expires,
            (julianday(expires_at) - julianday('now')) * 24 as hours_left
          FROM chat_tokens 
          WHERE expires_at > datetime('now')
          ORDER BY expires_at ASC
        `, [], (err, validTokens) => {
          if (err) {
            console.error('❌ Error checking valid tokens:', err);
          } else if (validTokens.length > 0) {
            console.log(`\n✅ Remaining ${validTokens.length} valid tokens:`);
            validTokens.forEach((token, i) => {
              const hoursLeft = Math.floor(token.hours_left);
              const minutesLeft = Math.floor((token.hours_left - hoursLeft) * 60);
              console.log(`${i+1}. ${token.token} - expires ${token.expires} (${hoursLeft}h ${minutesLeft}m left)`);
            });
          } else {
            console.log('\n📊 No valid tokens remaining');
          }
          
          console.log('\n🎯 Cleanup completed!');
          console.log('\n💡 Recommendations:');
          console.log('1. Implement automatic cleanup job in the backend');
          console.log('2. Run cleanup daily to prevent token accumulation');
          console.log('3. Consider shorter token expiration times (e.g., 12 hours)');
          
          db.close();
        });
      });
    });
  });
}

// Test the specific token validation
async function testTokenValidation(token) {
  console.log(`\n🧪 Testing token validation for: ${token}`);
  
  const db = new sqlite3.Database(DB_PATH);
  
  const validationQuery = `
    SELECT 
      token,
      user_id as userId, 
      expires_at as expiresAt,
      datetime('now') as current_utc,
      expires_at > datetime('now') as is_valid_check,
      used_at IS NULL as not_used_check,
      CASE 
        WHEN expires_at > datetime('now') AND used_at IS NULL THEN 'VALID'
        WHEN expires_at <= datetime('now') THEN 'EXPIRED'
        WHEN used_at IS NOT NULL THEN 'USED'
        ELSE 'UNKNOWN'
      END as validation_result
    FROM chat_tokens 
    WHERE token = ?
  `;
  
  db.get(validationQuery, [token], (err, row) => {
    if (err) {
      console.error('❌ Error validating token:', err);
    } else if (row) {
      console.log('🔍 Token validation details:');
      console.log(`   Token: ${row.token}`);
      console.log(`   Current UTC: ${row.current_utc}`);
      console.log(`   Expires At: ${row.expiresAt}`);
      console.log(`   Is Valid Check: ${row.is_valid_check}`);
      console.log(`   Not Used Check: ${row.not_used_check}`);
      console.log(`   Final Result: ${row.validation_result}`);
      
      if (row.validation_result === 'EXPIRED') {
        console.log('✅ Validation working correctly - token is properly expired');
      } else if (row.validation_result === 'VALID') {
        console.log('⚠️  Token still shows as valid - there may be a timezone issue');
      }
    } else {
      console.log('❌ Token not found');
    }
    
    db.close();
  });
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test-token') && args[1]) {
    await testTokenValidation(args[1]);
  } else {
    await cleanupExpiredTokens();
    
    // Test the specific problematic token
    setTimeout(() => {
      testTokenValidation('HDTK4Z51');
    }, 1000);
  }
}

main().catch(console.error);

