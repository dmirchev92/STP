#!/usr/bin/env node

/**
 * Test Review Name Consistency
 * 
 * This script:
 * 1. Finds the user with email damirchev92@gmail.com
 * 2. Creates a completed case for that user
 * 3. Creates a 5-star review with random comment
 * 4. Shows current review with provider name
 * 5. Instructions to change name and verify consistency
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'ServiceTextPro', 'backend', 'data', 'service_text_pro.db');

// Random positive comments for 5-star reviews
const POSITIVE_COMMENTS = [
  'Отлична работа! Много съм доволен от услугата.',
  'Професионално и бързо обслужване. Препоръчвам!',
  'Перфектно изпълнение! Благодаря за качествената работа.',
  'Изключително доволен съм! Ще ползвам услугите отново.',
  'Страхотен специалист! Работата е свършена безупречно.',
  'Много добро отношение и качествена работа. 5 звезди!',
  'Бърза реакция и отлично изпълнение. Браво!',
  'Супер професионалист! Всичко е направено перфектно.'
];

function getRandomComment() {
  return POSITIVE_COMMENTS[Math.floor(Math.random() * POSITIVE_COMMENTS.length)];
}

function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

async function findUserByEmail(db, email) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, email, first_name, last_name, phone_number, role FROM users WHERE email = ?',
      [email],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

async function findCustomerUser(db) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, email, first_name, last_name FROM users WHERE role = ? LIMIT 1',
      ['customer'],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

async function createCompletedCase(db, providerId, customerId) {
  return new Promise((resolve, reject) => {
    const caseId = uuidv4();
    const now = new Date().toISOString();
    
    db.run(
      `INSERT INTO marketplace_service_cases (
        id, customer_id, provider_id, service_type, description,
        status, priority, created_at, updated_at, completed_at,
        customer_name, customer_email, customer_phone, provider_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        caseId,
        customerId,
        providerId,
        'electrician',
        'Тестова заявка за проверка на консистентността на отзивите',
        'completed',
        'medium',
        now,
        now,
        now,
        'Тестов Клиент',
        'test@example.com',
        '+359888123456',
        'Test Provider'
      ],
      function(err) {
        if (err) reject(err);
        else {
          console.log(`✅ Created completed case: ${caseId}`);
          resolve(caseId);
        }
      }
    );
  });
}

async function createReview(db, caseId, customerId, providerId, comment) {
  return new Promise((resolve, reject) => {
    const reviewId = uuidv4();
    const now = new Date().toISOString();
    
    db.run(
      `INSERT INTO case_reviews (
        id, case_id, customer_id, provider_id, rating,
        comment, service_quality, communication, timeliness,
        value_for_money, would_recommend, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reviewId,
        caseId,
        customerId,
        providerId,
        5, // 5-star rating
        comment,
        5, // service_quality
        5, // communication
        5, // timeliness
        5, // value_for_money
        1, // would_recommend (true)
        now,
        now
      ],
      function(err) {
        if (err) reject(err);
        else {
          console.log(`✅ Created 5-star review: ${reviewId}`);
          resolve(reviewId);
        }
      }
    );
  });
}

async function updateProviderRating(db, providerId) {
  return new Promise((resolve, reject) => {
    // Calculate average rating
    db.get(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating
       FROM case_reviews 
       WHERE provider_id = ?`,
      [providerId],
      (err, stats) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Update service_provider_profiles table
        db.run(
          `UPDATE service_provider_profiles 
           SET rating = ?, total_reviews = ?, updated_at = datetime('now')
           WHERE user_id = ?`,
          [stats.average_rating || 0, stats.total_reviews || 0, providerId],
          function(updateErr) {
            if (updateErr) reject(updateErr);
            else {
              console.log(`✅ Updated provider rating: ${stats.average_rating?.toFixed(2)} (${stats.total_reviews} reviews)`);
              resolve();
            }
          }
        );
      }
    );
  });
}

async function getReviewWithProviderName(db, reviewId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 
        r.*,
        u.first_name,
        u.last_name,
        sp.business_name,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name
       FROM case_reviews r
       JOIN users u ON r.provider_id = u.id
       LEFT JOIN service_provider_profiles sp ON u.id = sp.user_id
       JOIN users c ON r.customer_id = c.id
       WHERE r.id = ?`,
      [reviewId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

async function main() {
  console.log('🧪 Test Review Name Consistency');
  console.log('=' .repeat(60));
  
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err);
      process.exit(1);
    }
  });
  
  try {
    // Step 1: Find provider user
    console.log('\n📧 Step 1: Finding user with email damirchev92@gmail.com...');
    const provider = await findUserByEmail(db, 'damirchev92@gmail.com');
    
    if (!provider) {
      console.error('❌ User not found with email damirchev92@gmail.com');
      process.exit(1);
    }
    
    console.log(`✅ Found provider: ${provider.first_name} ${provider.last_name}`);
    console.log(`   User ID: ${provider.id}`);
    console.log(`   Role: ${provider.role}`);
    
    // Step 2: Find a customer user
    console.log('\n👤 Step 2: Finding a customer user...');
    const customer = await findCustomerUser(db);
    
    if (!customer) {
      console.error('❌ No customer user found in database');
      process.exit(1);
    }
    
    console.log(`✅ Found customer: ${customer.first_name} ${customer.last_name}`);
    console.log(`   Customer ID: ${customer.id}`);
    
    // Step 3: Create completed case
    console.log('\n📋 Step 3: Creating completed case...');
    const caseId = await createCompletedCase(db, provider.id, customer.id);
    
    // Step 4: Create 5-star review
    console.log('\n⭐ Step 4: Creating 5-star review...');
    const comment = getRandomComment();
    console.log(`   Comment: "${comment}"`);
    const reviewId = await createReview(db, caseId, customer.id, provider.id, comment);
    
    // Step 5: Update provider rating
    console.log('\n📊 Step 5: Updating provider rating...');
    await updateProviderRating(db, provider.id);
    
    // Step 6: Show review with current provider name
    console.log('\n👀 Step 6: Fetching review with provider name...');
    const review = await getReviewWithProviderName(db, reviewId);
    
    console.log('\n' + '='.repeat(60));
    console.log('📝 REVIEW CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n⭐ Rating: ${review.rating}/5`);
    console.log(`💬 Comment: "${review.comment}"`);
    console.log(`\n👤 Provider Information (from database JOIN):`);
    console.log(`   First Name: ${review.first_name}`);
    console.log(`   Last Name: ${review.last_name}`);
    console.log(`   Business Name: ${review.business_name || 'N/A'}`);
    console.log(`   Display Name: ${review.business_name || `${review.first_name} ${review.last_name}`}`);
    console.log(`\n👥 Customer: ${review.customer_first_name} ${review.customer_last_name}`);
    console.log(`\n🆔 Review ID: ${reviewId}`);
    console.log(`📋 Case ID: ${caseId}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST INSTRUCTIONS:');
    console.log('='.repeat(60));
    console.log('\n1. Go to: http://192.168.0.129:3002/settings');
    console.log('2. Click "Редактирай профил"');
    console.log('3. Change your name (First Name, Last Name, or Business Name)');
    console.log('4. Save the changes');
    console.log('5. Go to your provider profile page');
    console.log('6. Check the reviews section');
    console.log('\n✅ EXPECTED RESULT:');
    console.log('   The review should show your NEW name automatically!');
    console.log('   This proves the database is properly normalized and');
    console.log('   all data stays consistent when you update your profile.');
    console.log('\n💡 WHY IT WORKS:');
    console.log('   Reviews store only provider_id (not the name)');
    console.log('   Names are fetched via JOIN at display time');
    console.log('   So changing your name updates ALL reviews automatically!');
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
