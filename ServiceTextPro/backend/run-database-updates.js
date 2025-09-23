#!/usr/bin/env node

/**
 * Database Update Script for ServiceText Pro
 * 
 * This script applies all necessary database updates for:
 * - Smart Matching System
 * - Real-time Notifications
 * - Rating & Review System
 * - Chat Sessions (permanent access)
 * 
 * Usage: node run-database-updates.js
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database configuration
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'servicetext_pro.db');
const SQL_FILE = path.join(__dirname, 'database-updates.sql');

console.log('🔧 ServiceText Pro Database Update Script');
console.log('==========================================');
console.log('📁 Looking for database at:', DB_PATH);

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
    console.log('📁 Creating data directory...');
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found:', DB_PATH);
    console.log('');
    console.log('💡 To create the database, please:');
    console.log('   1. Start your backend server first: npm run dev');
    console.log('   2. The database will be created automatically');
    console.log('   3. Then run this script again');
    console.log('');
    process.exit(1);
}

// Check if SQL file exists
if (!fs.existsSync(SQL_FILE)) {
    console.error('❌ SQL update file not found:', SQL_FILE);
    process.exit(1);
}

// Read SQL file
let sqlContent;
try {
    sqlContent = fs.readFileSync(SQL_FILE, 'utf8');
    console.log('✅ SQL update file loaded successfully');
} catch (error) {
    console.error('❌ Error reading SQL file:', error.message);
    process.exit(1);
}

// Connect to database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Function to execute SQL statements
function executeSQLStatements(sql) {
    return new Promise((resolve, reject) => {
        // Split SQL into individual statements
        const statements = sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        let completed = 0;
        let errors = [];

        if (statements.length === 0) {
            resolve({ completed: 0, errors: [] });
            return;
        }

        console.log(`📋 Executing ${statements.length} SQL statements...`);

        // Execute each statement
        statements.forEach((statement, index) => {
            db.run(statement, function(err) {
                if (err) {
                    // Some errors are expected (like ALTER TABLE on existing columns)
                    if (err.message.includes('duplicate column name') || 
                        err.message.includes('already exists')) {
                        console.log(`⚠️  Statement ${index + 1}: ${err.message} (expected)`);
                    } else {
                        console.error(`❌ Statement ${index + 1} failed:`, err.message);
                        errors.push({ index: index + 1, error: err.message, statement: statement.substring(0, 100) });
                    }
                } else {
                    console.log(`✅ Statement ${index + 1}: Success`);
                }

                completed++;
                
                // Check if all statements are done
                if (completed === statements.length) {
                    resolve({ completed, errors });
                }
            });
        });
    });
}

// Function to verify tables
function verifyTables() {
    return new Promise((resolve, reject) => {
        const expectedTables = [
            'notifications',
            'case_reviews',
            'chat_sessions',
            'marketplace_service_cases',
            'service_provider_profiles',
            'users'
        ];

        db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN (${expectedTables.map(() => '?').join(',')})
        `, expectedTables, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            const existingTables = rows.map(row => row.name);
            const missingTables = expectedTables.filter(table => !existingTables.includes(table));

            console.log('\n📊 Table Verification:');
            existingTables.forEach(table => {
                console.log(`✅ ${table}`);
            });

            if (missingTables.length > 0) {
                console.log('\n⚠️  Missing tables:');
                missingTables.forEach(table => {
                    console.log(`❌ ${table}`);
                });
            }

            resolve({ existing: existingTables, missing: missingTables });
        });
    });
}

// Function to show table counts
function showTableCounts() {
    return new Promise((resolve, reject) => {
        const tables = ['notifications', 'case_reviews', 'chat_sessions', 'marketplace_service_cases', 'service_provider_profiles'];
        let completed = 0;
        const counts = {};

        console.log('\n📈 Table Record Counts:');

        tables.forEach(table => {
            db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
                if (err) {
                    console.log(`❌ ${table}: Error - ${err.message}`);
                } else {
                    console.log(`📋 ${table}: ${row.count} records`);
                    counts[table] = row.count;
                }

                completed++;
                if (completed === tables.length) {
                    resolve(counts);
                }
            });
        });
    });
}

// Main execution
async function main() {
    try {
        console.log('\n🚀 Starting database updates...');
        
        // Execute SQL statements
        const result = await executeSQLStatements(sqlContent);
        
        console.log(`\n📊 Update Summary:`);
        console.log(`✅ Statements completed: ${result.completed}`);
        console.log(`❌ Errors encountered: ${result.errors.length}`);

        if (result.errors.length > 0) {
            console.log('\n🔍 Error Details:');
            result.errors.forEach(error => {
                console.log(`   ${error.index}: ${error.error}`);
            });
        }

        // Verify tables exist
        console.log('\n🔍 Verifying database structure...');
        const verification = await verifyTables();
        
        if (verification.missing.length === 0) {
            console.log('✅ All required tables are present');
        } else {
            console.log('⚠️  Some tables are missing - please check the errors above');
        }

        // Show table counts
        await showTableCounts();

        console.log('\n🎉 Database update completed!');
        console.log('\nYou can now:');
        console.log('1. Restart your backend server');
        console.log('2. Test the smart matching system');
        console.log('3. Test notifications');
        console.log('4. Test the review system');

    } catch (error) {
        console.error('\n❌ Database update failed:', error.message);
        process.exit(1);
    } finally {
        // Close database connection
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
            } else {
                console.log('\n✅ Database connection closed');
            }
        });
    }
}

// Run the script
main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});
