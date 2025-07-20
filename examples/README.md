# Foxx Builder Examples

This directory contains example code demonstrating how to use various features of the Foxx Builder framework.

## Directory Structure

### Core Features

- **auth/**: Authentication examples
  - `login.js`: JWT token generation and login flow
  - `refresh-token.js`: Token refresh endpoint
  - `protected-route.js`: Route requiring authentication

- **routes/**: Route handler examples
  - `basic-route.js`: Simple route handler
  - `complex-query.js`: Route with advanced query parameters

- **database/**: Database operations examples
  - `database-operations.js`: Basic and advanced database operations
  - **vector/**: Vector search examples
    - `vector-search.js`: Semantic search with cosine similarity

- **config/**: Configuration management examples
  - `config-usage.js`: Configuration access and validation

### Advanced Features

- **scheduler/**: Background task scheduling ⭐ *New*
  - `script-tasks.js`: JavaScript function scheduling
  - `webhook-tasks.js`: HTTP webhook scheduling  
  - `email-tasks.js`: Email scheduling and automation
  - `README.md`: Comprehensive scheduling guide

- **email/**: Email service integration ⭐ *New*
  - `basic-sending.js`: Simple email sending patterns
  - `README.md`: Email service configuration and usage

- **middleware/**: Request/response middleware ⭐ *New*
  - `rate-limiting.js`: API rate limiting and abuse prevention
  - `README.md`: Middleware configuration guide

- **context/**: Enhanced context utilities ⭐ *New*
  - `database-operations.js`: Enhanced database operations
  - `job-management.js`: Background job and task management
  - `README.md`: Context utilities documentation

## How to Use These Examples

These examples are designed to be used as reference implementations that you can copy and adapt for your own services. They demonstrate best practices and common patterns.

## Core Framework Features

**Authentication Flow:**
The authentication examples demonstrate a complete authentication flow:
1. `login.js`: User authenticates and receives access and refresh tokens
2. Protected routes use the access token
3. `refresh-token.js`: When the access token expires, the refresh token is used to get a new one

**Database Operations:**
- Perform basic CRUD operations with enhanced utilities
- Use transactions and batch operations
- Implement caching strategies
- Use vector search for similarity queries
- Advanced AQL queries and aggregations

**Route Handlers:**
- Basic route structure and parameter handling
- Input validation and error handling
- Query parameter processing
- Response formatting and status codes

## Advanced Features

**Scheduler Service:**
- Script tasks for custom JavaScript execution
- Webhook tasks for HTTP API integration
- Email tasks for automated communications
- Cron scheduling and recurring tasks
- Task management and monitoring

**Email Integration:**
- Multiple provider support (Resend, SMTP)
- HTML templates with variable substitution
- Attachment handling and bulk sending
- Delivery tracking and error handling

**Middleware System:**
- Rate limiting with configurable rules
- Authentication and authorization
- Request/response logging
- Custom middleware development

**Enhanced Context:**
- Database operations with built-in caching
- Background job management
- Task scheduling and execution
- Configuration management

## Implementing in Your Service

To use these examples in your service:

1. Copy the relevant example files to your `src/routes` directory
2. Adjust paths, collection names, and other configuration as needed
3. Register the routes automatically using the Foxx Builder framework

## Further Reading

For more information, refer to:

- The documentation in each module directory (`src/builder/auth/README.md`, etc.)
- The main project README for overall architecture
