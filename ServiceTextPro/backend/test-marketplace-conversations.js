// Test script to check marketplace conversations in database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'servicetext_pro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking marketplace conversations...\n');

// Check marketplace_conversations table
db.all(`SELECT * FROM marketplace_conversations ORDER BY created_at DESC LIMIT 5`, (err, rows) => {
  if (err) {
    console.error('❌ Error querying marketplace_conversations:', err);
    return;
  }
  
  console.log('📋 Recent marketplace conversations:');
  if (rows.length === 0) {
    console.log('   No marketplace conversations found');
  } else {
    rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ID: ${row.id}`);
      console.log(`      Provider: ${row.provider_id}`);
      console.log(`      Customer: ${row.customer_name || 'Unknown'}`);
      console.log(`      Status: ${row.status}`);
      console.log(`      Created: ${row.created_at}`);
      console.log(`      Last Message: ${row.last_message_at}`);
      console.log('');
    });
  }
  
  // Check messages for these conversations
  db.all(`SELECT * FROM marketplace_chat_messages ORDER BY sent_at DESC LIMIT 5`, (err, messages) => {
    if (err) {
      console.error('❌ Error querying marketplace_chat_messages:', err);
      return;
    }
    
    console.log('💬 Recent marketplace messages:');
    if (messages.length === 0) {
      console.log('   No marketplace messages found');
    } else {
      messages.forEach((msg, index) => {
        console.log(`   ${index + 1}. Conversation: ${msg.conversation_id}`);
        console.log(`      From: ${msg.sender_name} (${msg.sender_type})`);
        console.log(`      Message: ${msg.message.substring(0, 50)}...`);
        console.log(`      Sent: ${msg.sent_at}`);
        console.log('');
      });
    }
    
    // Check users table for SP info
    db.get(`SELECT * FROM users WHERE role = 'tradesperson' ORDER BY created_at DESC LIMIT 1`, (err, user) => {
      if (err) {
        console.error('❌ Error querying users:', err);
        return;
      }
      
      console.log('👤 Current SP user:');
      if (user) {
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Email: ${user.email}`);
        
        // Check service provider profile
        db.get(`SELECT * FROM service_provider_profiles WHERE user_id = ?`, [user.id], (err, profile) => {
          if (err) {
            console.error('❌ Error querying service_provider_profiles:', err);
            return;
          }
          
          console.log('\n🏢 SP Profile:');
          if (profile) {
            console.log(`   Business Name: ${profile.business_name}`);
            console.log(`   Service Category: ${profile.service_category}`);
            console.log(`   City: ${profile.city}`);
          } else {
            console.log('   No profile found');
          }
          
          db.close();
        });
      } else {
        console.log('   No SP user found');
        db.close();
      }
    });
  });
});
