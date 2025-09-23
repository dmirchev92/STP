
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Recovery function
const recoverFromBackup = (backupFile) => {
  const dbPath = path.join(__dirname, 'data', 'servicetext_pro.db');
  const backupPath = path.join(__dirname, 'backups', backupFile);
  
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, dbPath);
    console.log('✅ Database recovered from:', backupFile);
  } else {
    console.error('❌ Backup file not found:', backupFile);
  }
};

// List available backups
const listBackups = () => {
  const backupDir = path.join(__dirname, 'backups');
  if (fs.existsSync(backupDir)) {
    const backups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('servicetext_pro_backup_'))
      .sort()
      .reverse();
    
    console.log('📋 Available backups:');
    backups.forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup}`);
    });
    
    return backups;
  }
  return [];
};

// Usage: node recover.js [backup_filename]
if (process.argv[2]) {
  recoverFromBackup(process.argv[2]);
} else {
  console.log('Usage: node recover.js <backup_filename>');
  listBackups();
}
