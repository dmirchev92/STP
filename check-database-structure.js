#!/usr/bin/env node

/**
 * Check Database Structure - Shows what data is in users and service_provider_profiles tables
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'servicetext_pro.db');

console.log('🔍 Checking Database Structure');
console.log('=' .repeat(80));

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database\n');
});

async function checkUsersTable() {
  return new Promise((resolve, reject) => {
    console.log('📋 USERS TABLE STRUCTURE:');
    console.log('-'.repeat(80));
    
    db.all('PRAGMA table_info(users)', (err, columns) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('Columns:');
      columns.forEach(col => {
        console.log(`  - ${col.name.padEnd(25)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      // Get sample data
      db.get('SELECT * FROM users WHERE email = ?', ['damirchev92@gmail.com'], (err, user) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (user) {
          console.log('\n📄 Sample Data (damirchev92@gmail.com):');
          console.log(`  ID: ${user.id}`);
          console.log(`  Email: ${user.email}`);
          console.log(`  First Name: ${user.first_name || '(not set)'}`);
          console.log(`  Last Name: ${user.last_name || '(not set)'}`);
          console.log(`  Phone: ${user.phone_number || '(not set)'}`);
          console.log(`  Role: ${user.role}`);
          console.log(`  Status: ${user.status}`);
          console.log(`  Created: ${user.created_at}`);
        } else {
          console.log('\n⚠️  User damirchev92@gmail.com not found');
        }
        
        resolve();
      });
    });
  });
}

async function checkServiceProviderProfilesTable() {
  return new Promise((resolve, reject) => {
    console.log('\n\n📋 SERVICE_PROVIDER_PROFILES TABLE STRUCTURE:');
    console.log('-'.repeat(80));
    
    db.all('PRAGMA table_info(service_provider_profiles)', (err, columns) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('Columns:');
      columns.forEach(col => {
        console.log(`  - ${col.name.padEnd(25)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      // Get sample data
      db.get(`
        SELECT sp.*, u.email 
        FROM service_provider_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE u.email = ?
      `, ['damirchev92@gmail.com'], (err, profile) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (profile) {
          console.log('\n📄 Sample Data (damirchev92@gmail.com):');
          console.log(`  User ID: ${profile.user_id}`);
          console.log(`  Business Name: ${profile.business_name || '(not set)'}`);
          console.log(`  Service Category: ${profile.service_category || '(not set)'}`);
          console.log(`  Description: ${profile.description ? profile.description.substring(0, 50) + '...' : '(not set)'}`);
          console.log(`  Experience Years: ${profile.experience_years || 0}`);
          console.log(`  Hourly Rate: ${profile.hourly_rate || 0} лв`);
          console.log(`  City: ${profile.city || '(not set)'}`);
          console.log(`  Neighborhood: ${profile.neighborhood || '(not set)'}`);
          console.log(`  Phone: ${profile.phone_number || '(not set)'}`);
          console.log(`  Email: ${profile.email || '(not set)'}`);
          console.log(`  Rating: ${profile.rating || 0}`);
          console.log(`  Total Reviews: ${profile.total_reviews || 0}`);
          console.log(`  Is Active: ${profile.is_active ? 'Yes' : 'No'}`);
          console.log(`  Created: ${profile.created_at}`);
        } else {
          console.log('\n⚠️  Service provider profile not found for damirchev92@gmail.com');
        }
        
        resolve();
      });
    });
  });
}

async function explainRelationship() {
  console.log('\n\n📚 HOW THEY WORK TOGETHER:');
  console.log('=' .repeat(80));
  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE RELATIONSHIP                             │
└─────────────────────────────────────────────────────────────────────────────┘

  users table                          service_provider_profiles table
  ┌──────────────────────┐            ┌────────────────────────────────┐
  │ id (PRIMARY KEY)     │◄───────────│ user_id (FOREIGN KEY)          │
  │ email                │            │ business_name                  │
  │ password_hash        │            │ service_category               │
  │ role                 │            │ description                    │
  │ first_name          │            │ experience_years               │
  │ last_name           │            │ hourly_rate                    │
  │ phone_number        │            │ city                           │
  │ ...                  │            │ neighborhood                   │
  └──────────────────────┘            │ phone_number (duplicate!)      │
                                      │ email (duplicate!)             │
                                      │ rating                         │
                                      │ total_reviews                  │
                                      └────────────────────────────────┘

WHAT EACH TABLE STORES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

users table:
  ✓ Authentication (email, password)
  ✓ Personal info (first_name, last_name, phone_number)
  ✓ User role (customer, tradesperson, service_provider)
  ✓ Used by: ALL users (customers + service providers)

service_provider_profiles table:
  ✓ Business information (business_name, description)
  ✓ Service details (category, experience, hourly_rate)
  ✓ Location (city, neighborhood, address)
  ✓ Marketplace data (rating, total_reviews)
  ✓ Used by: ONLY service providers

DUPLICATION ISSUE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  phone_number exists in BOTH tables!
⚠️  email exists in BOTH tables!

This can cause confusion:
  - Which one is the "source of truth"?
  - When you update phone in users, does it update in service_provider_profiles?
  - Mobile app might update one, web might update the other

RECOMMENDATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Keep phone_number and email ONLY in users table
✓ Remove phone_number and email from service_provider_profiles table
✓ Always fetch phone/email via JOIN when displaying provider info
✓ This ensures ONE source of truth and no sync issues
`);
}

async function showCurrentUpdateLogic() {
  console.log('\n\n🔄 CURRENT UPDATE LOGIC (createOrUpdateProfile):');
  console.log('=' .repeat(80));
  console.log(`
When you save changes in settings page:

1. Updates users table:
   ✓ first_name
   ✓ last_name  
   ✓ phone_number

2. Updates service_provider_profiles table:
   ✓ business_name
   ✓ service_category
   ✓ description
   ✓ experience_years
   ✓ hourly_rate
   ✓ city
   ✓ neighborhood
   ✓ address
   ✓ phone_number (duplicate!)
   ✓ email (duplicate!)
   ✓ profile_image_url

⚠️  PROBLEM: phone_number and email are updated in BOTH tables!
`);
}

async function main() {
  try {
    await checkUsersTable();
    await checkServiceProviderProfilesTable();
    await explainRelationship();
    await showCurrentUpdateLogic();
    
    console.log('\n\n✅ Database structure check complete!');
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    db.close();
  }
}

main();
