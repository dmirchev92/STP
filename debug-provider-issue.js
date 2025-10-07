#!/usr/bin/env node

/**
 * Debug script to investigate why provider disappeared from Marketplace
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ServiceTextPro/backend/data/servicetext_pro.db');

function debugProviderIssue() {
  console.log('🔍 Debugging Provider Issue');
  console.log('==========================');
  
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err.message);
      return;
    }
    console.log('✅ Connected to SQLite database');
  });

  // Check user with email damirchev@gmail.com
  db.get(
    `SELECT id, email, first_name, last_name, phone_number, role, created_at FROM users WHERE email = ?`,
    ['damirchev@gmail.com'],
    (err, user) => {
      if (err) {
        console.error('❌ Error fetching user:', err);
        return;
      }
      
      if (!user) {
        console.log('❌ User with email damirchev@gmail.com not found');
        return;
      }
      
      console.log('👤 User found:', {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at
      });
      
      // Check service provider profile
      db.get(
        `SELECT * FROM service_provider_profiles WHERE user_id = ?`,
        [user.id],
        (err, profile) => {
          if (err) {
            console.error('❌ Error fetching profile:', err);
            return;
          }
          
          if (!profile) {
            console.log('❌ No service provider profile found for user');
          } else {
            console.log('📋 Service Provider Profile:', {
              id: profile.id,
              userId: profile.user_id,
              businessName: profile.business_name,
              serviceCategory: profile.service_category,
              city: profile.city,
              neighborhood: profile.neighborhood,
              isActive: profile.is_active,
              createdAt: profile.created_at,
              updatedAt: profile.updated_at
            });
          }
          
          // Test the search query that Marketplace uses
          console.log('\n🔍 Testing Marketplace search query...');
          const searchQuery = `
            SELECT 
              u.id, u.first_name, u.last_name, u.email, u.phone_number,
              spp.business_name, spp.service_category, spp.description,
              spp.city, spp.address, spp.phone_number as profile_phone, 
              spp.email as profile_email, spp.website_url as website, spp.is_active
            FROM users u
            LEFT JOIN service_provider_profiles spp ON u.id = spp.user_id
            WHERE u.role = 'tradesperson' AND (spp.is_active = 1 OR spp.is_active IS NULL)
            AND u.email = ?
          `;
          
          db.get(searchQuery, ['damirchev@gmail.com'], (err, searchResult) => {
            if (err) {
              console.error('❌ Error in search query:', err);
            } else if (!searchResult) {
              console.log('❌ User NOT found in marketplace search - this is the problem!');
              console.log('   Possible reasons:');
              console.log('   1. Role is not "tradesperson"');
              console.log('   2. is_active is 0 (inactive)');
              console.log('   3. Profile doesn\'t exist');
            } else {
              console.log('✅ User found in marketplace search:', {
                id: searchResult.id,
                email: searchResult.email,
                businessName: searchResult.business_name,
                isActive: searchResult.is_active
              });
            }
            
            // Close database
            db.close((err) => {
              if (err) {
                console.error('❌ Error closing database:', err.message);
              } else {
                console.log('\n✅ Database connection closed');
              }
            });
          });
        }
      );
    }
  );
}

// Also check all users to see the current state
function checkAllUsers() {
  console.log('\n📊 Checking all users in database...');
  
  const db = new sqlite3.Database(DB_PATH);
  
  db.all(
    `SELECT u.email, u.role, spp.business_name, spp.is_active 
     FROM users u 
     LEFT JOIN service_provider_profiles spp ON u.id = spp.user_id 
     ORDER BY u.created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('❌ Error fetching all users:', err);
      } else {
        console.log('All users:');
        rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.email} | Role: ${row.role} | Business: ${row.business_name || 'N/A'} | Active: ${row.is_active}`);
        });
      }
      
      db.close();
    }
  );
}

// Run both checks
debugProviderIssue();
setTimeout(checkAllUsers, 2000);


