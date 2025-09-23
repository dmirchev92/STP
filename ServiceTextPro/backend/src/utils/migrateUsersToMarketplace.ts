import { SQLiteDatabase } from '../models/SQLiteDatabase';

const db = new SQLiteDatabase();

/**
 * Migrate existing mobile app users to marketplace profiles
 */
export async function migrateUsersToMarketplace(): Promise<void> {
  console.log('🔄 Migrating existing users to marketplace profiles...');
  
  try {
    // Get all existing users from the mobile app
    const users = await getAllUsers();
    console.log(`📱 Found ${users.length} existing users`);

    if (users.length === 0) {
      console.log('ℹ️  No users found to migrate');
      return;
    }

    // Create marketplace profiles for each user
    let migratedCount = 0;
    for (const user of users) {
      try {
        // Check if user already has a marketplace profile
        const existingProfile = await getExistingProfile(user.id);
        
        if (existingProfile) {
          console.log(`⏭️  User ${user.first_name} ${user.last_name} already has a marketplace profile`);
          continue;
        }

        // Create a basic marketplace profile
        const profileData = {
          businessName: `${user.first_name} ${user.last_name}`,
          serviceCategory: 'handyman', // Default category - can be changed later
          description: `Професионални услуги от ${user.first_name} ${user.last_name}. Свържете се за повече информация.`,
          experienceYears: 5, // Default value
          hourlyRate: 25.0, // Default rate in BGN
          city: 'София', // Default city - should be updated by user
          neighborhood: 'Център',
          phoneNumber: user.phone_number,
          email: user.email,
          isVerified: false,
          isActive: true
        };

        await db.createOrUpdateProviderProfile(user.id, profileData);
        migratedCount++;
        
        console.log(`✅ Created marketplace profile for: ${user.first_name} ${user.last_name}`);
        
      } catch (error) {
        console.error(`❌ Error creating profile for user ${user.id}:`, error);
      }
    }

    console.log(`🎉 Successfully migrated ${migratedCount} users to marketplace profiles!`);
    
  } catch (error) {
    console.error('💥 Error during migration:', error);
    throw error;
  }
}

/**
 * Get all users from the database
 */
async function getAllUsers(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    (db as any).db.all(
      'SELECT * FROM users WHERE role = ?',
      ['tradesperson'], // Changed from 'service_provider' to 'tradesperson'
      (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Check if user already has a marketplace profile
 */
async function getExistingProfile(userId: string): Promise<any | null> {
  return new Promise((resolve, reject) => {
    (db as any).db.get(
      'SELECT id FROM service_provider_profiles WHERE user_id = ?',
      [userId],
      (err: any, row: any) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

/**
 * Show current migration status
 */
export async function showMigrationStatus(): Promise<void> {
  try {
    const users = await getAllUsers();
    const profiles = await getAllProfiles();
    
    console.log('\n📊 MIGRATION STATUS:');
    console.log(`👥 Total mobile app users: ${users.length}`);
    console.log(`🏪 Total marketplace profiles: ${profiles.length}`);
    console.log(`📱➡️🌐 Migration needed: ${users.length - profiles.length}`);
    
    if (profiles.length > 0) {
      console.log('\n🏪 Current marketplace profiles:');
      profiles.forEach((profile: any, index: number) => {
        console.log(`${index + 1}. ${profile.business_name} (${profile.service_category}) - ${profile.city}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error);
  }
}

/**
 * Get all marketplace profiles
 */
async function getAllProfiles(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    (db as any).db.all(
      'SELECT * FROM service_provider_profiles WHERE is_active = 1',
      (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// Run migration if this file is executed directly
if (require.main === module) {
  showMigrationStatus()
    .then(() => {
      console.log('\n🚀 Starting migration...');
      return migrateUsersToMarketplace();
    })
    .then(() => {
      console.log('\n📊 Final status:');
      return showMigrationStatus();
    })
    .then(() => {
      console.log('\n✨ Migration completed successfully!');
      console.log('\n🌐 Your mobile app users should now appear on the marketplace website!');
      console.log('🔗 Test it at: http://localhost:3000/api/v1/marketplace/providers/search');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}
