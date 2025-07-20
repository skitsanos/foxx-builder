# Enhanced Context Utilities Examples

Foxx Builder extends the standard Foxx module context with powerful utilities for database operations, authentication, job management, and configuration.

## Directory Structure

- `database-operations.js`: Enhanced database utilities and patterns
- `authentication.js`: JWT and auth context utilities
- `job-management.js`: Background job and task execution
- `configuration.js`: Configuration management and validation
- `transactions.js`: Database transaction patterns
- `caching.js`: Caching strategies and implementation

## Context Extensions

The enhanced context provides these additional utilities:

```javascript
const { 
    db,          // Enhanced database operations
    auth,        // JWT authentication utilities
    jobs,        // Background job management  
    runTask,     // Scheduled task execution
    config,      // Configuration management
    utils        // General utilities
} = module.context;
```

## Database Operations

Enhanced database operations with:
- Simplified CRUD operations
- Query building and filtering
- Transaction support
- Caching integration
- Vector search capabilities

## Authentication

JWT-based authentication with:
- Token generation and validation
- User context injection
- Role-based access control
- Refresh token management

## Job Management

Background processing with:
- Immediate job execution
- Scheduled task creation
- Job status monitoring
- Error handling and retries

## Best Practices

- Use enhanced context utilities instead of raw ArangoDB modules
- Implement proper error handling for all operations
- Use transactions for multi-step operations
- Cache frequently accessed data
- Validate all inputs and configurations