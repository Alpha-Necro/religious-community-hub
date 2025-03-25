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
const TEST_KEY = 'failure_test_key';
const TEST_VALUE = 'test_value';
const TEST_DURATION = 30000; // 30 seconds

// Test Redis failure handling
async function testRedisFailure() {
  console.log('Starting Redis failure test...');
  
  // Initialize metrics
  performanceMonitor.start();
  
  try {
    // Perform initial successful operation
    await redisService.set(TEST_KEY, TEST_VALUE);
    console.log('Initial set operation successful');
    
    // Simulate Redis failure
    console.log('Simulating Redis failure...');
    redisManager.client.disconnect();
    
    // Attempt operations during failure
    try {
      await redisService.get(TEST_KEY);
      console.error('Error: Get operation should have failed');
    } catch (error) {
      console.log('Get operation failed as expected');
    }
    
    // Wait for reconnection
    console.log('Waiting for Redis to reconnect...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify recovery
    try {
      await redisService.get(TEST_KEY);
      console.log('Redis recovered successfully');
    } catch (error) {
      console.error('Error: Redis did not recover properly');
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
testRedisFailure().catch(console.error);
