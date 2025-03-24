# Religious Community Hub - Server

This directory contains the backend server implementation for the Religious Community Hub application.

## Project Structure

```
server/
├── __tests__/              # Test files
├── middleware/             # Express middleware
├── scripts/                # Utility scripts
├── services/               # Core services
├── models/                 # Database models
├── routes/                 # API routes
├── config/                 # Configuration files
└── server.js              # Main server file
```

## Core Services

### Performance Monitor

The performance monitor service provides comprehensive monitoring of system resources and performance metrics.

```javascript
// Initialize the performance monitor
await performanceMonitor.initialize();

// Collect memory metrics
const memoryMetrics = performanceMonitor.collectMemoryMetrics();

// Check CPU usage
const isHighCPU = performanceMonitor.checkCPUThreshold();

// Generate performance report
const report = performanceMonitor.generateReport();
```

### Caching Service

The caching service provides region-based caching with configurable TTLs and detailed metrics.

```javascript
// Initialize caching
await cachingService.initialize();

// Set cache item
await cachingService.set('user:123', userData, 'user');

// Get cache item
const cachedData = await cachingService.get('user:123', 'user');

// Clear cache region
await cachingService.clear('user');

// Get cache metrics
const metrics = cachingService.getMetrics();
```

### Database Service

The database service provides optimized database operations and query management.

```javascript
// Initialize database
await databaseService.initialize();

// Execute optimized query
const result = await databaseService.executeQuery(
  'SELECT * FROM users WHERE active = true',
  'MEDIUM'  // Optimization level: LOW, MEDIUM, HIGH
);

// Batch operations
const operations = [
  { type: 'INSERT', table: 'users', data: { name: 'John' } },
  { type: 'INSERT', table: 'users', data: { name: 'Jane' } }
];
const batchResult = await databaseService.optimizeBatchOperations(operations);

// Get optimization report
const report = databaseService.generateOptimizationReport();
```

### Request Handler

The request handler middleware provides comprehensive request processing and optimization.

```javascript
// Request compression
app.use(requestHandler.compressionMiddleware());

// Rate limiting
app.use(requestHandler.rateLimitMiddleware());

// Request validation
const validateRequest = requestHandler.createValidator({
  body: {
    required: true,
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' }
    }
  }
});

// Cache middleware
app.use(requestHandler.cacheMiddleware('user', 3600));
```

## Testing

The project includes comprehensive unit and integration tests using Jest.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Generate test coverage report
npm test:coverage
```

## Configuration

The server uses environment variables for configuration. Create a `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Cache
CACHE_SIZE=1000
CACHE_TTL=3600000

# Performance Monitoring
PERFORMANCE_MONITOR_INTERVAL=60000

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## Monitoring Scripts

The project includes several monitoring scripts:

```bash
# Monitor performance
npm run monitor:performance

# Optimize database
npm run optimize:database

# Analyze queries
npm run analyze:queries

# Cache statistics
npm run cache:stats

# Request statistics
npm run request:stats
```

## API Endpoints

### User Management

```javascript
// Create user
POST /api/users
{
  "name": "John Doe",
  "email": "john@example.com"
}

// Get user
GET /api/users/:id

// Update user
PUT /api/users/:id
{
  "name": "John Updated"
}

// Delete user
DELETE /api/users/:id
```

### Performance Monitoring

```javascript
// Get performance metrics
GET /api/performance/metrics

// Get memory usage
GET /api/performance/memory

// Get CPU usage
GET /api/performance/cpu
```

### Cache Management

```javascript
// Get cache stats
GET /api/cache/stats

// Clear cache region
DELETE /api/cache/region/:region

// Clear all cache
DELETE /api/cache/all
```

## Error Handling

The server implements comprehensive error handling with standardized error responses.

```javascript
// Example error response
{
  "status": "error",
  "code": 400,
  "message": "Bad Request",
  "details": {
    "field": "email",
    "error": "Invalid email format"
  }
}
```

## Security Features

### Rate Limiting

```javascript
// Default rate limiting
app.use(requestHandler.rateLimitMiddleware());

// Custom rate limiting
app.use(
  requestHandler.createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  })
);
```

### Request Validation

```javascript
// Validate request body
app.post('/api/users', requestHandler.validateRequest({
  body: {
    required: true,
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      email: { type: 'string', format: 'email' }
    }
  }
}));

// Validate query parameters
app.get('/api/users', requestHandler.validateRequest({
  query: {
    required: false,
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      page: { type: 'integer', minimum: 1 }
    }
  }
}));
```

## Performance Optimization

### Query Optimization

```javascript
// Optimized query with caching
const users = await databaseService.executeQuery(
  'SELECT * FROM users WHERE active = true',
  'HIGH',  // Optimization level
  'user',  // Cache region
  3600     // Cache TTL in seconds
);

// Batch operations optimization
const results = await databaseService.optimizeBatchOperations([
  { type: 'INSERT', table: 'users', data: { name: 'John' } },
  { type: 'INSERT', table: 'users', data: { name: 'Jane' } }
], 'MEDIUM');
```

### Response Compression

```javascript
// Enable compression
app.use(requestHandler.compressionMiddleware({
  threshold: 1024,  // Compress responses larger than 1KB
  level: 9          // Compression level (1-9)
}));

// Custom compression settings
app.use(requestHandler.createCompression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

## Monitoring and Debugging

### Performance Metrics

```javascript
// Get memory usage
const memory = performanceMonitor.collectMemoryMetrics();
console.log(`Heap Used: ${memory.heapUsed / 1024 / 1024} MB`);

// Get CPU usage
const cpu = performanceMonitor.collectCPUMetrics();
console.log(`CPU Load: ${cpu.loadAverage}%`);

// Generate full report
const report = performanceMonitor.generateReport();
console.log(JSON.stringify(report, null, 2));
```

### Error Logging

```javascript
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Log error details
  performanceMonitor.logError({
    timestamp: new Date(),
    error: err.message,
    stack: err.stack,
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip
    }
  });
  
  // Send error response
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error'
  });
});
```

## Best Practices

### Error Handling

```javascript
// Use try-catch blocks
try {
  // Critical operations
} catch (error) {
  performanceMonitor.logError(error);
  throw new Error('Operation failed');
}

// Validate input
if (!user) {
  throw new Error('User not found');
}
```

### Performance Optimization

```javascript
// Use caching for expensive operations
const cachedData = await cachingService.get(`user:${userId}`, 'user');
if (cachedData) {
  return cachedData;
}

// Batch database operations
const results = await databaseService.optimizeBatchOperations([
  { type: 'SELECT', table: 'users', data: { id: userId } },
  { type: 'SELECT', table: 'profiles', data: { userId: userId } }
]);

// Use proper indexes
await databaseService.createIndex('users', ['email'], 'email_idx');
```

### Security

```javascript
// Validate user input
const schema = {
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 }
    }
  }
};

// Rate limit sensitive endpoints
app.post('/api/auth/login', requestHandler.rateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again later.'
}));
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
