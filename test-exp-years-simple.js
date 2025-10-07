/**
 * Simple Experience Years Sync Test
 * Direct database and API verification
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function testExperienceYearsSync() {
  console.log('🧪 Testing Experience Years Field Sync...\n');

  try {
    // Connect to database
    const dbPath = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');
    console.log('📂 Database path:', dbPath);
    
    const db = new sqlite3.Database(dbPath);

    // Check database schema first
    console.log('1️⃣ Checking database schema...');
    const schemaResult = await new Promise((resolve, reject) => {
      db.all(`PRAGMA table_info(service_provider_profiles)`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📊 service_provider_profiles columns:');
    schemaResult.forEach(col => {
      if (col.name.includes('experience') || col.name.includes('years')) {
        console.log(`   ✅ ${col.name}: ${col.type} (${col.notnull ? 'NOT NULL' : 'NULLABLE'})`);
      }
    });

    // Check existing providers with experience_years
    console.log('\n2️⃣ Checking existing providers with experience_years...');
    const providersResult = await new Promise((resolve, reject) => {
      db.all(`
        SELECT user_id, business_name, experience_years, hourly_rate, updated_at 
        FROM service_provider_profiles 
        WHERE experience_years IS NOT NULL AND experience_years > 0
        ORDER BY updated_at DESC 
        LIMIT 5
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (providersResult.length > 0) {
      console.log('📋 Providers with experience_years:');
      providersResult.forEach(p => {
        console.log(`   ${p.business_name}: ${p.experience_years} years (Rate: ${p.hourly_rate} лв/ч)`);
      });
    } else {
      console.log('⚠️  No providers found with experience_years > 0');
    }

    // Test the createOrUpdateProviderProfile method directly
    console.log('\n3️⃣ Testing profile update directly...');
    
    // Import the database class
    const { SQLiteDatabase } = require('./ServiceTextPro/backend/src/models/SQLiteDatabase');
    const dbInstance = new SQLiteDatabase();

    // Create test profile data
    const testUserId = 'test-exp-' + Date.now();
    const testProfileData = {
      businessName: 'Тест Електрик ЕООД',
      serviceCategory: 'electrician',
      description: 'Тестов профил за проверка на години опит',
      experienceYears: 15, // Key field we're testing
      hourlyRate: 50,
      city: 'София',
      neighborhood: 'Център',
      phoneNumber: '+359888123456',
      email: 'test@example.com'
    };

    console.log('📤 Creating test profile with experienceYears:', testProfileData.experienceYears);

    await dbInstance.createOrUpdateProviderProfile(testUserId, testProfileData);
    console.log('✅ Profile created/updated');

    // Verify the data was saved correctly
    const verifyResult = await new Promise((resolve, reject) => {
      db.get(`
        SELECT experience_years, business_name, hourly_rate 
        FROM service_provider_profiles 
        WHERE user_id = ?
      `, [testUserId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    console.log('🔍 Verification result:');
    if (verifyResult) {
      console.log(`   Experience Years: ${verifyResult.experience_years} (expected: 15)`);
      console.log(`   Business Name: ${verifyResult.business_name}`);
      console.log(`   Hourly Rate: ${verifyResult.hourly_rate}`);
      
      if (verifyResult.experience_years === 15) {
        console.log('✅ Experience years saved correctly!');
      } else {
        console.log('❌ Experience years mismatch!');
      }
    } else {
      console.log('❌ No profile found after creation');
    }

    // Clean up test data
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM service_provider_profiles WHERE user_id = ?`, [testUserId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    db.close();
    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testExperienceYearsSync();
