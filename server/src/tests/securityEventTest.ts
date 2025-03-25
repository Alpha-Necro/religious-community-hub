import { RedisManager } from '../config/redis';
import { PerformanceMonitor } from '../services/performanceMonitor';
import { RedisService } from '../services/redisService';
import { SecurityAuditService } from '../services/securityAuditService';

// Initialize services
const redisManager = RedisManager.getInstance();
const performanceMonitor = PerformanceMonitor.getInstance();
const redisService = RedisService.getInstance();
const securityAuditService = SecurityAuditService.getInstance();

// Test configuration
const TEST_KEY = 'security_test_key';
const TEST_VALUE = 'sensitive_data';
const TEST_DURATION = 30000; // 30 seconds

// Test security event handling
async function testSecurityEvents() {
  console.log('Starting security event test...');
  
  // Initialize metrics
  performanceMonitor.start();
  
  try {
    // Test normal operation
    await redisService.set(TEST_KEY, TEST_VALUE);
    console.log('Normal operation successful');
    
    // Test security event logging
    await securityAuditService.logDataAccessEvent(
      undefined,
      'read',
      `redis_${TEST_KEY}`,
      true,
      { key: TEST_KEY, value: TEST_VALUE },
      undefined,
      undefined
    );
    
    // Test unauthorized access attempt
    try {
      // Simulate unauthorized access
      await redisService.get('nonexistent_key');
      console.log('Unauthorized access attempt logged');
    } catch (error) {
      console.error('Error during unauthorized access test:', error);
    }
    
    // Test error handling
    try {
      await redisService.get('malformed_key!');
    } catch (error) {
      console.log('Error handling test successful');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Print final metrics
    console.log('\nFinal Metrics:');
    console.log('Redis Metrics:', redisManager.redisMetrics);
    console.log('Performance Metrics:', performanceMonitor.getMetrics());
  }
}

// Run the test
testSecurityEvents().catch(console.error);
