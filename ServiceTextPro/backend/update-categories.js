const { SQLiteDatabase } = require('./src/models/SQLiteDatabase.ts');

const db = new SQLiteDatabase();

setTimeout(async () => {
  try {
    console.log('🔄 Updating provider categories for better diversity...');
    
    // Get all current providers
    const allProviders = await db.searchProviders({});
    console.log('📊 Found', allProviders.length, 'providers to update');
    
    if (allProviders.length >= 7) {
      // Update different providers to different categories
      const updates = [
        { index: 0, category: 'electrician', name: 'Електротехник' },
        { index: 1, category: 'plumber', name: 'Водопроводчик' },
        { index: 2, category: 'painter', name: 'Бояджия' },
        { index: 3, category: 'locksmith', name: 'Ключар' },
        { index: 4, category: 'cleaner', name: 'Почистване' },
        // Keep the rest as handyman
      ];
      
      for (const update of updates) {
        if (allProviders[update.index]) {
          const provider = allProviders[update.index];
          console.log(`🔄 Updating ${provider.business_name} to ${update.name}`);
          
          // Update in database using raw SQL since we don't have an update method
          await new Promise((resolve, reject) => {
            db.db.run(
              'UPDATE service_provider_profiles SET service_category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [update.category, provider.id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }
      
      console.log('✅ Provider categories updated successfully!');
      
      // Verify the changes
      console.log('\n📊 Updated category distribution:');
      const updatedProviders = await db.searchProviders({});
      const categories = {};
      updatedProviders.forEach(p => {
        categories[p.service_category] = (categories[p.service_category] || 0) + 1;
      });
      
      Object.entries(categories).forEach(([category, count]) => {
        console.log(`  ${category}: ${count} providers`);
      });
      
    } else {
      console.log('⚠️ Not enough providers to update');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}, 1000);





