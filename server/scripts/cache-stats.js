const { cachingService } = require('../services/cachingService');
const { performanceMonitor } = require('../services/performanceMonitor');

async function getCacheStats() {
  try {
    // Initialize services
    await cachingService.initialize();
    await performanceMonitor.initialize();

    console.log('Cache statistics initialized successfully');

    // Start monitoring
    setInterval(async () => {
      try {
        // Get cache statistics
        const cacheStats = cachingService.getCacheStatistics();

        // Log cache metrics
        console.log('\nCache Statistics Report:');
        console.log('===========================');
        console.log('\nOverall Metrics:');
        console.log('---------------------------');
        console.log(`Hit Rate: ${cacheStats.hitRate.toFixed(2)}%`);
        console.log(`Miss Rate: ${cacheStats.missRate.toFixed(2)}%`);
        console.log(`Size: ${cacheStats.size}/${cacheStats.max}`);
        console.log(`Evictions: ${cacheStats.evictions}`);

        // Log region-specific metrics
        console.log('\nRegion Metrics:');
        console.log('---------------------------');
        Object.entries(cacheStats.regions).forEach(([region, stats]) => {
          console.log(`\n${region} Region:`);
          console.log(`  Hit Rate: ${stats.hitRate.toFixed(2)}%`);
          console.log(`  Miss Rate: ${stats.missRate.toFixed(2)}%`);
          console.log(`  Size: ${stats.size}`);
          console.log(`  Hits: ${stats.hits}`);
          console.log(`  Misses: ${stats.misses}`);
        });

        // Check for optimization opportunities
        const optimizationOpportunities = [];

        // Check overall hit rate
        if (cacheStats.hitRate < 70) {
          optimizationOpportunities.push('Improve cache hit rate');
        }

        // Check region-specific optimization opportunities
        Object.entries(cacheStats.regions).forEach(([region, stats]) => {
          if (stats.hitRate < 70) {
            optimizationOpportunities.push(`Improve hit rate in ${region} region`);
          }
          if (stats.size > stats.max * 0.9) {
            optimizationOpportunities.push(`Optimize ${region} region size`);
          }
        });

        if (optimizationOpportunities.length > 0) {
          console.log('\nOptimization Opportunities:');
          console.log('---------------------------');
          optimizationOpportunities.forEach(op => console.log(`- ${op}`));
        }

        // Save statistics report
        const report = {
          timestamp: new Date(),
          overall: {
            hitRate: cacheStats.hitRate,
            missRate: cacheStats.missRate,
            size: cacheStats.size,
            max: cacheStats.max,
            evictions: cacheStats.evictions
          },
          regions: cacheStats.regions,
          optimizationOpportunities
        };

        await performanceMonitor.saveReportToFile({
          ...report,
          type: 'CACHE_STATISTICS'
        });

      } catch (error) {
        console.error('Error getting cache statistics:', error);
      }
    }, process.env.CACHE_STATS_INTERVAL || 60000); // 1 minute

  } catch (error) {
    console.error('Error initializing cache statistics:', error);
    process.exit(1);
  }
}

getCacheStats();
