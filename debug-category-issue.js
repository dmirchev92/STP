/**
 * Debug Category Display Issue
 * Check what category is being returned for the specific user
 */

const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function debugCategoryIssue() {
  console.log('🔍 Debugging category display for user: c9b21cdf-542f-41f3-8f39-9be6cda9b2a6\n');

  try {
    const providerOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/marketplace/providers/c9b21cdf-542f-41f3-8f39-9be6cda9b2a6',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const providerResult = await makeRequest(providerOptions);
    
    if (providerResult.data.success) {
      const provider = providerResult.data.data;
      console.log('✅ Provider API Response:');
      console.log(`   Business Name: ${provider.businessName}`);
      console.log(`   Service Category: "${provider.serviceCategory}"`);
      console.log(`   Experience Years: ${provider.experienceYears}`);
      console.log(`   Phone Number: ${provider.phoneNumber}`);
      console.log(`   Profile Phone: ${provider.profilePhone}`);
      console.log('\n📋 Full provider object:');
      console.log(JSON.stringify(provider, null, 2));
    } else {
      console.log('❌ Failed to get provider data:', providerResult.data);
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
  }
}

// Run the debug
debugCategoryIssue();
