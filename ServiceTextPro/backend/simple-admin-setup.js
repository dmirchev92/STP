// Simple Admin User Setup (No Complex SQL)
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

async function setupSimpleAdmin() {
  console.log('👑 Setting up simple admin user...');
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // 1. Create users table if it doesn't exist
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          role TEXT DEFAULT 'user',
          is_active BOOLEAN DEFAULT 1,
          email_verified BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, function(err) {
        if (err) reject(err);
        else {
          console.log('✅ Users table ready');
          resolve();
        }
      });
    });

    // 2. Create admin user
    const passwordHash = crypto.createHash('sha256').update('Admin123!').digest('hex');
    const adminId = 'admin-' + Date.now();
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO users (
          id, email, password_hash, first_name, last_name, 
          role, is_active, email_verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        adminId,
        'admin@servicetextpro.com',
        passwordHash,
        'System',
        'Administrator',
        'admin',
        1, // is_active
        1, // email_verified
        new Date().toISOString(),
        new Date().toISOString()
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Admin user created successfully!');
          console.log('   ID:', adminId);
          console.log('   Email: admin@servicetextpro.com');
          console.log('   Password: Admin123!');
          console.log('   Role: admin');
          resolve();
        }
      });
    });

    console.log('');
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('   Email: admin@servicetextpro.com');
    console.log('   Password: Admin123!');
    console.log('');
    console.log('🔗 ADMIN ACCESS:');
    console.log('   1. Login at: http://192.168.0.129:3002/auth/login');
    console.log('   2. Admin panel: http://192.168.0.129:3002/admin');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    db.close();
  }
}

setupSimpleAdmin().catch(console.error);
