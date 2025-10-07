/**
 * Debug Search Fields
 * Check what fields are actually being returned by the search query
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

async function debugSearchFields() {
  console.log('🔍 Debugging Search Fields...\n');

  try {
    const searchOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/marketplace/providers/search?category=electrician&limit=1',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const searchResult = await makeRequest(searchOptions);
    console.log('📊 Search response status:', searchResult.status);
    
    if (searchResult.data.success && searchResult.data.data.length > 0) {
      const provider = searchResult.data.data[0];
      console.log('🔍 First provider object:');
      console.log(JSON.stringify(provider, null, 2));
      
      console.log('\n📋 Field Analysis:');
      Object.keys(provider).forEach(key => {
        const value = provider[key];
        const type = typeof value;
        console.log(`   ${key}: ${value} (${type})`);
      });
    } else {
      console.log('❌ No providers found or search failed:', searchResult.data);
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
  }
}

// Run the debug
debugSearchFields();
