# Middleware Examples

Foxx Builder provides powerful middleware capabilities for cross-cutting concerns like rate limiting, authentication, logging, and validation.

## Directory Structure

- `rate-limiting.js`: Rate limiting configuration and examples
- `authentication.js`: Authentication middleware patterns
- `logging.js`: Request/response logging middleware
- `validation.js`: Input validation middleware
- `error-handling.js`: Global error handling middleware
- `cors.js`: Cross-origin resource sharing setup

## Available Middleware

### Built-in Middleware
- **Rate Limiting**: Prevent API abuse with configurable limits
- **Authentication**: JWT token validation and user context
- **Logging**: Request/response logging with configurable levels
- **CORS**: Cross-origin request handling

### Custom Middleware
- **Validation**: Input validation with detailed error messages
- **Security Headers**: Common security headers injection
- **Analytics**: Request tracking and metrics collection

## Configuration

Middleware is configured in the main service setup and can be applied globally or per-route.

```javascript
// Global middleware
router.use(rateLimitingMiddleware);
router.use(authenticationMiddleware);
router.use(loggingMiddleware);

// Route-specific middleware
router.get('/protected', authenticationMiddleware, handler);
```

## Best Practices

- Apply rate limiting to prevent abuse
- Use authentication middleware for protected routes
- Implement proper error handling and logging
- Validate all inputs at the middleware level
- Use CORS middleware for browser-based API access