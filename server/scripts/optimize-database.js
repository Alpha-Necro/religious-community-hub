const { databaseService } = require('../services/databaseService');
const { performanceMonitor } = require('../services/performanceMonitor');

async function optimizeDatabase() {
  try {
    // Initialize services
    await databaseService.initialize();
    await performanceMonitor.initialize();

    console.log('Database optimization initialized successfully');

    // Start optimization
    setInterval(async () => {
      try {
        // Analyze queries
        const queryStats = databaseService.getQueryStatistics();
        const slowQueries = queryStats.slowQueries;
        const queryDistribution = queryStats.queryDistribution;
        const tableUsage = queryStats.tableUsage;

        // Log optimization status
        console.log('\nDatabase Optimization Report:');
        console.log('===========================');

        // Check slow queries
        if (slowQueries.length > 0) {
          console.log('\nSlow Queries:');
          console.log('---------------------------');
          slowQueries.forEach(([query, metrics]) => {
            console.log(`Query: ${query}`);
            console.log(`  Duration: ${metrics.duration}ms`);
            console.log(`  Count: ${metrics.count}`);
            console.log(`  Average: ${metrics.duration / metrics.count}ms`);
          });

          // Generate optimization recommendations
          const recommendations = [];
          slowQueries.forEach(([query, metrics]) => {
            if (metrics.duration / metrics.count > 1000) { // 1 second average
              recommendations.push(`Optimize query: ${query}`);
            }
          });

          if (recommendations.length > 0) {
            console.log('\nOptimization Recommendations:');
            console.log('---------------------------');
            recommendations.forEach(rec => console.log(`- ${rec}`));
          }
        }

        // Check query distribution
        console.log('\nQuery Distribution:');
        console.log('---------------------------');
        Object.entries(queryDistribution).forEach(([type, percentage]) => {
          console.log(`${type}: ${percentage.toFixed(2)}%`);
        });

        // Check table usage
        console.log('\nTable Usage:');
        console.log('---------------------------');
        Object.entries(tableUsage).forEach(([table, percentage]) => {
          console.log(`${table}: ${percentage.toFixed(2)}%`);
        });

        // Check for optimization opportunities
        const optimizationOpportunities = [];

        // Check for high table usage
        Object.entries(tableUsage).forEach(([table, percentage]) => {
          if (percentage > 50) {
            optimizationOpportunities.push(`Optimize ${table} queries`);
          }
        });

        // Check for unbalanced query distribution
        const maxQueryType = Math.max(...Object.values(queryDistribution));
        const minQueryType = Math.min(...Object.values(queryDistribution));
        if (maxQueryType / minQueryType > 10) {
          optimizationOpportunities.push('Improve query distribution');
        }

        if (optimizationOpportunities.length > 0) {
          console.log('\nOptimization Opportunities:');
          console.log('---------------------------');
          optimizationOpportunities.forEach(op => console.log(`- ${op}`));
        }

        // Save optimization report
        const report = {
          timestamp: new Date(),
          slowQueries,
          queryDistribution,
          tableUsage,
          optimizationOpportunities
        };

        await performanceMonitor.saveReportToFile({
          ...report,
          type: 'DATABASE_OPTIMIZATION'
        });

      } catch (error) {
        console.error('Error optimizing database:', error);
      }
    }, process.env.DATABASE_OPTIMIZATION_INTERVAL || 3600000); // 1 hour

  } catch (error) {
    console.error('Error initializing database optimization:', error);
    process.exit(1);
  }
}

optimizeDatabase();
