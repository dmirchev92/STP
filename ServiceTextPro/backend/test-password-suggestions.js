// Test Password Reset Suggestions in Dynamic Messages
const axios = require('axios');

async function testPasswordSuggestions() {
  console.log('🧪 Testing Password Reset Suggestions...\n');

  const baseURL = 'http://192.168.0.129:3000/api/v1';
  const testEmail = 'test.password.suggestions@example.com';
  
  console.log(`📧 Testing with email: ${testEmail}`);
  console.log('🔒 Looking for password reset suggestions in last 3 attempts\n');

  for (let attempt = 1; attempt <= 6; attempt++) {
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
        const message = errorData.error.message;
        
        console.log('📱 POPUP MESSAGE:');
        console.log(`   "${message}"`);
        
        // Check for password reset suggestion
        if (message.includes('💡 Tip')) {
          console.log('   ✅ PASSWORD RESET SUGGESTION SHOWN!');
        } else {
          console.log('   ℹ️  No password suggestion (not in last 3 attempts)');
        }
        
        if (errorData.error.details?.securityInfo) {
          const security = errorData.error.details.securityInfo;
          console.log(`   📊 Remaining: ${security.emailRemaining}/5`);
        }
        
      } else if (error.response?.status === 429) {
        console.log('🔒 ACCOUNT BLOCKED:');
        console.log(`   Message: "${error.response.data?.error?.message}"`);
        break;
        
      } else {
        console.log('❓ Unexpected error:', error.response?.status);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎉 PASSWORD SUGGESTION TEST COMPLETE!');
  console.log('\n📋 EXPECTED BEHAVIOR:');
  console.log('   Attempts 1-2: No password suggestion');
  console.log('   Attempts 3-5: 💡 Password reset suggestion shown');
  console.log('   Attempt 6: Account locked');
  console.log('\n💡 SUGGESTION MESSAGE:');
  console.log('   "💡 Tip: If you forgot your password, consider using the');
  console.log('   \\"Forgot Password\\" option to reset it instead of risking account lockout."');
}

testPasswordSuggestions().catch(console.error);
