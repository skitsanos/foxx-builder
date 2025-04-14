# Foxx Builder Examples

This directory contains example code demonstrating how to use various features of the Foxx Builder framework.

## Directory Structure

- **auth/**: Authentication examples
  - `login.js`: JWT token generation and login flow
  - `refresh-token.js`: Token refresh endpoint
  - `protected-route.js`: Route requiring authentication
  
- **database/**: Database operations examples
  - `database-operations.js`: Basic and advanced database operations
  - **vector/**: Vector search examples
    - `vector-search.js`: Semantic search with cosine similarity
  
- **routes/**: Route handler examples
  - `basic-route.js`: Simple route handler
  - `complex-query.js`: Route with advanced query parameters

## How to Use These Examples

These examples are designed to be used as reference implementations that you can copy and adapt for your own services. They demonstrate best practices and common patterns.

### Authentication Flow

The authentication examples demonstrate a complete authentication flow:

1. `login.js`: User authenticates and receives access and refresh tokens
2. Protected routes use the access token
3. `refresh-token.js`: When the access token expires, the refresh token is used to get a new one

### Database Operations

The database examples show how to:

- Perform basic CRUD operations
- Use transactions
- Work with batch operations
- Implement caching
- Use vector search for similarity queries

### Route Handlers

The route examples demonstrate:

- Basic route structure
- Parameter validation
- Query parameter handling
- Response formatting

## Implementing in Your Service

To use these examples in your service:

1. Copy the relevant example files to your `src/routes` directory
2. Adjust paths, collection names, and other configuration as needed
3. Register the routes automatically using the Foxx Builder framework

## Further Reading

For more information, refer to:

- The documentation in each module directory (`src/builder/auth/README.md`, etc.)
- The main project README for overall architecture
