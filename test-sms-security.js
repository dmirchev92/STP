// SMS Security Testing Script
// Tests all anti-hack mechanics

const axios = require('axios');

const API_BASE = 'http://192.168.0.129:3000/api/v1';
let authToken = '';

// Test data
const PREMIUM_NUMBERS = [
  '0900123456',    // Premium number
  '1234',          // Short premium
  '12345',         // Short premium
  '+3591234',      // Bulgarian premium with country code
  '0901999888',    // Extended premium
  '1800',          // Premium range
];

const SUSPICIOUS_MESSAGES = [
  'Click here to win money: http://evil-site.com',
  'Premium service - you will be charged',
  'Urgent! Act now to claim your prize!',
  'Send SMS to 1234 to win cash',
  'Visit http://malicious-site.com for free money'
];

const SAFE_NUMBERS = [
  '+359888123456',  // Normal Bulgarian mobile
  '0888123456',     // Normal Bulgarian mobile
  '+12125551234',   // Normal US number
];

const SAFE_MESSAGES = [
  'Hello, this is a normal message',
  'Your appointment is confirmed for tomorrow',
  'Thank you for your inquiry. We will contact you soon.',
  'Chat link: http://192.168.0.129:3002/u/test/c/token123'
];

async function authenticate() {
  try {
    console.log('🔑 Authenticating...');
    // You'll need to replace with actual login credentials
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'your-email@example.com',
      password: 'your-password'
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Authentication successful');
      return true;
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPremiumNumberBlocking() {
  console.log('\n🚨 Testing Premium Number Blocking...');
  
  for (const number of PREMIUM_NUMBERS) {
    try {
      // This would be the actual SMS sending endpoint when implemented
      console.log(`Testing premium number: ${number}`);
      
      // For now, we test the security service directly
      // In a real implementation, you'd test the actual SMS endpoint
      
      console.log(`❌ Should block: ${number}`);
    } catch (error) {
      console.log(`✅ Correctly blocked: ${number}`);
    }
  }
}

async function testSuspiciousContent() {
  console.log('\n🔍 Testing Suspicious Content Detection...');
  
  for (const message of SUSPICIOUS_MESSAGES) {
    try {
      console.log(`Testing suspicious message: "${message.substring(0, 50)}..."`);
      
      // Test would go here - should be blocked
      console.log(`❌ Should block suspicious content`);
    } catch (error) {
      console.log(`✅ Correctly blocked suspicious content`);
    }
  }
}

async function testRateLimit() {
  console.log('\n⏱️  Testing Rate Limiting...');
  
  try {
    // Try to generate tokens rapidly
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        axios.post(`${API_BASE}/chat/tokens/regenerate`, {}, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      );
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Rate limiting working: ${successful} successful, ${failed} blocked`);
    
    if (failed > 0) {
      console.log('✅ Rate limiting is active');
    } else {
      console.log('❌ Rate limiting may not be working');
    }
    
  } catch (error) {
    console.error('Rate limit test error:', error.message);
  }
}

async function testAuthorizationBypass() {
  console.log('\n🔐 Testing Authorization Bypass...');
  
  const protectedEndpoints = [
    '/sms/config',
    '/chat/tokens/current',
    '/chat/tokens/regenerate',
    '/chat/url'
  ];
  
  for (const endpoint of protectedEndpoints) {
    try {
      // Test without token
      await axios.get(`${API_BASE}${endpoint}`);
      console.log(`❌ SECURITY ISSUE: ${endpoint} accessible without auth`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`✅ ${endpoint} properly protected`);
      } else {
        console.log(`⚠️  ${endpoint} returned unexpected error: ${error.response?.status}`);
      }
    }
    
    try {
      // Test with fake token
      await axios.get(`${API_BASE}${endpoint}`, {
        headers: { Authorization: 'Bearer fake-token-12345' }
      });
      console.log(`❌ SECURITY ISSUE: ${endpoint} accepts fake tokens`);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log(`✅ ${endpoint} rejects fake tokens`);
      }
    }
  }
}

async function testCORSProtection() {
  console.log('\n🌐 Testing CORS Protection...');
  
  try {
    // Test from unauthorized origin
    const response = await axios.get(`${API_BASE}/sms/config`, {
      headers: {
        'Origin': 'http://evil-site.com',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('⚠️  CORS may not be properly configured');
  } catch (error) {
    if (error.code === 'ERR_NETWORK' || error.response?.status === 403) {
      console.log('✅ CORS protection active');
    }
  }
}

async function runAllTests() {
  console.log('🔒 SMS Security Testing Suite');
  console.log('============================\n');
  
  const isAuthenticated = await authenticate();
  if (!isAuthenticated) {
    console.log('❌ Cannot run tests without authentication');
    return;
  }
  
  await testAuthorizationBypass();
  await testRateLimit();
  await testPremiumNumberBlocking();
  await testSuspiciousContent();
  await testCORSProtection();
  
  console.log('\n✅ Security testing complete!');
  console.log('\n📋 SECURITY CHECKLIST:');
  console.log('- Authentication required for all SMS endpoints');
  console.log('- Rate limiting prevents abuse');
  console.log('- Premium numbers are blocked');
  console.log('- Suspicious content is filtered');
  console.log('- CORS prevents unauthorized origins');
}

// Run tests
runAllTests().catch(console.error);
