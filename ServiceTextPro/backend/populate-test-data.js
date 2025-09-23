const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Connect to database
const dbPath = path.join(__dirname, 'data', 'servicetext_pro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Populating test data for ServiceText Pro...');

// Test service providers data
const testProviders = [
  {
    id: uuidv4(),
    email: 'ivan.petrov@example.com',
    firstName: 'Иван',
    lastName: 'Петров',
    phoneNumber: '+359888123456',
    businessName: 'Електро Петров ЕООД',
    serviceCategory: 'electrician',
    description: 'Професионални електротехнически услуги с над 15 години опит. Извършваме всички видове електромонтажни работи.',
    experienceYears: 15,
    hourlyRate: 45.00,
    city: 'София',
    neighborhood: 'Център',
    address: 'ул. Витоша 15',
    rating: 4.8,
    totalReviews: 127
  },
  {
    id: uuidv4(),
    email: 'maria.georgieva@example.com',
    firstName: 'Мария',
    lastName: 'Георгиева',
    phoneNumber: '+359888234567',
    businessName: 'Водопроводни услуги Мария',
    serviceCategory: 'plumber',
    description: 'Бързи и качествени водопроводни услуги. Аварийни повиквания 24/7. Гаранция върху всички работи.',
    experienceYears: 8,
    hourlyRate: 40.00,
    city: 'София',
    neighborhood: 'Лозенец',
    address: 'бул. Черни връх 47',
    rating: 4.9,
    totalReviews: 89
  },
  {
    id: uuidv4(),
    email: 'georgi.klimatik@example.com',
    firstName: 'Георги',
    lastName: 'Димитров',
    phoneNumber: '+359888345678',
    businessName: 'Климатик Експерт',
    serviceCategory: 'hvac',
    description: 'Монтаж, ремонт и поддръжка на климатични системи. Работим с всички марки и модели.',
    experienceYears: 12,
    hourlyRate: 50.00,
    city: 'София',
    neighborhood: 'Младост',
    address: 'ул. Андрей Ляпчев 3',
    rating: 4.7,
    totalReviews: 156
  },
  {
    id: uuidv4(),
    email: 'stefan.carpenter@example.com',
    firstName: 'Стефан',
    lastName: 'Стефанов',
    phoneNumber: '+359888456789',
    businessName: 'Дърводелски услуги Стефан',
    serviceCategory: 'carpenter',
    description: 'Изработка на мебели по поръчка, ремонт на врати и прозорци, всички дърводелски услуги.',
    experienceYears: 20,
    hourlyRate: 35.00,
    city: 'София',
    neighborhood: 'Витоша',
    address: 'ул. Околовръстен път 12',
    rating: 4.6,
    totalReviews: 203
  },
  {
    id: uuidv4(),
    email: 'elena.painter@example.com',
    firstName: 'Елена',
    lastName: 'Иванова',
    phoneNumber: '+359888567890',
    businessName: 'Боядисване Елена',
    serviceCategory: 'painter',
    description: 'Професионално боядисване на интериори и екстериори. Използваме само качествени материали.',
    experienceYears: 6,
    hourlyRate: 30.00,
    city: 'София',
    neighborhood: 'Красно село',
    address: 'ул. Пирин 8',
    rating: 4.5,
    totalReviews: 74
  }
];

async function populateData() {
  try {
    console.log('📝 Creating test users...');
    
    for (const provider of testProviders) {
      // Insert user
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO users (id, email, password_hash, role, first_name, last_name, phone_number, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            provider.id,
            provider.email,
            '$2a$10$dummy.hash.for.testing.purposes.only', // Dummy hash
            'service_provider',
            provider.firstName,
            provider.lastName,
            provider.phoneNumber,
            new Date().toISOString()
          ],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Insert service provider profile
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO service_provider_profiles (
            id, user_id, business_name, service_category, description, experience_years,
            hourly_rate, city, neighborhood, address, rating, total_reviews, 
            is_verified, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            provider.id,
            provider.businessName,
            provider.serviceCategory,
            provider.description,
            provider.experienceYears,
            provider.hourlyRate,
            provider.city,
            provider.neighborhood,
            provider.address,
            provider.rating,
            provider.totalReviews,
            1, // is_verified
            1, // is_active
            new Date().toISOString(),
            new Date().toISOString()
          ],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log(`✅ Created provider: ${provider.businessName}`);
    }

    console.log('🎯 Adding service categories...');
    
    const categories = [
      { id: uuidv4(), name: 'electrician', name_bg: 'Електротехник', description: 'Електротехнически услуги', icon_name: 'electric' },
      { id: uuidv4(), name: 'plumber', name_bg: 'Водопроводчик', description: 'Водопроводни услуги', icon_name: 'plumbing' },
      { id: uuidv4(), name: 'hvac', name_bg: 'Климатик', description: 'Климатични системи', icon_name: 'hvac' },
      { id: uuidv4(), name: 'carpenter', name_bg: 'Дърводелец', description: 'Дърводелски услуги', icon_name: 'carpenter' },
      { id: uuidv4(), name: 'painter', name_bg: 'Бояджия', description: 'Боядисване', icon_name: 'painter' },
      { id: uuidv4(), name: 'locksmith', name_bg: 'Ключар', description: 'Ключарски услуги', icon_name: 'locksmith' },
      { id: uuidv4(), name: 'cleaner', name_bg: 'Почистване', description: 'Почистващи услуги', icon_name: 'cleaner' },
      { id: uuidv4(), name: 'gardener', name_bg: 'Градинар', description: 'Градинарски услуги', icon_name: 'gardener' },
      { id: uuidv4(), name: 'handyman', name_bg: 'Майстор за всичко', description: 'Общи ремонти', icon_name: 'handyman' },
      { id: uuidv4(), name: 'appliance_repair', name_bg: 'Ремонт на уреди', description: 'Ремонт на домакински уреди', icon_name: 'appliance' }
    ];

    for (const category of categories) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO service_categories (id, name, name_bg, description, icon_name, created_at) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [category.id, category.name, category.name_bg, category.description, category.icon_name, new Date().toISOString()],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log('✅ Test data populated successfully!');
    console.log(`📊 Created ${testProviders.length} service providers`);
    console.log(`📊 Created ${categories.length} service categories`);
    
  } catch (error) {
    console.error('❌ Error populating test data:', error);
  } finally {
    db.close();
  }
}

populateData();
