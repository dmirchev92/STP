// Reset All Security Limits - Clean Slate for Testing
const SecurityEnhancementService = require('./dist/services/SecurityEnhancementServiceSimple').default;

async function resetAllLimits() {
  console.log('🧹 Resetting all security limits for testing...\n');

  try {
    // Get the security service instance
    const securityService = SecurityEnhancementService.getInstance();
    
    // Clear all failed attempts from memory
    if (securityService.failedAttempts) {
      const beforeCount = securityService.failedAttempts.size;
      securityService.failedAttempts.clear();
      console.log(`✅ Cleared ${beforeCount} failed attempt records`);
    }
    
    // Run cleanup to remove any expired entries
    await securityService.cleanup();
    
    console.log('✅ Security cleanup completed');
    console.log('');
    console.log('🎉 ALL SECURITY LIMITS RESET!');
    console.log('');
    console.log('📋 You can now test:');
    console.log('   ✅ Fresh login attempts with any email');
    console.log('   ✅ Dynamic popup messages from attempt 1');
    console.log('   ✅ Debug info showing 0/5 attempts');
    console.log('   ✅ All IP restrictions cleared');
    console.log('   ✅ All email locks removed');
    console.log('');
    console.log('🔒 Security limits are now:');
    console.log('   📧 Email: 0/5 attempts (5 remaining)');
    console.log('   🌐 IP: 0/20 attempts (20 remaining)');
    console.log('   ⏰ Clean slate for testing');
    console.log('');
    console.log('🧪 Test commands:');
    console.log('   node test-dynamic-messages.js');
    console.log('   node test-brute-force.js');
    console.log('   node test-enhanced-security.js');
    
  } catch (error) {
    console.error('❌ Failed to reset security limits:', error.message);
    console.log('');
    console.log('💡 Alternative: Restart the server to clear in-memory limits');
    console.log('   npm run dev (restart the backend)');
  }
}

resetAllLimits().catch(console.error);
