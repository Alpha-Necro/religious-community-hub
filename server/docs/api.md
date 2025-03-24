# API Documentation

This document provides comprehensive documentation for the Religious Community Hub API endpoints.

## Authentication

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123",
      "name": "John Doe",
      "email": "user@example.com"
    }
  }
}
```

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123",
      "name": "John Doe",
      "email": "user@example.com"
    }
  }
}
```

## User Management

### Get User

```http
GET /api/users/:id
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "user@example.com",
    "createdAt": "2024-03-23T23:47:15.000Z",
    "updatedAt": "2024-03-23T23:47:15.000Z"
  }
}
```

### Update User

```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "email": "updated@example.com"
}

Response:
{
  "status": "success",
  "data": {
    "id": "123",
    "name": "John Updated",
    "email": "updated@example.com",
    "updatedAt": "2024-03-23T23:47:15.000Z"
  }
}
```

## Community Features

### Create Post

```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Post",
  "content": "This is a new post",
  "category": "general"
}

Response:
{
  "status": "success",
  "data": {
    "id": "456",
    "title": "New Post",
    "content": "This is a new post",
    "category": "general",
    "userId": "123",
    "createdAt": "2024-03-23T23:47:15.000Z",
    "updatedAt": "2024-03-23T23:47:15.000Z"
  }
}
```

### Get Posts

```http
GET /api/posts
Authorization: Bearer <token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 10)
- category: string
- search: string

Response:
{
  "status": "success",
  "data": {
    "posts": [
      {
        "id": "456",
        "title": "New Post",
        "content": "This is a new post",
        "category": "general",
        "userId": "123",
        "createdAt": "2024-03-23T23:47:15.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

## Performance Monitoring

### Get Metrics

```http
GET /api/performance/metrics
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "memory": {
      "heapTotal": 123456789,
      "heapUsed": 987654321,
      "rss": 234567890
    },
    "cpu": {
      "loadAverage": 0.25,
      "usage": 15
    },
    "network": {
      "sent": 123456789,
      "received": 987654321
    }
  }
}
```

### Get Report

```http
GET /api/performance/report
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "memory": {
      "usage": 0.75,
      "recommendation": "Memory usage is high. Consider increasing server resources."
    },
    "cpu": {
      "usage": 0.45,
      "recommendation": "CPU usage is moderate. Monitor for spikes."
    },
    "network": {
      "throughput": 1000,
      "recommendation": "Network throughput is optimal."
    }
  }
}
```

## Cache Management

### Get Cache Stats

```http
GET /api/cache/stats
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "totalItems": 123,
    "size": 1024567,
    "hits": 9876,
    "misses": 1234,
    "hitRate": 0.89
  }
}
```

### Clear Cache

```http
DELETE /api/cache/region/:region
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "message": "Cache region cleared successfully"
}
```

## Error Responses

### Validation Error

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "status": "error",
  "code": 400,
  "message": "Validation failed",
  "details": {
    "field": "email",
    "error": "Invalid email format"
  }
}
```

### Authentication Error

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "status": "error",
  "code": 401,
  "message": "Unauthorized",
  "details": {
    "error": "Invalid token"
  }
}
```

### Rate Limit Exceeded

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "status": "error",
  "code": 429,
  "message": "Too many requests",
  "details": {
    "reset": "2024-03-23T23:57:15.000Z"
  }
}
```

## Security Features

### Rate Limiting

```http
GET /api/protected
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 98
X-RateLimit-Reset: 1679622435
```

### Request Validation

```javascript
const schema = {
  body: {
    required: true,
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 }
    }
  }
};
```

### CORS Configuration

```javascript
const corsConfig = {
  origin: ['https://example.com', 'https://api.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
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
```

### Response Compression

```javascript
// Compression middleware
app.use(compression({
  threshold: 1024,  // Compress responses larger than 1KB
  level: 9          // Compression level (1-9)
}));
```

## Monitoring Scripts

### Monitor Performance

```bash
# Run performance monitoring
npm run monitor:performance

# View real-time metrics
npm run monitor:performance -- --realtime
```

### Optimize Database

```bash
# Run database optimization
npm run optimize:database

# Generate optimization report
npm run optimize:database -- --report
```

### Analyze Queries

```bash
# Analyze slow queries
npm run analyze:queries

# Generate query analysis report
npm run analyze:queries -- --report
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
app.post('/api/auth/login', rateLimit({
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
