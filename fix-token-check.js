#!/usr/bin/env node

/**
 * Better token checker with proper timezone handling
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ServiceTextPro/backend/data/servicetext_pro.db');
const TOKEN = process.argv[2] || 'HDTK4Z51';

function checkToken(token) {
  console.log(`🔍 Checking token: ${token}`);
  console.log('='.repeat(60));
  
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err.message);
      return;
    }
  });

  const query = `
    SELECT 
      token,
      user_id,
      created_at,
      expires_at,
      used_at,
      datetime('now') as current_time,
      datetime('now', 'localtime') as current_local,
      datetime(created_at, 'localtime') as created_local,
      datetime(expires_at, 'localtime') as expires_local,
      julianday(expires_at) - julianday('now') as days_diff,
      (julianday(expires_at) - julianday('now')) * 24 as hours_diff,
      CASE 
        WHEN expires_at > datetime('now') THEN 'VALID' 
        ELSE 'EXPIRED' 
      END as status
    FROM chat_tokens 
    WHERE token = ?
  `;

  db.get(query, [token], (err, row) => {
    if (err) {
      console.error('❌ Database error:', err);
    } else if (row) {
      console.log('✅ Token found:');
      console.log('');
      console.log(`📋 Token: ${row.token}`);
      console.log(`👤 User ID: ${row.user_id}`);
      console.log('');
      console.log('🕐 Time Information:');
      console.log(`   Current UTC: ${row.current_time}`);
      console.log(`   Current Local: ${row.current_local}`);
      console.log(`   Created Local: ${row.created_local}`);
      console.log(`   Expires Local: ${row.expires_local}`);
      console.log('');
      console.log(`📊 Status: ${row.status}`);
      console.log(`🎯 Used: ${row.used_at ? row.used_at : 'Not used yet'}`);
      
      const hoursDiff = parseFloat(row.hours_diff);
      if (hoursDiff > 0) {
        const hours = Math.floor(hoursDiff);
        const minutes = Math.floor((hoursDiff - hours) * 60);
        console.log(`⏳ Time remaining: ${hours}h ${minutes}m`);
      } else {
        const hoursOverdue = Math.floor(Math.abs(hoursDiff));
        const minutesOverdue = Math.floor((Math.abs(hoursDiff) - hoursOverdue) * 60);
        console.log(`⚠️  OVERDUE by: ${hoursOverdue}h ${minutesOverdue}m`);
        console.log('❌ This token should be EXPIRED but database still shows VALID');
      }
      
    } else {
      console.log('❌ Token not found in database');
    }
    
    // Also check all expired tokens that should be cleaned up
    console.log('\n🧹 Checking for other expired tokens...');
    db.all(`
      SELECT token, datetime(expires_at, 'localtime') as expires_local, 
             (julianday('now') - julianday(expires_at)) * 24 as hours_overdue
      FROM chat_tokens 
      WHERE expires_at < datetime('now')
      ORDER BY expires_at DESC
      LIMIT 10
    `, [], (err, rows) => {
      if (err) {
        console.error('❌ Error checking expired tokens:', err);
      } else if (rows && rows.length > 0) {
        console.log(`\n📊 Found ${rows.length} expired tokens that should be cleaned up:`);
        rows.forEach((expiredRow, i) => {
          const hoursOverdue = Math.floor(expiredRow.hours_overdue);
          console.log(`${i+1}. ${expiredRow.token} - expired ${expiredRow.expires_local} (${hoursOverdue}h ago)`);
        });
        
        console.log('\n💡 These expired tokens should be automatically deleted.');
        console.log('   Consider implementing a cleanup job to remove expired tokens.');
      } else {
        console.log('✅ No expired tokens found - database is clean!');
      }
      
      db.close();
    });
  });
}

checkToken(TOKEN);

