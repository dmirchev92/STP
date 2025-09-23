// Test the complete token validation flow
const axios = require('axios');

async function testTokenValidationFlow() {
  try {
    console.log('🔍 Testing token validation flow...\n');
    
    // Step 1: Get current token
    console.log('1. Getting current token...');
    const tokenResponse = await axios.get('http://localhost:3001/api/v1/chat/tokens/current/NoT_');
    
    if (!tokenResponse.data.success) {
      console.error('❌ Failed to get token:', tokenResponse.data.error);
      return;
    }
    
    const token = tokenResponse.data.data.token;
    console.log(`✅ Current token: ${token}`);
    
    // Step 2: Validate token (this should create marketplace conversation)
    console.log('\n2. Validating token...');
    const validateResponse = await axios.post('http://localhost:3001/api/v1/chat/public/NoT_/validate/' + token);
    
    if (!validateResponse.data.success) {
      console.error('❌ Token validation failed:', validateResponse.data.error);
      return;
    }
    
    console.log('✅ Token validation response:', validateResponse.data);
    
    const { conversationId, sessionId, userId } = validateResponse.data.data;
    console.log(`   Conversation ID: ${conversationId}`);
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   User ID: ${userId}`);
    
    // Step 3: Check if marketplace conversation was created
    console.log('\n3. Checking if marketplace conversation exists...');
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = path.join(__dirname, 'data', 'servicetext_pro.db');
    const db = new sqlite3.Database(dbPath);
    
    db.get(`SELECT * FROM marketplace_conversations WHERE id = ?`, [conversationId], (err, row) => {
      if (err) {
        console.error('❌ Database error:', err);
        return;
      }
      
      if (row) {
        console.log('✅ Marketplace conversation found:');
        console.log(`   ID: ${row.id}`);
        console.log(`   Provider ID: ${row.provider_id}`);
        console.log(`   Customer Name: ${row.customer_name}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Created: ${row.created_at}`);
      } else {
        console.log('❌ No marketplace conversation found with ID:', conversationId);
      }
      
      // Step 4: Check chat session
      db.get(`SELECT * FROM chat_sessions WHERE conversation_id = ?`, [conversationId], (err, session) => {
        if (err) {
          console.error('❌ Session query error:', err);
          return;
        }
        
        if (session) {
          console.log('\n✅ Chat session found:');
          console.log(`   Session ID: ${session.session_id}`);
          console.log(`   Conversation ID: ${session.conversation_id}`);
          console.log(`   User ID: ${session.user_id}`);
        } else {
          console.log('\n❌ No chat session found');
        }
        
        db.close();
      });
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testTokenValidationFlow();
