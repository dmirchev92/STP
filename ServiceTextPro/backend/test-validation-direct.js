const http = require('http');

function testValidationEndpoint() {
  const spIdentifier = 'NoT_';
  const token = '9V8SDMCK'; // Current unused token
  
  console.log('🧪 Testing validation endpoint directly...');
  console.log(`SP Identifier: ${spIdentifier}`);
  console.log(`Token: ${token}`);
  
  const path = `/api/v1/chat/public/${spIdentifier}/validate/${token}`;
  console.log(`URL: http://192.168.0.129:3000${path}`);
  
  const options = {
    hostname: '192.168.0.129',
    port: 3000,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`Response Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('Response Body:', JSON.stringify(result, null, 2));
        
        if (result.success) {
          console.log('✅ Token validation successful!');
          console.log('🔄 New token should be generated now');
        } else {
          console.log('❌ Token validation failed');
        }
      } catch (error) {
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error testing validation:', error.message);
  });
  
  req.end();
}

testValidationEndpoint();
