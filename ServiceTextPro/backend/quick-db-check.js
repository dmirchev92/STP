// Quick Database Check
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function quickCheck() {
  console.log('🔍 Quick Database Check\n');

  // Check main database (used by your app)
  console.log('📁 MAIN DATABASE (Used by npm run dev):');
  console.log('   File: data/servicetext_pro.db');
  const mainDb = new sqlite3.Database(path.join(__dirname, 'data', 'servicetext_pro.db'));
  
  const mainTables = await new Promise((resolve, reject) => {
    mainDb.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(row => row.name));
    });
  });
  
  console.log(`   Tables: ${mainTables.join(', ')}`);
  
  if (mainTables.includes('users')) {
    const userCount = await new Promise((resolve, reject) => {
      mainDb.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    console.log(`   Users: ${userCount}`);
  }
  
  mainDb.close();

  // Check secondary database
  console.log('\n📁 SECONDARY DATABASE:');
  console.log('   File: data/servicetext.db');
  const secondDb = new sqlite3.Database(path.join(__dirname, 'data', 'servicetext.db'));
  
  const secondTables = await new Promise((resolve, reject) => {
    secondDb.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(row => row.name));
    });
  });
  
  console.log(`   Tables: ${secondTables.join(', ')}`);
  
  if (secondTables.includes('users')) {
    const userCount = await new Promise((resolve, reject) => {
      secondDb.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    console.log(`   Users: ${userCount}`);
  }
  
  secondDb.close();

  console.log('\n🎯 CONCLUSION:');
  console.log('   Your app (npm run dev) uses: data/servicetext_pro.db');
  console.log('   The other database appears to be for scripts or legacy data');
}

quickCheck().catch(console.error);
