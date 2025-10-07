// Test Login Response to See What Data is Returned
const axios = require('axios');

async function testLoginResponse() {
  console.log('🧪 Testing login response...');
  
  try {
    const response = await axios.post('http://192.168.0.129:3000/api/v1/auth/login', {
      email: 'admin@servicetextpro.com',
      password: 'Admin123!'
    });
    
    console.log('✅ Login successful!');
    console.log('📋 Full response data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.user) {
      console.log('\n👤 User object:');
      console.log(JSON.stringify(response.data.data.user, null, 2));
      
      console.log('\n🔍 User properties:');
      const user = response.data.data.user;
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- First Name:', user.firstName);
      console.log('- Last Name:', user.lastName);
      console.log('- Status:', user.status);
      
      if (user.role === 'admin') {
        console.log('\n✅ User has admin role - admin access should work!');
      } else {
        console.log('\n❌ User does NOT have admin role:', user.role);
      }
    }
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
  }
}

testLoginResponse().catch(console.error);
