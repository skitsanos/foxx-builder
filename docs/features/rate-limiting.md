# Rate Limiting

Rate limiting protects your API from abuse by limiting the number of requests that can be made by a single client in a given time period. This is essential for maintaining service availability and preventing denial-of-service attacks.

## How It Works

The rate limiter tracks requests by client identifier (either user ID or IP address) and enforces configurable limits on request frequency. When a client exceeds the rate limit, they receive a `429 Too Many Requests` response.

## Configuration

Rate limiting is configurable through the service manifest:

```json
{
  "configuration": {
    "useRateLimiting": {
      "default": false,
      "type": "boolean",
      "description": "Whether to enable rate limiting middleware"
    },
    "requestsPerMinute": {
      "default": 60,
      "type": "integer",
      "description": "Maximum number of requests allowed per minute per client"
    },
    "rateLimitExemptPaths": {
      "type": "json",
      "default": ["/status", "/health"],
      "description": "Paths exempt from rate limiting (supports wildcards with *)"
    },
    "rateLimitExemptRoles": {
      "type": "json",
      "default": ["admin"],
      "description": "User roles exempt from rate limiting"
    }
  }
}
```

## Usage

To enable rate limiting, set `useRateLimiting` to `true` in your service configuration:

```shell
# Using foxx-cli
foxx config /api useRateLimiting true --database mydb

# Using ArangoDB web interface
# Navigate to Services > Configuration and enable "useRateLimiting"
```

### Configuration Options

#### requestsPerMinute

Defines how many requests a client can make per minute. Adjust this based on your API's capacity and expected client behavior.

```shell
foxx config /api requestsPerMinute 120 --database mydb
```

#### rateLimitExemptPaths

Specifies paths that should be exempt from rate limiting. Useful for public endpoints like health checks that don't need limiting.

```shell
foxx config /api rateLimitExemptPaths '["/status", "/health", "/public/*"]' --database mydb
```

Wildcard support allows you to exempt entire path hierarchies:
- `/public/*` - Exempts all paths that start with `/public/`

#### rateLimitExemptRoles

Defines user roles that should be exempt from rate limiting. By default, users with the `admin` role are exempt.

```shell
foxx config /api rateLimitExemptRoles '["admin", "api", "service"]' --database mydb
```

## Client Identification

The rate limiter identifies clients in the following ways:

1. **Authenticated Users**: For requests with a valid authentication token, the user's ID is used as the identifier.
2. **Anonymous Requests**: For requests without authentication, the client's IP address is used.

## Response Format

When a client exceeds the rate limit, they receive a response with:

- **HTTP Status Code**: 429 Too Many Requests
- **Response Body**:
  ```json
  {
    "error": true,
    "message": "Rate limit exceeded. Please try again later.",
    "code": 429
  }
  ```

## Best Practices

- Start with more lenient limits and adjust based on observed traffic patterns
- Configure higher limits for authenticated users compared to anonymous ones
- Always exempt health check endpoints to ensure monitoring systems continue to function
- Consider implementing retry logic in clients with exponential backoff
