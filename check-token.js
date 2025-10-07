#!/usr/bin/env node

/**
 * Quick script to check token details
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ServiceTextPro/backend/data/servicetext_pro.db');
const TOKEN = process.argv[2] || 'HDTK4Z51';

function checkToken(token) {
  console.log(`🔍 Checking token: ${token}`);
  console.log('='.repeat(50));
  
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
      datetime(created_at, 'localtime') as created_local,
      datetime(expires_at, 'localtime') as expires_local,
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
      console.log(`📅 Created: ${row.created_local} (local time)`);
      console.log(`⏰ Expires: ${row.expires_local} (local time)`);
      console.log(`📊 Status: ${row.status}`);
      console.log(`🎯 Used: ${row.used_at ? row.used_at : 'Not used yet'}`);
      
      if (row.status === 'VALID') {
        const expiresAt = new Date(row.expires_at + 'Z'); // Add Z for UTC
        const now = new Date();
        const timeLeft = expiresAt - now;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        console.log(`⏳ Time remaining: ${hoursLeft}h ${minutesLeft}m`);
      }
    } else {
      console.log('❌ Token not found in database');
    }
    
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      }
    });
  });
}

checkToken(TOKEN);

