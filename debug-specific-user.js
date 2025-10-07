/**
 * Debug Specific User Data
 * Check the data for damirchev92@gmail.com specifically
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
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

async function debugSpecificUser() {
  console.log('🔍 Debugging user: damirchev92@gmail.com\n');

  try {
    // Connect to database
    const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');
    const db = new sqlite3.Database(dbPath);

    // Check user exists and get ID
    console.log('1️⃣ Finding user in database...');
    const user = await new Promise((resolve, reject) => {
      db.get(`SELECT id, email, first_name, last_name FROM users WHERE email = ?`, 
        ['damirchev92@gmail.com'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      console.log('❌ User not found with email: damirchev92@gmail.com');
      db.close();
      return;
    }

    console.log('✅ User found:', user);

    // Check service provider profile
    console.log('\n2️⃣ Checking service provider profile...');
    const profile = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM service_provider_profiles WHERE user_id = ?`, 
        [user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (profile) {
      console.log('✅ Profile found:');
      console.log(`   Business Name: ${profile.business_name}`);
      console.log(`   Experience Years: ${profile.experience_years}`);
      console.log(`   Hourly Rate: ${profile.hourly_rate}`);
      console.log(`   Updated At: ${profile.updated_at}`);
    } else {
      console.log('❌ No service provider profile found');
    }

    db.close();

    // Test API endpoints for this specific user
    console.log('\n3️⃣ Testing API endpoints...');
    
    // Search for this user
    const searchOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/marketplace/providers/search',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const searchResult = await makeRequest(searchOptions);
    if (searchResult.data.success) {
      const userInSearch = searchResult.data.data.find(p => p.email === 'damirchev92@gmail.com');
      if (userInSearch) {
        console.log('✅ User found in search results:');
        console.log(`   Business Name: ${userInSearch.businessName}`);
        console.log(`   Experience Years: ${userInSearch.experienceYears}`);
        console.log(`   Hourly Rate: ${userInSearch.hourlyRate}`);
      } else {
        console.log('❌ User not found in search results');
      }
    }

    // Get individual provider
    const providerOptions = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1/marketplace/providers/${user.id}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const providerResult = await makeRequest(providerOptions);
    if (providerResult.data.success) {
      const provider = providerResult.data.data;
      console.log('\n✅ Individual provider data:');
      console.log(`   Business Name: ${provider.businessName}`);
      console.log(`   Experience Years: ${provider.experienceYears}`);
      console.log(`   Hourly Rate: ${provider.hourlyRate}`);
    } else {
      console.log('\n❌ Failed to get individual provider data');
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
  }
}

// Run the debug
debugSpecificUser();
