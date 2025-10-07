// Industry Standard RBAC Database Setup
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'database.sqlite');
const sqlPath = path.join(__dirname, 'create-rbac-system.sql');

async function setupRBACDatabase() {
  console.log('🏗️  Setting up Industry Standard RBAC System...');
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Read and execute SQL schema
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      await new Promise((resolve, reject) => {
        db.run(statement.trim(), function(err) {
          if (err) {
            console.error('❌ SQL Error:', err.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    
    console.log('✅ RBAC database schema created successfully!');
    
    // Create default admin user
    await createDefaultAdmin(db);
    
    console.log('🎉 RBAC system setup complete!');
    console.log('');
    console.log('📋 ADMIN ACCESS:');
    console.log('   Email: admin@servicetextpro.com');
    console.log('   Password: Admin123!');
    console.log('   Role: admin');
    console.log('');
    console.log('🔒 SECURITY FEATURES:');
    console.log('   ✅ Role-based access control');
    console.log('   ✅ Permission system');
    console.log('   ✅ Admin activity logging');
    console.log('   ✅ GDPR compliance');
    console.log('   ✅ Security audit trail');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    db.close();
  }
}

async function createDefaultAdmin(db) {
  console.log('👑 Creating default admin user...');
  
  // Simple hash for demo (in production, use proper bcrypt)
  const passwordHash = crypto.createHash('sha256').update('Admin123!').digest('hex');
  const adminId = 'admin-' + Date.now();
  
  await new Promise((resolve, reject) => {
    db.run(`
      INSERT OR REPLACE INTO users (
        id, email, password_hash, first_name, last_name, 
        role, is_active, email_verified, 
        gdpr_consent_given, gdpr_consent_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      adminId,
      'admin@servicetextpro.com',
      passwordHash,
      'System',
      'Administrator',
      'admin',
      1, // is_active
      1, // email_verified
      1, // gdpr_consent_given
      new Date().toISOString(),
      new Date().toISOString(),
      new Date().toISOString()
    ], function(err) {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Admin user created with ID:', adminId);
        resolve();
      }
    });
  });
  
  // Grant all admin permissions
  const adminPermissions = [
    'admin.*',
    'users.read',
    'users.write',
    'users.delete',
    'system.manage',
    'security.manage',
    'sms.manage',
    'analytics.read'
  ];
  
  for (const permission of adminPermissions) {
    await new Promise((resolve, reject) => {
      const permissionId = 'perm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      db.run(`
        INSERT OR IGNORE INTO user_permissions (
          id, user_id, permission, granted_by, granted_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        permissionId,
        adminId,
        permission,
        adminId, // self-granted
        new Date().toISOString()
      ], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  console.log('✅ Admin permissions granted');
}

// Run setup
setupRBACDatabase().catch(console.error);
