const path = require('path');
const fs = require('fs').promises;
const compression = require('compression');
const { performanceMonitor } = require('../services/performanceMonitor');

const codeSplitting = {
  initialize(app) {
    // Enable compression
    app.use(compression());

    // Cache static files
    this.cacheStaticFiles(app);

    // Implement chunked loading
    this.implementChunkedLoading(app);

    // Monitor code splitting performance
    this.monitorCodeSplitting(app);
  },

  cacheStaticFiles(app) {
    const cacheControl = (req, res, next) => {
      if (req.originalUrl.includes('/static/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
      next();
    };

    app.use(cacheControl);
    app.use('/static', express.static(path.join(__dirname, '../public')));
  },

  async implementChunkedLoading(app) {
    // Get all route files
    const routesDir = path.join(__dirname, '../routes');
    const routeFiles = await fs.readdir(routesDir);

    // Create chunk map
    const chunkMap = {};

    // Group routes by functionality
    routeFiles.forEach(file => {
      if (file.endsWith('.js')) {
        const routeName = file.replace('.js', '');
        const category = this.getRouteCategory(routeName);

        if (!chunkMap[category]) {
          chunkMap[category] = [];
        }
        chunkMap[category].push(routeName);
      }
    });

    // Create chunk middleware
    const chunkMiddleware = (req, res, next) => {
      const startTime = performance.now();
      
      // Track request
      performanceMonitor.trackRequest();

      // Load only required chunks
      const requiredChunks = this.getRequiredChunks(req.path);
      
      // Load chunks in parallel
      Promise.all(
        requiredChunks.map(chunk => this.loadChunk(chunk))
      ).then(() => {
        const endTime = performance.now();
        performanceMonitor.metrics.responseTime = {
          ...performanceMonitor.metrics.responseTime,
          current: endTime - startTime
        };
        next();
      }).catch(next);
    };

    app.use(chunkMiddleware);
  },

  getRouteCategory(routeName) {
    const categories = {
      auth: ['auth'],
      user: ['users', 'profile'],
      security: ['security', 'ip-control'],
      content: ['forum', 'events', 'resources']
    };

    for (const [category, routes] of Object.entries(categories)) {
      if (routes.includes(routeName)) {
        return category;
      }
    }

    return 'other';
  },

  getRequiredChunks(path) {
    const chunks = [];

    // Map paths to chunks
    const pathToChunk = {
      '/api/v1/auth': 'auth',
      '/api/v1/users': 'user',
      '/api/v1/security': 'security',
      '/api/v1/forum': 'content',
      '/api/v1/events': 'content',
      '/api/v1/resources': 'content'
    };

    // Get matching chunks
    Object.entries(pathToChunk).forEach(([route, chunk]) => {
      if (path.startsWith(route)) {
        chunks.push(chunk);
      }
    });

    return chunks;
  },

  async loadChunk(chunk) {
    try {
      // Check if chunk is already loaded
      if (global.loadedChunks?.includes(chunk)) {
        return;
      }

      // Load chunk
      const chunkPath = path.join(__dirname, '../chunks', `${chunk}.js`);
      const chunkCode = await fs.readFile(chunkPath, 'utf-8');

      // Execute chunk
      await new Function(chunkCode)();

      // Mark chunk as loaded
      if (!global.loadedChunks) {
        global.loadedChunks = [];
      }
      global.loadedChunks.push(chunk);

      return true;
    } catch (error) {
      performanceMonitor.trackError();
      throw error;
    }
  },

  monitorCodeSplitting(app) {
    app.use((req, res, next) => {
      const startTime = performance.now();
      
      res.on('finish', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        performanceMonitor.metrics.responseTime = {
          ...performanceMonitor.metrics.responseTime,
          current: responseTime
        };

        // Log performance metrics
        if (responseTime > process.env.RESPONSE_TIME_THRESHOLD) {
          performanceMonitor.createAlert({
            title: 'Code Splitting Performance Alert',
            description: `Slow response time for route: ${req.path}`,
            severity: 'WARNING',
            type: 'CODE_SPLITTING_PERFORMANCE_ALERT',
            metadata: {
              route: req.path,
              responseTime,
              chunkCount: global.loadedChunks?.length || 0
            }
          });
        }
      });

      next();
    });
  }
};

module.exports = codeSplitting;
