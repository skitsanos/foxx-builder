# Enhanced Authentication Module for Foxx Services

This module provides a robust JWT-based authentication system for ArangoDB Foxx microservices. It handles token generation, validation, and middleware for securing API endpoints.

## Features

- **Complete JWT Implementation**: Supports all standard JWT claims (iss, sub, aud, exp, nbf, iat, jti)
- **Comprehensive Validation**: Validates token structure, signature, expiration, and claims
- **Configurable Token Expiration**: Option to enable/disable token expiration
- **Refresh Token Support**: Optional refresh token functionality for longer sessions
- **Flexible Middleware**: Easy-to-use middleware for protecting routes
- **Path Exemptions**: Supports both exact and pattern matching for exempt paths
- **Error Handling**: Detailed error messages for easier debugging

## Configuration

The authentication module can be configured through the `manifest.json` file:

```json
"configuration": {
  "jwtSecret": {
    "type": "string",
    "default": "SuperSecretWord"
  },
  "sessionTtl": {
    "default": 3600,
    "type": "integer",
    "description": "The time in seconds until an access token expires"
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
```

## Usage

### Basic Usage

```javascript
// Get the auth service from context
const { auth } = module.context;

// Generate a token
const token = auth.encode({
    userId: 'user123',
    username: 'johndoe',
    roles: ['user', 'admin']
});

// Decode and validate a token
try {
    const payload = auth.decode(token);
    console.log('User ID:', payload.userId);
} catch (error) {
    console.error('Token validation failed:', error.message);
}

// Check if a token has expired
const isExpired = auth.isExpired(token);
```

### Using Refresh Tokens

```javascript
// Create an access token
const accessToken = auth.encode({
    userId: 'user123',
    username: 'johndoe',
    roles: ['user']
});

// Create a refresh token
const refreshToken = auth.createRefreshToken('user123', {
    username: 'johndoe',
    roles: ['user']
});

// Later, refresh the access token
const { accessToken: newAccessToken, refreshToken: newRefreshToken } = 
    auth.refreshAccessToken(refreshToken, { rotateRefreshToken: true });
```

### Using the Authentication Middleware

```javascript
// Create and use authentication middleware
module.context.use((req, res, next) => {
    const authMiddleware = module.context.auth.createMiddleware({
        exempt: ['/', '/login', '/signup', '/refresh-token'],
        onSuccess: (req, res) => {
            // Load user data on successful authentication
            const userId = req.userId;
            const user = module.context.get('users', userId).toArray()[0];
            req.user = user;
        }
    });
    
    authMiddleware(req, res, next);
});
```

### Login Endpoint Example

```javascript
module.exports = {
    contentType: 'application/json',
    name: 'Login',
    
    body: {
        model: joi.object({
            username: joi.string().required(),
            password: joi.string().required()
        }).required()
    },
    
    handler: (req, res) => {
        const { username, password } = req.body;
        const { auth } = module.context;
        
        // Verify credentials
        const [user] = db._query(`
            FOR user IN users
            FILTER user.username == @username
            RETURN user
        `, { username }).toArray();
        
        if (!user || user.password !== crypto.sha384(password)) {
            res.throw(401, 'Invalid credentials');
        }
        
        // Generate access token
        const accessToken = auth.encode({
            userId: user._key,
            username: user.username,
            roles: user.roles || ['user']
        });
        
        const response = {
            accessToken,
            user: { /* user data */ }
        };
        
        // Add refresh token if enabled
        if (auth.useRefreshTokens()) {
            response.refreshToken = auth.createRefreshToken(user._key, {
                username: user.username,
                roles: user.roles || ['user']
            });
        }
        
        res.json(response);
    }
};
```

### Token Refresh Endpoint Example

```javascript
module.exports = {
    contentType: 'application/json',
    name: 'Refresh Token',
    
    body: {
        model: joi.object({
            refreshToken: joi.string().required()
        }).required()
    },
    
    handler: (req, res) => {
        const { refreshToken } = req.body;
        const { auth } = module.context;
        
        try {
            const { accessToken, refreshToken: newRefreshToken } = 
                auth.refreshAccessToken(refreshToken, { rotateRefreshToken: true });
            
            res.json({ accessToken, refreshToken: newRefreshToken });
        } catch (error) {
            res.throw(401, `Invalid refresh token: ${error.message}`);
        }
    }
};
```

## API Reference

### `encode(payload, options)`

Encodes a payload into a JWT token.

- **payload**: Object containing the data to encode
- **options**: (Optional) Object with encoding options
  - **issuer**: Token issuer
  - **audience**: Token audience
  - **useExpiration**: Whether to include expiration claims
  - **type**: Token type ('access' or 'refresh')

Returns a JWT token string.

### `createRefreshToken(userId, extraData)`

Creates a refresh token for a user.

- **userId**: User ID
- **extraData**: Additional data to include in the token

Returns a refresh token string.

### `decode(token, options)`

Decodes and validates a JWT token.

- **token**: JWT token string
- **options**: (Optional) Object with decoding options
  - **skipExpirationCheck**: Whether to skip expiration check
  - **type**: Expected token type
  - **verifyIssuer**: Whether to verify the issuer
  - **issuer**: Expected issuer
  - **verifyAudience**: Whether to verify the audience
  - **audience**: Expected audience

Returns the decoded payload.

### `isExpired(tokenOrPayload)`

Checks if a token or payload has expired.

- **tokenOrPayload**: JWT token string or decoded payload

Returns a boolean indicating whether the token has expired.

### `validateToken(token, options)`

Validates a token and returns the user ID.

- **token**: JWT token string
- **options**: Validation options

Returns the user ID from the token.

### `refreshAccessToken(refreshToken, options)`

Refreshes an access token using a refresh token.

- **refreshToken**: Refresh token string
- **options**: (Optional) Object with refresh options
  - **rotateRefreshToken**: Whether to generate a new refresh token
  - **extraData**: Additional data to include in the new tokens

Returns an object with new tokens: `{ accessToken, refreshToken? }`.

### `createMiddleware(options)`

Creates a middleware function for JWT authentication.

- **options**: (Optional) Object with middleware options
  - **exempt**: Array of paths exempt from authentication
  - **tokenExtractor**: Function to extract token from request
  - **onSuccess**: Function called on successful authentication
  - **onError**: Function called on authentication error
  - **tokenType**: Expected token type

Returns a middleware function.

## Configuration Methods

### `useTokenExpiration()`

Checks if token expiration is enabled in configuration.

Returns a boolean.

### `useRefreshTokens()`

Checks if refresh tokens are enabled in configuration.

Returns a boolean.

### `getSessionTtl()`

Gets the session TTL from configuration.

Returns a number (seconds).

### `getRefreshTokenTtl()`

Gets the refresh token TTL from configuration.

Returns a number (seconds).

## Security Considerations

- Store the JWT secret securely
- Use HTTPS for transmitting tokens
- Consider using refresh token rotation for better security
- Validate all input parameters
- Set appropriate token expiration times
