import { RedisManager } from '../config/redis';
import { PerformanceMonitor } from '../services/performanceMonitor';
import { RedisService } from '../services/redisService';
import { SecurityAuditService } from '../services/securityAuditService';

// Initialize services
const redisManager = RedisManager.getInstance();
const performanceMonitor = PerformanceMonitor.getInstance();
const redisService = RedisService.getInstance();
const securityAuditService = SecurityAuditService.getInstance();

// Simulation configuration
const SIMULATION_DURATION = 60000; // 1 minute
const LOAD_INTERVAL = 100; // 100ms between operations
const FAILURE_PROBABILITY = 0.1; // 10% chance of failure
const TEST_KEY = 'emergency_test_key';

// Simulate high load with controlled failures
async function runSimulation() {
  console.log('Starting emergency system simulation...');
  
  // Initialize metrics
  performanceMonitor.start();
  
  // Start simulation
  const startTime = Date.now();
  let operationsCount = 0;
  let failuresCount = 0;
  
  // Run simulation loop
  while (Date.now() - startTime < SIMULATION_DURATION) {
    let operation: 'get' | 'set' = Math.random() < 0.5 ? 'get' : 'set';
    let value: string;
    
    try {
      // Simulate random operation
      value = Math.random().toString();
      
      // Introduce random failure
      if (Math.random() < FAILURE_PROBABILITY) {
        failuresCount++;
        throw new Error('Simulated Redis failure');
      }
      
      // Perform operation
      if (operation === 'get') {
        await redisService.get(TEST_KEY);
      } else {
        await redisService.set(TEST_KEY, value);
      }
      
      operationsCount++;
    } catch (error: any) {
      // Log security event
      const op = operation === 'get' ? 'read' : 'write';
      await securityAuditService.logDataAccessEvent(
        undefined,
        op,
        `redis_${TEST_KEY}`,
        false,
        { key: TEST_KEY, operation: op, error: error.message },
        undefined,
        undefined
      );
    }
    
    // Add delay between operations
    await new Promise(resolve => setTimeout(resolve, LOAD_INTERVAL));
  }
  
  // Print simulation results
  console.log('\nSimulation completed');
  console.log('Total operations:', operationsCount);
  console.log('Total failures:', failuresCount);
  console.log('Failure rate:', (failuresCount / operationsCount * 100).toFixed(2) + '%');
  
  // Print final metrics
  console.log('\nFinal Metrics:');
  console.log('Redis Metrics:', redisManager.redisMetrics);
  console.log('Performance Metrics:', performanceMonitor.getMetrics());
}

// Run the simulation
runSimulation().catch(console.error);
