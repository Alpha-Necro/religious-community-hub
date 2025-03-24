# API Documentation

## Overview
The Religious Community Hub API provides a comprehensive set of endpoints for managing religious community features, user management, and accessibility services.

## Base URL
`https://api.religious-community-hub.com`

## Authentication
All endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-token>
```

## API Endpoints

### 1. User Management
- `/api/users` - Manage users
- `/api/auth` - Authentication endpoints
- `/api/profiles` - User profiles

### 2. Community Features
- `/api/events` - Religious events
- `/api/prayers` - Prayer times and locations
- `/api/resources` - Educational resources
- `/api/notifications` - System notifications

### 3. Accessibility Services
- `/api/accessibility` - Accessibility features
- `/api/preferences` - User preferences
- `/api/alerts` - Accessibility alerts
- `/api/reports` - Accessibility reports

### 4. Security
- `/api/audit` - Audit logs
- `/api/security` - Security settings
- `/api/monitoring` - System monitoring

## Rate Limiting
- Default rate limit: 100 requests per minute
- IP-based rate limiting
- Custom rate limits for specific endpoints

## Error Handling
All API responses follow a standard format:
```json
{
  "success": boolean,
  "data": any,
  "error": {
    "code": string,
    "message": string,
    "details": any
  }
}
```

## Versioning
- API versioning is handled through URL prefixes
- Current stable version: v1
- Breaking changes will be documented in CHANGELOG.md

## API Reference
Detailed API reference documentation can be found in the `docs/api/reference` directory.
