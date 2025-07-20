# 🚀 Foxx Builder

![CI/CD Pipeline](https://github.com/skitsanos/foxx-builder/workflows/CI/CD%20Pipeline/badge.svg)
![Code Quality](https://github.com/skitsanos/foxx-builder/workflows/Code%20Quality/badge.svg)

Build powerful database-driven microservices with **foxx-builder** – the modern, convention-based framework for ArangoDB Foxx.

## What is Foxx?

> ArangoDB's Foxx microservice framework lets you build APIs that run directly within the database, with native access to your data. Using JavaScript (V8 engine), you can create endpoints that eliminate the usual database-to-application round trips, dramatically improving performance.
>
> Unlike stored procedures, Foxx services are structured JavaScript applications that are easy to version control and distribute. Build anything from optimized data access endpoints to complete applications running inside your database.

## Why Foxx Builder?

Foxx Builder streamlines Foxx development through **convention over configuration**. Organize your API with a clear, intuitive folder structure that directly maps to your URL paths.

**Instead of** complex monolithic handlers, **enjoy**:
- 📁 Endpoint organization that mirrors your URL structure
- 🧩 Modular API design with dedicated handler files
- 🔍 Instant visual understanding of your API's capabilities
- ⚡ Rapid development through convention-based routing

## Quick Start

### Install and Deploy

```bash
# Clone the repository
git clone https://github.com/skitsanos/foxx-builder.git

# Deploy using built-in tool (requires Node.js 18+)
npm run deploy -- -H http://localhost:8529 -d dev -u dev -p sandbox
```

Want to use foxx-cli? That works too:

```bash
# Register your ArangoDB server
foxx server set dev http://dev:sandbox@localhost:8529

# Install the service
foxx install /api . --server dev --database dev
```

For more deployment options, see [Deployment Documentation](./docs/deployment.md).

## API Structure by Convention

Create intuitive APIs by mapping your file system to your URL structure:

```
GET  /api/echo                   → /routes/echo/get.js
POST /api/users                  → /routes/users/post.js
GET  /api/users/:id/tasks        → /routes/users/$id/tasks/get.js
GET  /api/users/:id/tasks/:task  → /routes/users/$id/tasks/$task/get.js
```

### Code Example

Here's a simple endpoint handler:

```javascript
// routes/users/$id/get.js
module.exports = {
  contentType: 'application/json',
  name: 'Get user by ID',
  handler: (req, res) => {
    const { id } = req.pathParams;
    const { get } = module.context;
    
    const user = get('users', id).toArray()[0];
    res.json({ user });
  }
};
```

## Features

### 🔐 JWT Authentication

Built-in JWT authentication system with:

- Token-based security
- Configurable expiration policies
- Refresh token support
- Path exemptions with wildcard support

### 👤 Enhanced User Management

Comprehensive user management with:

- Role-based access control (RBAC) with granular permissions
- User profiles, registration and account management
- Flexible user preferences system for personalization
- Detailed activity tracking and audit logs
- User statistics and preference management

[Learn more about Enhanced User Management](./docs/features/enhanced-user-management.md)

### 🛡️ Rate Limiting

Protect your API from abuse with configurable rate limiting:

- Limit requests per client based on IP or user ID
- Configurable rate thresholds
- Path exemptions with wildcard support
- Role-based exemptions
- Automatic cleanup of rate limit data

[Learn more about Rate Limiting](./docs/features/rate-limiting.md)

### 🔍 Health Checks

Comprehensive system health monitoring:

- Lightweight status endpoint for simple liveness probes
- Detailed health check with component-level diagnostics
- Memory, database, tasks, and auth system monitoring
- Integration with container orchestration and monitoring systems

[Learn more about Health Checks](./docs/features/health-checks.md)

### 🕓 Scheduled Tasks

Automate routine operations with a flexible task scheduler:

- Create one-time or recurring tasks with cron-like scheduling
- Manage tasks through a comprehensive admin API
- Track execution history and task performance
- Built-in task handlers for common operations

[Learn more about Scheduled Tasks](./docs/features/scheduled-tasks.md)

```javascript
// POST /login example
module.exports = {
  body: {
    model: joi.object({
      username: joi.string().required(),
      password: joi.string().required()
    }).required()
  },
  handler: (req, res) => {
    // Authentication logic
    const token = module.context.auth.encode({
      userId: user._key,
      roles: user.roles
    });
    
    res.json({ token, user });
  }
};
```

### 🔄 Built-in CRUD Utilities

Simplify database operations with context utilities:

```javascript
const { get, insert, update, remove } = module.context;

// Examples
const user = get('users', id);
const newUser = insert('users', { name, email });
const updated = update('users', id, { status: 'active' });
const removed = remove('users', id);
```

### 📤 Request Validation

Validate request payloads using Joi schemas:

```javascript
module.exports = {
  body: {
    model: joi.object({
      name: joi.string().required(),
      email: joi.string().email().required(),
      age: joi.number().integer().min(18)
    }).required()
  },
  handler: (req, res) => {
    // Your validated data is available in req.body
    res.json({ result: 'ok' });
  }
};
```

## Local Development

### Using Taskfile (Recommended)

The easiest way to develop locally is using the built-in Taskfile commands:

```bash
# Setup ArangoDB Docker container and database
task docker-db-setup

# Deploy your service
task deploy-docker

# Run API tests
task test

# List installed services
task list-services

# Create database backup
task docker-db-backup

# Restore database from backup
task docker-db-restore
```

### Manual Docker Development

Run your services in Docker for consistent development environments:

```bash
# Start the Docker container
yarn run docker:start

# Setup the database
yarn run docker:setup-db

# Deploy with our deployment tool
npm run deploy -- -H http://localhost:8529 -d dev -u root -p rootpassword
```

For more details, see the [Running in Docker](https://github.com/skitsanos/foxx-builder/wiki/Running-in-Docker) Wiki page.

## Testing Your API

Test endpoints with [Hurl](https://hurl.dev):

```
GET {{URL}}/users/123

HTTP/* 200
[Asserts]
jsonpath "$.user.name" == "John Doe"
```

Run tests with:

```bash
hurl --test --variables-file tests/hurl/.vars tests/hurl/*.hurl
```

## Integrations

### Netlify Integration

Deploy with Netlify using proxy rules:

```toml
[[redirects]]
from = "/api/*"
to = "http://{YOUR_HOSTNAME}:8529/_db/{YOUR_DATABASE}/{YOUR_ENDPOINT}/:splat"
status = 200
force = true
```

See the [Working with Netlify](https://github.com/skitsanos/foxx-builder/wiki/Working-with-Netlify) Wiki page for details.

## Project Structure

```
src/
 ├── builder/       # Foxx Builder core (don't modify)
 │   ├── context-extensions.js
 │   └── index.js
 ├── routes/        # Your API endpoints go here
 └── index.js       # Main service entry point
manifest.json       # Service configuration
package.json        # Dependencies
```

## Authentication Configuration

Configure authentication in the manifest.json file:

```json
"configuration": {
  "useAuth": {
    "default": false,
    "type": "boolean",
    "description": "Enable JWT authentication middleware"
  },
  "jwtSecret": {
    "type": "string",
    "default": "SuperSecretWord"
  },
  "useRefreshTokens": {
    "default": false,
    "type": "boolean"
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
