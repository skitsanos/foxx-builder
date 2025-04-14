# User Management

The Foxx Builder provides comprehensive user management features including authentication, registration, profile management, and activity tracking.

## Core Features

### User Registration
Create new user accounts with secure password hashing and validation.

**Endpoint:** `POST /signup`

```javascript
// Request
{
  "username": "user@example.com",
  "password": "securePassword123"
}

// Response
{
  "result": "12345" // User ID
}
```

### Authentication
Authenticate users and generate JWT tokens for secure API access.

**Endpoint:** `POST /login`

```javascript
// Request
{
  "username": "user@example.com",
  "password": "securePassword123"
}

// Response
{
  "result": {
    "user": {
      "_key": "12345",
      "username": "user@example.com",
      "gravatar": "https://www.gravatar.com/avatar/..."
    },
    "session": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### User Profile
Retrieve user information including account details and statistics.

**Endpoint:** `GET /users/:id`

```javascript
// Response
{
  "user": {
    "_key": "12345",
    "username": "user@example.com",
    "gravatar": "https://www.gravatar.com/avatar/..."
  },
  "stats": {
    "lastLogin": 1650123456789,
    "activityCount": 42,
    "accountAge": 120
  },
  "meta": {
    "requestId": "request-123",
    "execTime": 0.05
  }
}
```

### User Activity Tracking
Track and retrieve user activities such as logins, logouts, and registrations.

**Endpoint:** `GET /users/:id/activities`

Query parameters:
- `skip`: Number of records to skip (pagination)
- `limit`: Maximum number of records to return (1-100)
- `type`: Filter by activity type ('login', 'logout', 'signup', 'all')

```javascript
// Response
{
  "activities": [
    {
      "_key": "activity123",
      "type": "login",
      "timestamp": 1650123456789,
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "dateTime": "2023-04-16T12:30:56.789Z"
    },
    // More activities...
  ],
  "total": 42,
  "skip": 0,
  "limit": 20,
  "meta": {
    "execTime": 0.03
  }
}
```

### Logout
Record user logout events for activity tracking.

**Endpoint:** `POST /logout`

```javascript
// Request (optional)
{
  "userId": "12345" // Only needed if not authenticated
}

// Response
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Security Features

- **Secure Password Storage**: Passwords are hashed using SHA-384 before storage
- **Token-based Authentication**: JWT tokens for stateless authentication
- **Activity Tracking**: All authentication events are logged for security auditing
- **Access Control**: Users can only access their own profile and activity data

## Database Collections

The user management system uses the following collections:

- **users**: Stores user accounts and profile information
- **userActivities**: Tracks user actions for security and analytics

## Configuration

User management features can be configured through the service manifest:

```json
{
  "configuration": {
    "useAuth": {
      "default": false,
      "type": "boolean",
      "description": "Whether to enable JWT authentication middleware"
    },
    "jwtSecret": {
      "type": "string",
      "default": "SuperSecretWord"
    },
    "useTokenExpiration": {
      "default": true,
      "type": "boolean",
      "description": "Whether tokens should expire. If false, tokens will never expire."
    },
    "useRefreshTokens": {
      "default": false,
      "type": "boolean",
      "description": "Whether to use refresh tokens for extending session lifetime."
    },
    "refreshTokenTtl": {
      "default": 2592000,
      "type": "integer",
      "description": "The time in seconds until a refresh token expires (default: 30 days)"
    }
  }
}
```

## Best Practices

1. **Always enable authentication** in production environments
2. **Use HTTPS** to protect authentication credentials and tokens
3. **Implement rate limiting** to prevent brute force attacks
4. **Regularly monitor user activities** for suspicious behavior
5. **Set appropriate token expiration** times based on security requirements
