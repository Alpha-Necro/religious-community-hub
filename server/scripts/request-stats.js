const { requestHandler } = require('../middleware/requestHandler');
const { performanceMonitor } = require('../services/performanceMonitor');

async function getRequestStats() {
  try {
    // Initialize services
    await requestHandler.initialize();
    await performanceMonitor.initialize();

    console.log('Request statistics initialized successfully');

    // Start monitoring
    setInterval(async () => {
      try {
        // Get request statistics
        const requestStats = requestHandler.getRequestStatistics();

        // Log request metrics
        console.log('\nRequest Statistics Report:');
        console.log('===========================');
        console.log('\nOverall Metrics:');
        console.log('---------------------------');
        console.log(`Total Requests: ${requestStats.total}`);
        console.log(`Cached Requests: ${requestStats.cached}`);
        console.log(`Rate Limited: ${requestStats.rateLimited}`);
        console.log(`Validation Errors: ${requestStats.validationErrors}`);

        // Log endpoint distribution
        console.log('\nEndpoint Distribution:');
        console.log('---------------------------');
        Object.entries(requestStats.endpointDistribution).forEach(([endpoint, percentage]) => {
          console.log(`${endpoint}: ${percentage.toFixed(2)}%`);
        });

        // Log method distribution
        console.log('\nMethod Distribution:');
        console.log('---------------------------');
        Object.entries(requestStats.methodDistribution).forEach(([method, percentage]) => {
          console.log(`${method}: ${percentage.toFixed(2)}%`);
        });

        // Log response time distribution
        console.log('\nResponse Time Distribution:');
        console.log('---------------------------');
        requestStats.responseTimeDistribution.forEach(([endpoint, duration]) => {
          console.log(`${endpoint}: ${duration}ms`);
        });

        // Check for optimization opportunities
        const optimizationOpportunities = [];

        // Check for high request volume
        if (requestStats.total > 1000) { // Arbitrary threshold
          optimizationOpportunities.push('Optimize request handling');
        }

        // Check for high cache miss rate
        if (requestStats.cached / requestStats.total < 0.7) {
          optimizationOpportunities.push('Improve request caching');
        }

        // Check for high rate limiting
        if (requestStats.rateLimited / requestStats.total > 0.1) {
          optimizationOpportunities.push('Optimize rate limiting configuration');
        }

        // Check for high validation errors
        if (requestStats.validationErrors / requestStats.total > 0.05) {
          optimizationOpportunities.push('Improve request validation');
        }

        // Check for slow endpoints
        const slowEndpoints = requestStats.responseTimeDistribution
          .filter(([_, duration]) => duration > 1000) // 1 second threshold
          .map(([endpoint, duration]) => endpoint);

        if (slowEndpoints.length > 0) {
          optimizationOpportunities.push(`Optimize slow endpoints: ${slowEndpoints.join(', ')}`);
        }

        if (optimizationOpportunities.length > 0) {
          console.log('\nOptimization Opportunities:');
          console.log('---------------------------');
          optimizationOpportunities.forEach(op => console.log(`- ${op}`));
        }

        // Save statistics report
        const report = {
          timestamp: new Date(),
          overall: {
            total: requestStats.total,
            cached: requestStats.cached,
            rateLimited: requestStats.rateLimited,
            validationErrors: requestStats.validationErrors
          },
          endpointDistribution: requestStats.endpointDistribution,
          methodDistribution: requestStats.methodDistribution,
          responseTimeDistribution: requestStats.responseTimeDistribution,
          optimizationOpportunities
        };

        await performanceMonitor.saveReportToFile({
          ...report,
          type: 'REQUEST_STATISTICS'
        });

      } catch (error) {
        console.error('Error getting request statistics:', error);
      }
    }, process.env.REQUEST_STATS_INTERVAL || 60000); // 1 minute

  } catch (error) {
    console.error('Error initializing request statistics:', error);
    process.exit(1);
  }
}

getRequestStats();
