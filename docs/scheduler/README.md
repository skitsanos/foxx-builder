# Scheduler Service

The Scheduler Service provides a comprehensive task scheduling system for Foxx Builder. It enables automating recurring tasks and executing time-based operations with reliability and flexibility.

## Features

- **Multiple Task Types**: Support for script tasks, webhook tasks, and email tasks
- **Flexible Scheduling**: Use cron-like expressions for scheduling tasks
- **Retry Mechanism**: Configure automatic retries for failed tasks
- **Execution Tracking**: Detailed history of task executions with results and error information
- **Self-Healing**: Watchdog mechanism ensures the scheduler keeps running
- **Admin API**: REST API for managing tasks

## Task Types

### Script Tasks

Script tasks execute JavaScript code stored in files within your Foxx service. These scripts can perform any operation available to your Foxx service, such as database operations, file system access, or custom business logic.

```javascript
// Example script task
{
  "name": "cleanup-old-data",
  "description": "Remove data older than 30 days",
  "type": "script", // Script task type
  "handler": "scripts/cleanup.js", // Path to the script file
  "params": {
    "olderThan": 30,
    "collection": "logs"
  },
  "schedule": "0 0 * * *", // Daily at midnight
  "recurring": true
}
```

### Webhook Tasks

Webhook tasks make HTTP requests to external services or APIs. This enables integration with external systems, triggering processes in other applications, or collecting data from external sources.

```javascript
// Example webhook task
{
  "name": "daily-weather-update",
  "description": "Fetch weather data from external API",
  "type": "webhook", // Webhook task type
  "params": {
    "url": "https://api.weather.com/forecast",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer YOUR_API_KEY",
      "Content-Type": "application/json"
    },
    "timeout": 30000,
    "followRedirect": true
  },
  "schedule": "0 6 * * *", // Daily at 6:00 AM
  "recurring": true
}
```

Webhook tasks support the following parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | String | **Required**. The URL to request |
| `method` | String | HTTP method (GET, POST, PUT, DELETE, PATCH). Default: GET |
| `headers` | Object | HTTP headers to include with the request |
| `body` | String/Object | Request body (for POST, PUT, PATCH) |
| `timeout` | Number | Request timeout in milliseconds. Default: 30000 (30 seconds) |
| `followRedirect` | Boolean | Whether to follow redirects. Default: true |

### Email Tasks

Email tasks send emails using configured email providers. The scheduler supports multiple email providers with Resend as the default implementation.

```javascript
// Example email task
{
  "name": "weekly-report",
  "description": "Send weekly status report",
  "type": "email", // Email task type
  "params": {
    "to": ["team@example.com", "manager@example.com"],
    "from": "reports@example.com",
    "subject": "Weekly Status Report",
    "html": "<h1>Weekly Report</h1><p>This is the weekly status report.</p>",
    "text": "Weekly Report\n\nThis is the weekly status report.",
    "cc": ["cc@example.com"],
    "provider": "resend" // Optional - specify a provider, otherwise uses default
  },
  "schedule": "0 9 * * 1", // Every Monday at 9:00 AM
  "recurring": true
}
```

Email tasks support the following parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | String/Array | **Required**. Recipient email address(es) |
| `subject` | String | **Required**. Email subject |
| `text` | String | Plain text content (either text or html is required) |
| `html` | String | HTML content (either text or html is required) |
| `from` | String | Sender email address (uses default if not specified) |
| `cc` | String/Array | Carbon copy recipients |
| `bcc` | String/Array | Blind carbon copy recipients |
| `replyTo` | String | Reply-to email address |
| `attachments` | Array | Email attachments (provider-specific format) |
| `provider` | String | Email provider to use (uses default if not specified) |

## Scheduling

The scheduler supports cron-like expressions for defining when tasks should run. The supported formats are:

- `0 0 * * *` - Daily at midnight
- `0 * * * *` - Hourly at minute 0
- `0 0 * * 1` - Weekly on Monday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight
- `now` - Immediate execution

## API Endpoints

The scheduler provides RESTful API endpoints for managing tasks:

- `GET /admin/scheduler` - List all tasks
- `POST /admin/scheduler` - Create a new task
- `GET /admin/scheduler/:id` - Get a specific task
- `PUT /admin/scheduler/:id` - Update a task
- `DELETE /admin/scheduler/:id` - Delete a task
- `POST /admin/scheduler/:id/actions/run` - Execute a task manually
- `POST /admin/scheduler/:id/actions/pause` - Pause a task
- `POST /admin/scheduler/:id/actions/resume` - Resume a paused task

## Usage Examples

### Creating a Script Task

```javascript
// Example: Create a daily backup task
const scheduler = require('../builder/scheduler');

scheduler.createTask({
  name: 'daily-backup',
  description: 'Perform daily database backup',
  type: 'script',
  handler: 'scripts/backup.js',
  params: {
    collections: ['users', 'orders', 'products']
  },
  schedule: '0 2 * * *', // Daily at 2:00 AM
  recurring: true,
  maxRetries: 3
});
```

### Creating a Webhook Task

```javascript
// Example: Create a webhook task for external notification
const scheduler = require('../builder/scheduler');

scheduler.createTask({
  name: 'api-health-check',
  description: 'Check external API health',
  type: 'webhook',
  params: {
    url: 'https://api.example.com/health',
    method: 'GET',
    headers: {
      'X-API-Key': 'your-api-key'
    },
    timeout: 10000
  },
  schedule: '*/15 * * * *', // Every 15 minutes
  recurring: true,
  maxRetries: 2,
  retryDelay: 300000 // 5 minutes
});
```
