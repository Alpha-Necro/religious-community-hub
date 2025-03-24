const { performanceMonitor } = require('../services/performanceMonitor');
const { cachingService } = require('../services/cachingService');
const { databaseService } = require('../services/databaseService');
const { requestHandler } = require('../middleware/requestHandler');

async function monitorPerformance() {
  try {
    // Initialize services
    await performanceMonitor.initialize();
    await cachingService.initialize();
    await databaseService.initialize();
    await requestHandler.initialize();

    console.log('Performance monitoring initialized successfully');

    // Start monitoring
    setInterval(async () => {
      try {
        // Collect metrics
        const cacheStats = cachingService.getCacheStatistics();
        const dbStats = databaseService.getQueryStatistics();
        const requestStats = requestHandler.getRequestStatistics();
        const performanceReport = performanceMonitor.generatePerformanceReport();

        // Log metrics
        console.log('\nPerformance Metrics Report:');
        console.log('===========================');
        console.log('\nCache Metrics:');
        console.log('---------------------------');
        console.log(`Hit Rate: ${cacheStats.hitRate.toFixed(2)}%`);
        console.log(`Miss Rate: ${cacheStats.missRate.toFixed(2)}%`);
        console.log(`Size: ${cacheStats.size}/${cacheStats.max}`);

        console.log('\nDatabase Metrics:');
        console.log('---------------------------');
        console.log(`Total Queries: ${dbStats.total}`);
        console.log(`Cached Queries: ${dbStats.cached}`);
        console.log(`Slow Queries: ${dbStats.slowQueries.length}`);

        console.log('\nRequest Metrics:');
        console.log('---------------------------');
        console.log(`Total Requests: ${requestStats.total}`);
        console.log(`Cached Requests: ${requestStats.cached}`);
        console.log(`Rate Limited: ${requestStats.rateLimited}`);

        // Check alerts
        if (Object.values(performanceMonitor.alerts).some(alert => alert)) {
          console.log('\nPerformance Alerts:');
          console.log('---------------------------');
          
          // Memory alerts
          if (performanceMonitor.alerts.memory) {
            console.log('\nMemory Alerts:');
            performanceMonitor.optimizations.memory.forEach(opt => console.log(`- ${opt}`));
          }

          // CPU alerts
          if (performanceMonitor.alerts.cpu) {
            console.log('\nCPU Alerts:');
            performanceMonitor.optimizations.cpu.forEach(opt => console.log(`- ${opt}`));
          }

          // API alerts
          if (performanceMonitor.alerts.api) {
            console.log('\nAPI Alerts:');
            performanceMonitor.optimizations.api.forEach(opt => console.log(`- ${opt}`));
          }

          // Database alerts
          if (performanceMonitor.alerts.database) {
            console.log('\nDatabase Alerts:');
            performanceMonitor.optimizations.database.forEach(opt => console.log(`- ${opt}`));
          }

          // Cache alerts
          if (performanceMonitor.alerts.cache) {
            console.log('\nCache Alerts:');
            performanceMonitor.optimizations.cache.forEach(opt => console.log(`- ${opt}`));
          }
        }

        // Save report
        await performanceMonitor.saveReportToFile(performanceReport);
      } catch (error) {
        console.error('Error monitoring performance:', error);
      }
    }, process.env.PERFORMANCE_MONITOR_INTERVAL || 60000); // 1 minute

  } catch (error) {
    console.error('Error initializing performance monitoring:', error);
    process.exit(1);
  }
}

monitorPerformance();
