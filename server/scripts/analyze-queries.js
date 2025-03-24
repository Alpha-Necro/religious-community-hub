const { databaseService } = require('../services/databaseService');
const { performanceMonitor } = require('../services/performanceMonitor');

async function analyzeQueries() {
  try {
    // Initialize services
    await databaseService.initialize();
    await performanceMonitor.initialize();

    console.log('Query analysis initialized successfully');

    // Start analysis
    setInterval(async () => {
      try {
        // Get query statistics
        const queryStats = databaseService.getQueryStatistics();
        const slowQueries = queryStats.slowQueries;
        const queryDistribution = queryStats.queryDistribution;
        const tableUsage = queryStats.tableUsage;

        // Log analysis results
        console.log('\nQuery Analysis Report:');
        console.log('===========================');

        // Analyze slow queries
        if (slowQueries.length > 0) {
          console.log('\nSlow Queries:');
          console.log('---------------------------');
          slowQueries.forEach(([query, metrics]) => {
            console.log(`Query: ${query}`);
            console.log(`  Duration: ${metrics.duration}ms`);
            console.log(`  Count: ${metrics.count}`);
            console.log(`  Average: ${metrics.duration / metrics.count}ms`);

            // Analyze query structure
            const analysis = analyzeQueryStructure(query);
            console.log('  Analysis:', analysis);
          });
        }

        // Analyze query distribution
        console.log('\nQuery Distribution:');
        console.log('---------------------------');
        Object.entries(queryDistribution).forEach(([type, percentage]) => {
          console.log(`${type}: ${percentage.toFixed(2)}%`);
        });

        // Analyze table usage
        console.log('\nTable Usage:');
        console.log('---------------------------');
        Object.entries(tableUsage).forEach(([table, percentage]) => {
          console.log(`${table}: ${percentage.toFixed(2)}%`);
        });

        // Generate optimization recommendations
        const recommendations = [];

        // Check for slow queries
        slowQueries.forEach(([query, metrics]) => {
          if (metrics.duration / metrics.count > 1000) { // 1 second average
            recommendations.push(`Optimize query: ${query}`);
          }
        });

        // Check for high table usage
        Object.entries(tableUsage).forEach(([table, percentage]) => {
          if (percentage > 50) {
            recommendations.push(`Optimize ${table} queries`);
          }
        });

        // Check for unbalanced query distribution
        const maxQueryType = Math.max(...Object.values(queryDistribution));
        const minQueryType = Math.min(...Object.values(queryDistribution));
        if (maxQueryType / minQueryType > 10) {
          recommendations.push('Improve query distribution');
        }

        if (recommendations.length > 0) {
          console.log('\nOptimization Recommendations:');
          console.log('---------------------------');
          recommendations.forEach(rec => console.log(`- ${rec}`));
        }

        // Save analysis report
        const report = {
          timestamp: new Date(),
          slowQueries,
          queryDistribution,
          tableUsage,
          recommendations
        };

        await performanceMonitor.saveReportToFile({
          ...report,
          type: 'QUERY_ANALYSIS'
        });

      } catch (error) {
        console.error('Error analyzing queries:', error);
      }
    }, process.env.QUERY_ANALYSIS_INTERVAL || 3600000); // 1 hour

  } catch (error) {
    console.error('Error initializing query analysis:', error);
    process.exit(1);
  }
}

function analyzeQueryStructure(query) {
  try {
    const analysis = {
      type: query.type,
      tables: query.tables,
      joins: query.joins,
      filters: query.filters,
      aggregations: query.aggregations,
      sorting: query.sorting,
      pagination: query.pagination
    };

    // Check for optimization opportunities
    const opportunities = [];

    // Check for complex joins
    if (analysis.joins?.length > 3) {
      opportunities.push('Optimize join structure');
    }

    // Check for complex filters
    if (analysis.filters?.length > 5) {
      opportunities.push('Optimize filter conditions');
    }

    // Check for unnecessary aggregations
    if (analysis.aggregations?.length > 3) {
      opportunities.push('Optimize aggregation operations');
    }

    // Check for inefficient sorting
    if (analysis.sorting?.length > 3) {
      opportunities.push('Optimize sorting operations');
    }

    // Check for pagination issues
    if (analysis.pagination?.limit > 1000) {
      opportunities.push('Optimize pagination');
    }

    if (opportunities.length > 0) {
      analysis.optimizationOpportunities = opportunities;
    }

    return analysis;
  } catch (error) {
    return {
      error: error.message
    };
  }
}

analyzeQueries();
