# Health Checks

Health checks provide a way to monitor the status and health of your Foxx service. They are essential for integration with container orchestration systems like Kubernetes, Docker Swarm, or monitoring tools like Prometheus, Nagios, or Zabbix.

## Overview

Foxx Builder provides two types of health check endpoints:

1. **Status Check** (`/status`): A lightweight endpoint that returns a simple status response to verify the service is running.
2. **Health Check** (`/health`): A more comprehensive endpoint that checks various system components and provides detailed health information.

Both endpoints are:
- Exempt from authentication
- Exempt from rate limiting
- Designed to respond with appropriate HTTP status codes

## Status Check

The Status Check endpoint is designed for simple liveness probes. It verifies that the service is running and can respond to requests.

**Endpoint**: `GET /status`

**Response**:
```json
{
  "status": "ok",
  "service": "foxx-service",
  "version": "2.3.0",
  "timestamp": "2023-07-21T12:34:56.789Z",
  "uptime": 3600,
  "execTime": 0.002
}
```

If the service is experiencing issues, it will return a 503 Service Unavailable status code:

```json
{
  "status": "error",
  "service": "foxx-service", 
  "version": "2.3.0",
  "timestamp": "2023-07-21T12:34:56.789Z",
  "uptime": 3600,
  "execTime": 0.004
}
```

## Health Check

The Health Check endpoint provides comprehensive information about the health of various system components.

**Endpoint**: `GET /health`

### Query Parameters

- `format`: Response format (`simple` or `detailed`, default: `simple`)
- `check`: Specific component to check (`all`, `db`, `memory`, `tasks`, `auth`, default: `all`)
- `timeout`: Timeout in milliseconds for each check operation (default: `3000`)

### Simple Format

The simple format provides a high-level overview of system health:

```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2023-07-21T12:34:56.789Z",
  "service": {
    "name": "foxx-service",
    "version": "2.3.0"
  }
}
```

### Detailed Format

The detailed format provides comprehensive information about each component:

```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2023-07-21T12:34:56.789Z",
  "service": {
    "name": "foxx-service",
    "version": "2.3.0",
    "description": "Foxx API Services",
    "author": "skitsanos"
  },
  "server": {
    "version": "3.9.1",
    "license": "community",
    "details": {
      "architecture": "64bit",
      "platform": "linux"
    }
  },
  "checks": {
    "database": {
      "status": "ok",
      "message": "Database is healthy",
      "stats": {
        "collections": 12,
        "queryResponseTime": 0.001
      },
      "execTime": 0.005
    },
    "memory": {
      "status": "ok",
      "message": "Memory usage is healthy",
      "stats": {
        "memoryUsage": {
          "rss": "128 MB",
          "heapTotal": "64 MB",
          "heapUsed": "32 MB",
          "external": "8 MB",
          "usagePercent": "50%"
        },
        "cpuTime": {
          "user": 1200,
          "system": 600
        }
      },
      "execTime": 0.002
    },
    "tasks": {
      "status": "ok",
      "message": "Task system is healthy",
      "stats": {
        "total": 5,
        "active": 3,
        "failed": 0,
        "running": 1,
        "retrying": 1
      },
      "execTime": 0.003
    },
    "auth": {
      "status": "ok",
      "message": "Authentication system is healthy",
      "stats": {
        "authEnabled": true,
        "adminRoleExists": true,
        "userCount": 10
      },
      "execTime": 0.002
    }
  },
  "meta": {
    "execTime": 0.015
  }
}
```

### Status Codes

The health check endpoints return the following HTTP status codes:

- **200 OK**: The service is healthy
- **503 Service Unavailable**: The service is degraded or experiencing issues
- **500 Internal Server Error**: The health check itself failed

## Component Checks

### Database Check

Verifies database connectivity and performance:
- Checks if required collections exist
- Executes a simple query to verify database responsiveness
- Measures query response time
- Gathers database statistics

### Memory Check

Monitors memory usage and resource allocation:
- Calculates memory usage percentage
- Monitors heap usage
- Tracks CPU time
- Reports detailed memory statistics

### Tasks Check

Monitors the scheduled tasks system:
- Verifies the tasks collection exists
- Counts tasks by status (active, failed, running, retrying)
- Detects stuck tasks (running for too long)
- Reports task statistics

### Auth Check

Verifies the authentication system:
- Checks if authentication is enabled
- Verifies required collections exist
- Checks if the admin role exists
- Reports auth system statistics

## Integration with Monitoring Systems

### Kubernetes

For Kubernetes liveness and readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /status
    port: 8529
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 8529
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 3
```

### Prometheus

For Prometheus monitoring, you can create an exporter that scrapes the health check endpoint:

```yaml
scrape_configs:
  - job_name: 'foxx-service'
    metrics_path: '/health'
    scrape_interval: 15s
    static_configs:
      - targets: ['foxx-service:8529']
```

### Docker Health Check

For Docker health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8529/_db/mydb/status || exit 1
```

## Best Practices

1. **Regular Monitoring**: Incorporate health checks into your monitoring system
2. **Alert on Degradation**: Set up alerts for degraded or error states
3. **Dashboard Visualization**: Create dashboards to visualize health metrics over time
4. **Component Isolation**: Use the `check` parameter to isolate specific components for troubleshooting
5. **Custom Thresholds**: Adjust status thresholds based on your specific environment
