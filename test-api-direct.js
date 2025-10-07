/**
 * Direct API Test for Experience Years
 * Tests the marketplace API endpoints directly
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

async function testExperienceYearsAPI() {
  console.log('🧪 Testing Experience Years via API...\n');

  try {
    // Test 1: Search for existing providers
    console.log('1️⃣ Testing marketplace search...');
    
    const searchOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/marketplace/providers/search?category=electrician',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const searchResult = await makeRequest(searchOptions);
    console.log('📊 Search response status:', searchResult.status);
    
    if (searchResult.data.success && searchResult.data.data.length > 0) {
      console.log('✅ Found providers:');
      searchResult.data.data.slice(0, 3).forEach(p => {
        console.log(`   ${p.business_name}: ${p.experience_years} years, Rate: ${p.hourly_rate} лв/ч`);
      });

      // Test 2: Get individual provider details
      const testProviderId = searchResult.data.data[0].id;
      console.log(`\n2️⃣ Testing individual provider fetch for ID: ${testProviderId}...`);
      
      const providerOptions = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/marketplace/providers/${testProviderId}`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      };

      const providerResult = await makeRequest(providerOptions);
      console.log('📊 Provider response status:', providerResult.status);
      
      if (providerResult.data.success) {
        const provider = providerResult.data.data;
        console.log('✅ Provider details:');
        console.log(`   Business Name: ${provider.businessName}`);
        console.log(`   Experience Years: ${provider.experienceYears}`);
        console.log(`   Hourly Rate: ${provider.hourlyRate}`);
        console.log(`   Rating: ${provider.rating}`);
        console.log(`   Total Reviews: ${provider.totalReviews}`);
      } else {
        console.log('❌ Failed to get provider details:', providerResult.data);
      }

    } else {
      console.log('❌ No providers found or search failed:', searchResult.data);
    }

    console.log('\n🎉 API test completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Make sure the backend server is running on localhost:3000');
  }
}

// Run the test
testExperienceYearsAPI();
