// Test script to get current token for a user
const fetch = require('node-fetch');

async function getCurrentToken() {
  try {
    // You need to replace this with a real auth token
    // You can get it by logging in through the mobile app or web interface
    const authToken = 'YOUR_AUTH_TOKEN_HERE';
    
    const response = await fetch('http://192.168.0.129:3000/api/v1/chat/tokens/current', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Current token retrieved:');
      console.log('Token:', result.data.token);
      console.log('Chat URL:', result.data.chatUrl);
    } else {
      console.log('❌ Error:', result.error?.message || 'Failed to get token');
      console.log('Status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

getCurrentToken();
