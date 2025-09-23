const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'servicetext_pro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Updating referral_clicks table schema...');

db.serialize(() => {
  // Add new columns to existing referral_clicks table
  db.run(`ALTER TABLE referral_clicks ADD COLUMN customer_user_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding customer_user_id column:', err);
    } else {
      console.log('✅ Added customer_user_id column');
    }
  });

  db.run(`ALTER TABLE referral_clicks ADD COLUMN visitor_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding visitor_id column:', err);
    } else {
      console.log('✅ Added visitor_id column');
    }
  });

  // Verify the updated schema
  setTimeout(() => {
    db.all("PRAGMA table_info(referral_clicks)", (err, columns) => {
      if (err) {
        console.error('Error checking table schema:', err);
      } else {
        console.log('📋 Updated referral_clicks table schema:');
        columns.forEach(col => {
          console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''}`);
        });
      }
      db.close();
    });
  }, 500);
});
