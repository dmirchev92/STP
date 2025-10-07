// Simple Security Reset - API-based approach
const axios = require('axios');

async function resetSecurityLimits() {
  console.log('🧹 Resetting security limits via API...\n');

  try {
    // Try to call the admin security cleanup endpoint
    const response = await axios.post('http://192.168.0.129:3000/api/v1/admin/security/cleanup', {}, {
      headers: {
        'Authorization': 'Bearer fake-token-for-testing'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Security limits reset via API');
      console.log('Response:', response.data.data);
    }
    
  } catch (error) {
    console.log('⚠️  API method not available, using alternative approach...');
  }

  console.log('');
  console.log('🔄 ALTERNATIVE: Restart the backend server');
  console.log('');
  console.log('💡 The easiest way to reset all security limits is:');
  console.log('   1. Stop the backend server (Ctrl+C)');
  console.log('   2. Start it again: npm run dev');
  console.log('   3. All in-memory limits will be cleared');
  console.log('');
  console.log('🎯 After restart, you\'ll have:');
  console.log('   📧 Email attempts: 0/5 (fresh start)');
  console.log('   🌐 IP attempts: 0/20 (fresh start)');
  console.log('   ⏰ No active blocks or restrictions');
  console.log('');
  console.log('🧪 Then you can test:');
  console.log('   node test-dynamic-messages.js');
  console.log('   (Will show "You have 4 attempts remaining..." on first try)');
}

resetSecurityLimits().catch(console.error);
