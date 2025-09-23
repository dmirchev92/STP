const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'servicetext.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking database structure...\n');

// First, list all tables
db.all(
  "SELECT name FROM sqlite_master WHERE type='table'",
  (err, tables) => {
    if (err) {
      console.error('❌ Error listing tables:', err);
      db.close();
      return;
    }
    
    console.log('📋 Available tables:');
    tables.forEach(table => {
      console.log(`   - ${table.name}`);
    });
    console.log('');
    
    // Look for user data in service_provider_profiles or chat_users
    const userTables = ['service_provider_profiles', 'chat_users', 'marketplace_users'];
    
    userTables.forEach(tableName => {
      if (tables.find(t => t.name === tableName)) {
        console.log(`🔍 Checking ${tableName} for damirchev92@gmail.com:`);
        
        db.all(
          `SELECT * FROM ${tableName} WHERE email = 'damirchev92@gmail.com' OR email LIKE '%damirchev%'`,
          (err, users) => {
            if (err) {
              console.error(`❌ Error querying ${tableName}:`, err);
              return;
            }
            
            if (users.length === 0) {
              console.log(`   ❌ No matching users found in ${tableName}`);
            } else {
              console.log(`   ✅ Found ${users.length} user(s):`);
              users.forEach(user => {
                console.log(`      ID: ${user.id || user.user_id}`);
                console.log(`      Email: ${user.email}`);
                console.log(`      Name: ${user.name || user.first_name || 'N/A'}`);
                console.log('');
              });
            }
          }
        );
      }
    });
    
    // Check referral tables
    setTimeout(() => {
      console.log('🔍 Checking referral tables:');
      
      db.all("SELECT * FROM sp_referral_codes", (err, codes) => {
        if (err) {
          console.error('❌ Error checking referral codes:', err);
        } else {
          console.log(`   📝 Referral codes: ${codes.length}`);
          codes.forEach(code => {
            console.log(`      Code: ${code.referral_code}, User: ${code.user_id}`);
          });
        }
      });
      
      db.all("SELECT * FROM sp_referrals", (err, referrals) => {
        if (err) {
          console.error('❌ Error checking referrals:', err);
        } else {
          console.log(`   🔗 Referrals: ${referrals.length}`);
          referrals.forEach(ref => {
            console.log(`      ID: ${ref.id}, Referrer: ${ref.referrer_user_id}, Referred: ${ref.referred_user_id}`);
          });
        }
        
        db.close();
      });
    }, 1000);
  }
);
