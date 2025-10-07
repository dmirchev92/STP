// Test Brute Force Protection - Should be blocked now
const axios = require('axios');

async function testBruteForceBlocking() {
  console.log('🧪 Testing Brute Force Blocking (should be blocked now)...\n');

  try {
    const response = await axios.post('http://192.168.0.129:3000/api/v1/auth/login', {
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    
    console.log('❌ SECURITY FAILURE: Login was NOT blocked!');
    console.log('Response:', response.data);
    
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('✅ SUCCESS: Brute force protection is working!');
      console.log('Status:', error.response.status);
      console.log('Error Code:', error.response.data?.error?.code);
      console.log('Message:', error.response.data?.error?.message);
      console.log('Retry After:', error.response.data?.error?.retryAfter, 'seconds');
      
      if (error.response.data?.error?.retryAfter) {
        const minutes = Math.ceil(error.response.data.error.retryAfter / 60);
        console.log(`\n🔒 Account locked for ${minutes} minutes`);
      }
    } else if (error.response?.status === 401) {
      console.log('⚠️  Still getting 401 - brute force protection might not be triggered yet');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data?.error?.message);
    } else {
      console.log('❓ Unexpected response:', error.response?.status);
      console.log('Data:', error.response?.data);
    }
  }
  
  console.log('\n🛡️ BRUTE FORCE PROTECTION TEST COMPLETE');
  console.log('Expected: 429 status with account locked message');
}

testBruteForceBlocking().catch(console.error);
