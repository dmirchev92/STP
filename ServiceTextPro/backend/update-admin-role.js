// Simple Admin Role Update
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Update user role to admin
db.run(`
  UPDATE users 
  SET role = 'admin' 
  WHERE email = 'admin@servicetextpro.com'
`, function(err) {
  if (err) {
    console.error('❌ Error:', err.message);
  } else {
    console.log('✅ Admin role updated successfully!');
    console.log('📧 Email: admin@servicetextpro.com');
    console.log('👑 Role: admin');
    console.log(`🔄 Rows changed: ${this.changes}`);
  }
  db.close();
});
