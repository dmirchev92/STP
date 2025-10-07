#!/usr/bin/env node

/**
 * Fix script to reactivate the provider
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ServiceTextPro/backend/data/servicetext_pro.db');

function fixProviderActive() {
  console.log('🔧 Fixing Provider Active Status');
  console.log('===============================');
  
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err.message);
      return;
    }
    console.log('✅ Connected to SQLite database');
  });

  // Update the provider to be active
  db.run(
    `UPDATE service_provider_profiles 
     SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
     WHERE user_id = (SELECT id FROM users WHERE email = ?)`,
    ['damirchev92@gmail.com'],
    function(err) {
      if (err) {
        console.error('❌ Error updating provider:', err);
      } else {
        console.log('✅ Provider reactivated successfully!');
        console.log(`   Rows affected: ${this.changes}`);
      }
      
      // Verify the fix
      db.get(
        `SELECT u.email, spp.business_name, spp.is_active 
         FROM users u 
         JOIN service_provider_profiles spp ON u.id = spp.user_id 
         WHERE u.email = ?`,
        ['damirchev92@gmail.com'],
        (err, row) => {
          if (err) {
            console.error('❌ Error verifying fix:', err);
          } else if (row) {
            console.log('✅ Verification successful:', {
              email: row.email,
              businessName: row.business_name,
              isActive: row.is_active
            });
          }
          
          // Close database
          db.close((err) => {
            if (err) {
              console.error('❌ Error closing database:', err.message);
            } else {
              console.log('✅ Database connection closed');
              console.log('');
              console.log('🎉 The provider should now appear in the Marketplace again!');
              console.log('   Refresh your Marketplace page to see the changes.');
            }
          });
        }
      );
    }
  );
}

fixProviderActive();


