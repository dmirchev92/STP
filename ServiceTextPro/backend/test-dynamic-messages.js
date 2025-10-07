// Test Dynamic Login Messages with Attempt Counters
const axios = require('axios');

async function testDynamicMessages() {
  console.log('🧪 Testing Dynamic Login Messages & Debug Info...\n');

  const baseURL = 'http://192.168.0.129:3000/api/v1';
  const testEmail = 'test.dynamic@example.com';
  
  console.log(`📧 Testing with email: ${testEmail}`);
  console.log('🔒 Each attempt will show remaining tries and debug info\n');

  for (let attempt = 1; attempt <= 7; attempt++) {
    try {
      console.log(`\n🔄 Attempt ${attempt}:`);
      
      const response = await axios.post(`${baseURL}/auth/login`, {
        email: testEmail,
        password: 'wrongpassword'
      });
      
      console.log('❌ Unexpected success:', response.data);
      break;
      
    } catch (error) {
      if (error.response?.status === 401) {
        const errorData = error.response.data;
        
        console.log('📱 POPUP MESSAGE:');
        console.log(`   "${errorData.error.message}"`);
        
        if (errorData.error.details?.securityInfo) {
          const security = errorData.error.details.securityInfo;
          console.log('\n🔍 SECURITY INFO:');
          console.log(`   📧 Email attempts: ${security.emailAttempts}/5`);
          console.log(`   🌐 IP attempts: ${security.ipAttempts}/20`);
          console.log(`   📧 Email remaining: ${security.emailRemaining}`);
          console.log(`   🌐 IP remaining: ${security.ipRemaining}`);
        }
        
        if (errorData.error.details?.debugInfo) {
          const debug = errorData.error.details.debugInfo;
          console.log('\n🛠️  DEBUG INFO:');
          console.log(`   📧 Email: ${debug.email}`);
          console.log(`   🌐 IP: ${debug.ipAddress}`);
          console.log(`   ⏰ Email window: ${debug.emailWindowMinutes} minutes`);
          console.log(`   ⏰ IP window: ${debug.ipWindowMinutes} minutes`);
        }
        
      } else if (error.response?.status === 429) {
        console.log('🔒 ACCOUNT/IP BLOCKED:');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: "${error.response.data?.error?.message}"`);
        console.log(`   Retry After: ${error.response.data?.error?.retryAfter} seconds`);
        
        if (error.response.data?.error?.availableAtLocal) {
          console.log(`   ⏰ Available at: ${error.response.data.error.availableAtLocal}`);
        }
        break;
        
      } else {
        console.log('❓ Unexpected error:', error.response?.status);
        console.log('   Data:', error.response?.data);
      }
    }
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎉 DYNAMIC MESSAGE TEST COMPLETE!');
  console.log('\n📋 EXPECTED BEHAVIOR:');
  console.log('   Attempt 1: "You have 4 attempts remaining..."');
  console.log('   Attempt 2: "You have 3 attempts remaining..."');
  console.log('   Attempt 3: "You have 2 attempts remaining..."');
  console.log('   Attempt 4: "⚠️ WARNING: This account will be locked after 1 more failed attempt."');
  console.log('   Attempt 5: Account locked for 15 minutes');
  console.log('\n🛠️  DEBUG INFO shows:');
  console.log('   - Exact attempt counts for email and IP');
  console.log('   - Remaining attempts before lockout');
  console.log('   - Lockout window durations');
  console.log('   - Masked email and IP for privacy');
}

testDynamicMessages().catch(console.error);
