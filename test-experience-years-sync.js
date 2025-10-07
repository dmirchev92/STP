/**
 * Test Experience Years Field Sync
 * Tests the specific issue with experience_years not syncing from mobile app to marketplace
 */

// Using built-in fetch (Node 18+) or fallback
const fetch = globalThis.fetch || require('node-fetch');

const API_BASE = 'http://localhost:3000/api/v1';

async function testExperienceYearsSync() {
  console.log('🧪 Testing Experience Years Field Sync...\n');

  try {
    // Step 1: Create a test user
    console.log('1️⃣ Creating test user...');
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-exp-${Date.now()}@example.com`,
        password: 'TestPass123!',
        firstName: 'Тест',
        lastName: 'Потребител',
        phoneNumber: '+359888999000',
        serviceCategory: 'electrician',
        role: 'tradesperson'
      })
    });

    const registerData = await registerResponse.json();
    if (!registerData.success) {
      throw new Error(`Registration failed: ${registerData.error?.message}`);
    }

    const userId = registerData.data.user.id;
    const authToken = registerData.data.tokens.accessToken;
    console.log('✅ User created:', userId);

    // Step 2: Update profile with specific experience years
    console.log('\n2️⃣ Updating profile with experience years = 25...');
    const profileData = {
      userId,
      profile: {
        businessName: 'Експерт Електрик ЕООД',
        serviceCategory: 'electrician',
        description: 'Професионални електрически услуги',
        experienceYears: 25, // This is the field we're testing
        hourlyRate: 60,
        city: 'София',
        neighborhood: 'Лозенец',
        phoneNumber: '+359888999000',
        email: 'test@expert-elektrik.bg'
      }
    };

    console.log('📤 Sending profile data:', JSON.stringify(profileData, null, 2));

    const profileResponse = await fetch(`${API_BASE}/marketplace/providers/profile`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(profileData)
    });

    const profileResult = await profileResponse.json();
    if (!profileResult.success) {
      throw new Error(`Profile update failed: ${profileResult.error?.message}`);
    }

    console.log('✅ Profile updated successfully');

    // Step 3: Verify in database directly
    console.log('\n3️⃣ Checking database directly...');
    const sqlite3 = require('sqlite3');
    const path = require('path');
    
    const dbPath = path.join(process.cwd(), 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');
    const db = new sqlite3.Database(dbPath);
    
    const dbResult = await new Promise((resolve, reject) => {
      db.get(
        `SELECT experience_years, business_name, hourly_rate FROM service_provider_profiles WHERE user_id = ?`,
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    console.log('📊 Database record:', dbResult);

    if (dbResult) {
      console.log(`   Experience Years in DB: ${dbResult.experience_years}`);
      console.log(`   Business Name in DB: ${dbResult.business_name}`);
      console.log(`   Hourly Rate in DB: ${dbResult.hourly_rate}`);
    }

    db.close();

    // Step 4: Test marketplace search
    console.log('\n4️⃣ Testing marketplace search...');
    const searchResponse = await fetch(`${API_BASE}/marketplace/providers/search?category=electrician&city=София`);
    const searchResult = await searchResponse.json();

    if (!searchResult.success) {
      throw new Error(`Search failed: ${searchResult.error?.message}`);
    }

    const ourProvider = searchResult.data.find(p => p.id === userId);
    if (!ourProvider) {
      throw new Error('Provider not found in search results');
    }

    console.log('🔍 Provider in search results:');
    console.log(`   ID: ${ourProvider.id}`);
    console.log(`   Business Name: ${ourProvider.business_name}`);
    console.log(`   Experience Years: ${ourProvider.experience_years}`);
    console.log(`   Hourly Rate: ${ourProvider.hourly_rate}`);

    // Step 5: Test individual provider fetch
    console.log('\n5️⃣ Testing individual provider fetch...');
    const providerResponse = await fetch(`${API_BASE}/marketplace/providers/${userId}`);
    const providerResult = await providerResponse.json();

    if (!providerResult.success) {
      throw new Error(`Provider fetch failed: ${providerResult.error?.message}`);
    }

    const individualProvider = providerResult.data;
    console.log('👤 Individual provider data:');
    console.log(`   ID: ${individualProvider.id}`);
    console.log(`   Business Name: ${individualProvider.businessName}`);
    console.log(`   Experience Years: ${individualProvider.experienceYears}`);
    console.log(`   Hourly Rate: ${individualProvider.hourlyRate}`);

    // Step 6: Verify field consistency
    console.log('\n6️⃣ Verifying field consistency...');
    let allGood = true;

    if (dbResult.experience_years !== 25) {
      console.log('❌ Database experience_years mismatch:', dbResult.experience_years, 'expected: 25');
      allGood = false;
    }

    if (ourProvider.experience_years !== 25) {
      console.log('❌ Search results experience_years mismatch:', ourProvider.experience_years, 'expected: 25');
      allGood = false;
    }

    if (individualProvider.experienceYears !== 25) {
      console.log('❌ Individual provider experienceYears mismatch:', individualProvider.experienceYears, 'expected: 25');
      allGood = false;
    }

    if (allGood) {
      console.log('✅ All experience years fields are correct!');
    }

    console.log('\n🎉 Experience Years Sync Test Complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Debugging info:');
    console.log('   - Check if backend server is running');
    console.log('   - Check database schema for experience_years field');
    console.log('   - Check field mapping in createOrUpdateProviderProfile');
    console.log('   - Check marketplace controller getUpdatedProviderData');
  }
}

// Run the test
testExperienceYearsSync();
