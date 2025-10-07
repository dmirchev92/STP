const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'servicetext_pro.db');

console.log('🔍 Verifying case_income table...');
console.log('📂 Database path:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Check if table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='case_income'", (err, row) => {
  if (err) {
    console.error('❌ Error checking table:', err);
    process.exit(1);
  }
  
  if (row) {
    console.log('✅ case_income table exists');
    
    // Get table structure
    db.all("PRAGMA table_info(case_income)", (err, columns) => {
      if (err) {
        console.error('❌ Error getting table info:', err);
      } else {
        console.log('\n📋 Table structure:');
        columns.forEach(col => {
          console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
        });
      }
      
      // Check indexes
      db.all("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='case_income'", (err, indexes) => {
        if (err) {
          console.error('❌ Error getting indexes:', err);
        } else {
          console.log('\n📊 Indexes:');
          indexes.forEach(idx => {
            console.log(`  - ${idx.name}`);
          });
        }
        
        // Get row count
        db.get("SELECT COUNT(*) as count FROM case_income", (err, result) => {
          if (err) {
            console.error('❌ Error counting rows:', err);
          } else {
            console.log(`\n💰 Income records: ${result.count}`);
          }
          
          db.close((err) => {
            if (err) {
              console.error('❌ Error closing database:', err);
            } else {
              console.log('\n✅ Verification complete!');
            }
          });
        });
      });
    });
  } else {
    console.log('❌ case_income table does NOT exist');
    db.close();
    process.exit(1);
  }
});
