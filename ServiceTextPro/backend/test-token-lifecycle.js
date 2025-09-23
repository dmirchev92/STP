const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'data', 'servicetext_pro.db');

console.log('🧪 Testing Token Lifecycle...');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

async function testTokenLifecycle() {
  try {
    // Step 1: Create a test user and SP identifier
    const testUserId = 'test_user_' + Date.now();
    const testSpId = 'TEST_' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    console.log('\n📝 Step 1: Creating test user and SP identifier');
    console.log(`User ID: ${testUserId}`);
    console.log(`SP Identifier: ${testSpId}`);
    
    // Insert test SP identifier
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO service_provider_identifiers (sp_identifier, user_id) VALUES (?, ?)',
        [testSpId, testUserId],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    // Step 2: Create initial token
    const token1 = Math.random().toString(36).substr(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log('\n📝 Step 2: Creating initial token');
    console.log(`Token 1: ${token1}`);
    
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO chat_tokens (token, user_id, sp_identifier, expires_at) VALUES (?, ?, ?, ?)',
        [token1, testUserId, testSpId, expiresAt],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    // Step 3: Check initial state
    console.log('\n📝 Step 3: Checking initial state');
    const initialTokens = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM chat_tokens WHERE sp_identifier = ?',
        [testSpId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });
    
    console.log(`Found ${initialTokens.length} tokens for SP ${testSpId}`);
    console.log('Tokens:', initialTokens.map(t => ({
      token: t.token,
      is_used: t.is_used,
      expires_at: t.expires_at
    })));
    
    // Step 4: Simulate token usage (mark as used)
    console.log('\n📝 Step 4: Simulating token usage');
    const conversationId = 'test_conv_' + Date.now();
    
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE chat_tokens SET is_used = 1, used_at = datetime("now"), conversation_id = ? WHERE token = ?',
        [conversationId, token1],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    console.log(`✅ Token ${token1} marked as used`);
    
    // Step 5: Create new token (simulating auto-regeneration)
    const token2 = Math.random().toString(36).substr(2, 8).toUpperCase();
    
    console.log('\n📝 Step 5: Creating new token (auto-regeneration)');
    console.log(`Token 2: ${token2}`);
    
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO chat_tokens (token, user_id, sp_identifier, expires_at) VALUES (?, ?, ?, ?)',
        [token2, testUserId, testSpId, expiresAt],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    // Step 6: Check final state
    console.log('\n📝 Step 6: Checking final state');
    const finalTokens = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM chat_tokens WHERE sp_identifier = ? ORDER BY created_at',
        [testSpId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });
    
    console.log(`Found ${finalTokens.length} tokens for SP ${testSpId}`);
    finalTokens.forEach((token, index) => {
      console.log(`Token ${index + 1}: ${token.token} (used: ${token.is_used ? 'YES' : 'NO'})`);
    });
    
    // Step 7: Test getCurrentUnusedToken logic
    console.log('\n📝 Step 7: Testing current unused token logic');
    const unusedTokens = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM chat_tokens WHERE sp_identifier = ? AND is_used = 0 AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1',
        [testSpId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });
    
    if (unusedTokens.length > 0) {
      console.log(`✅ Current unused token: ${unusedTokens[0].token}`);
      console.log('📱 SMS service should use this token for new messages');
    } else {
      console.log('❌ No unused tokens found - this would trigger new token generation');
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data');
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM chat_tokens WHERE sp_identifier = ?', [testSpId], (err) => err ? reject(err) : resolve());
    });
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM service_provider_identifiers WHERE sp_identifier = ?', [testSpId], (err) => err ? reject(err) : resolve());
    });
    
    console.log('\n🎉 Token lifecycle test completed successfully!');
    console.log('\n📋 Expected behavior:');
    console.log('1. When token1 is used → new token2 is generated');
    console.log('2. SMS service gets token2 for next customer');
    console.log('3. When token2 is used → new token3 is generated');
    console.log('4. Always 1 unused token available for SMS');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    db.close();
  }
}

testTokenLifecycle();
