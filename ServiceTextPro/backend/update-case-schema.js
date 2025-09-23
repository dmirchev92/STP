const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'data', 'servicetext_pro.db');

console.log('🔄 Updating case management schema...');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Check current schema
db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='marketplace_service_cases'", (err, rows) => {
  if (err) {
    console.error('❌ Error checking schema:', err);
    db.close();
    return;
  }

  console.log('\n📊 Current marketplace_service_cases schema:');
  if (rows.length > 0) {
    console.log(rows[0].sql);
  } else {
    console.log('Table does not exist');
  }

  // Update schema to support new status system
  console.log('\n🔄 Updating schema for new status system...');
  
  // First, let's see what statuses currently exist
  db.all("SELECT DISTINCT status FROM marketplace_service_cases", (err, statusRows) => {
    if (!err && statusRows) {
      console.log('\n📈 Current statuses in use:');
      statusRows.forEach(row => console.log(`   - ${row.status}`));
    }

    // Update existing statuses to new system
    console.log('\n🔄 Mapping old statuses to new system...');
    
    // pending -> open
    db.run("UPDATE marketplace_service_cases SET status = 'open' WHERE status = 'pending'", function(err) {
      if (err) {
        console.error('❌ Error updating pending to open:', err);
      } else {
        console.log(`✅ Updated ${this.changes} pending cases to open`);
      }
    });

    // accepted -> wip (work in progress)
    db.run("UPDATE marketplace_service_cases SET status = 'wip' WHERE status = 'accepted'", function(err) {
      if (err) {
        console.error('❌ Error updating accepted to wip:', err);
      } else {
        console.log(`✅ Updated ${this.changes} accepted cases to wip`);
      }
    });

    // declined -> closed
    db.run("UPDATE marketplace_service_cases SET status = 'closed' WHERE status = 'declined'", function(err) {
      if (err) {
        console.error('❌ Error updating declined to closed:', err);
      } else {
        console.log(`✅ Updated ${this.changes} declined cases to closed`);
      }
    });

    // Add customer_id column if it doesn't exist
    db.run("ALTER TABLE marketplace_service_cases ADD COLUMN customer_id TEXT", function(err) {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Error adding customer_id column:', err);
      } else if (!err) {
        console.log('✅ Added customer_id column');
      }
    });

    // Add category column if it doesn't exist (for filtering)
    db.run("ALTER TABLE marketplace_service_cases ADD COLUMN category TEXT", function(err) {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Error adding category column:', err);
      } else if (!err) {
        console.log('✅ Added category column');
      }
    });

    // Update category based on service_type
    setTimeout(() => {
      console.log('\n🔄 Mapping service_type to category...');
      
      const categoryMappings = [
        { serviceType: 'electrician', category: 'electrician' },
        { serviceType: 'plumber', category: 'plumber' },
        { serviceType: 'hvac', category: 'hvac' },
        { serviceType: 'carpenter', category: 'carpenter' },
        { serviceType: 'painter', category: 'painter' },
        { serviceType: 'locksmith', category: 'locksmith' },
        { serviceType: 'cleaner', category: 'cleaner' },
        { serviceType: 'gardener', category: 'gardener' },
        { serviceType: 'handyman', category: 'handyman' },
        { serviceType: 'appliance_repair', category: 'appliance_repair' }
      ];

      categoryMappings.forEach(mapping => {
        db.run(
          "UPDATE marketplace_service_cases SET category = ? WHERE service_type = ? AND category IS NULL",
          [mapping.category, mapping.serviceType],
          function(err) {
            if (err) {
              console.error(`❌ Error updating category for ${mapping.serviceType}:`, err);
            } else if (this.changes > 0) {
              console.log(`✅ Updated ${this.changes} cases from ${mapping.serviceType} to ${mapping.category}`);
            }
          }
        );
      });

      // Set default category for cases without specific mapping
      setTimeout(() => {
        db.run(
          "UPDATE marketplace_service_cases SET category = 'general' WHERE category IS NULL",
          function(err) {
            if (err) {
              console.error('❌ Error setting default category:', err);
            } else if (this.changes > 0) {
              console.log(`✅ Set default category for ${this.changes} cases`);
            }
          }
        );

        // Final verification
        setTimeout(() => {
          console.log('\n📊 Final verification:');
          
          db.all("SELECT status, COUNT(*) as count FROM marketplace_service_cases GROUP BY status", (err, statusRows) => {
            if (!err && statusRows) {
              console.log('Status distribution:');
              statusRows.forEach(row => console.log(`   ${row.status}: ${row.count}`));
            }
          });

          db.all("SELECT category, COUNT(*) as count FROM marketplace_service_cases GROUP BY category", (err, categoryRows) => {
            if (!err && categoryRows) {
              console.log('Category distribution:');
              categoryRows.forEach(row => console.log(`   ${row.category}: ${row.count}`));
            }
          });

          console.log('\n🎉 Case schema update completed!');
          console.log('\nNew status system:');
          console.log('   - open: Available for providers to accept');
          console.log('   - wip: Work in progress (accepted by provider)');
          console.log('   - closed: Completed or cancelled');
          
          db.close();
        }, 1000);
      }, 500);
    }, 500);
  });
});
