# The Power of Foxx Builder's Scheduler Service: Automating Tasks in Your ArangoDB Microservices

*By skitsanos*

*April 15, 2025*


## Introduction

Modern microservices architectures often require automation to handle recurring tasks, data maintenance, and periodic operations. The Foxx Builder framework for ArangoDB includes a robust Scheduler service that enables developers to automate tasks directly within their database microservices. In this article, we'll explore the benefits, features, and best practices for using the Scheduler service in your Foxx Builder applications.

## What is the Scheduler Service?

The Scheduler service is a powerful component of Foxx Builder that allows you to create, manage, and monitor recurring or one-time tasks within your ArangoDB Foxx microservices. It provides a clean, intuitive API for scheduling tasks and comes with built-in support for various task types, including:

- **Script tasks**: Execute JavaScript code within your service
- **Webhook tasks**: Make HTTP requests to external endpoints
- **Email tasks**: Send emails at scheduled intervals

The service handles all the complex aspects of task scheduling and execution, including error handling, retries, execution history, and status tracking.

## Key Features

### Flexible Scheduling Options

The Scheduler service supports cron-like expressions for defining when tasks should run:

```javascript
// Daily at 8:00 AM
const schedule = "0 8 * * *";

// Every 30 minutes
const schedule = "30 * * * *";

// Weekly on Monday at 9:00 AM
const schedule = "0 9 * * 1";

// Monthly on the 1st at midnight
const schedule = "0 0 1 * *";

// Or run immediately
const schedule = "now";
```

### Multiple Task Types

The service supports different task types to handle various scenarios:

#### Script Tasks

Execute JavaScript code within your Foxx service:

```javascript
scheduler.createTask({
    name: "generate-daily-report",
    description: "Generate daily user activity report",
    type: "script",
    handler: "reports/daily-activity",
    params: {
        format: "json",
        includeInactive: false
    },
    schedule: "0 5 * * *", // 5:00 AM daily
    recurring: true
});
```

#### Webhook Tasks

Make HTTP requests to external systems:

```javascript
scheduler.createTask({
    name: "sync-external-system",
    description: "Synchronize data with external API",
    type: "webhook",
    params: {
        url: "https://api.example.com/sync",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer ${token}"
        },
        body: {
            source: "arangodb",
            timestamp: new Date().toISOString()
        }
    },
    schedule: "0 */2 * * *", // Every 2 hours
    recurring: true
});
```

#### Email Tasks

Send emails at scheduled intervals:

```javascript
scheduler.createTask({
    name: "weekly-summary",
    description: "Send weekly summary to users",
    type: "email",
    params: {
        to: "users@example.com",
        subject: "Weekly Summary Report",
        html: "<h1>Weekly Summary</h1><p>Your weekly activity summary...</p>",
        from: "no-reply@example.com"
    },
    schedule: "0 9 * * 1", // Monday at 9:00 AM
    recurring: true
});
```

### Comprehensive Error Handling and Retries

The Scheduler service includes built-in support for error handling and automatic retries:

```javascript
scheduler.createTask({
    name: "process-payments",
    description: "Process pending payments",
    type: "script",
    handler: "payments/process",
    schedule: "*/15 * * * *", // Every 15 minutes
    recurring: true,
    maxRetries: 3,        // Retry up to 3 times
    retryDelay: 300000    // 5 minutes between retries
});
```

If a task fails, the service will automatically schedule retries (if configured), with exponential backoff if needed. This ensures that temporary failures don't lead to permanent data loss or processing gaps.

### Task Execution History

Each task keeps a history of recent executions, making it easy to troubleshoot issues:

```javascript
const executions = scheduler.getTaskExecutions("task-id", 5);
console.log(executions);
/*
[
  {
    id: "abc123",
    taskId: "task-id",
    status: "completed",
    startTime: 1618234567890,
    duration: 1250,
    error: null
  },
  {
    id: "def456",
    taskId: "task-id",
    status: "failed",
    startTime: 1618234467890,
    duration: null,
    error: "Connection timeout"
  }
]
*/
```

### Task Management API

The service provides a comprehensive API for managing tasks:

```javascript
// Create a new task
const task = scheduler.createTask({...});

// Update an existing task
scheduler.updateTask("task-id", {
    description: "Updated description",
    schedule: "0 10 * * *"  // Change to 10:00 AM daily
});

// Pause a task
scheduler.pauseTask("task-id");

// Resume a paused task
scheduler.resumeTask("task-id");

// Delete a task
scheduler.deleteTask("task-id");

// Run a task immediately
scheduler.executeTaskManually("task-id");
```

## Benefits of Using the Scheduler Service

### 1. Reduced External Dependencies

By handling scheduling within your Foxx microservice, you eliminate the need for external scheduling tools or cron jobs. This simplifies your architecture and reduces potential points of failure.

### 2. Database-Native Operations

Tasks execute within the database environment, giving them direct access to your data without network overhead. This is especially valuable for data maintenance tasks like cleanup, aggregation, or index rebuilding.

### 3. Transactional Safety

Tasks can utilize ArangoDB's transaction capabilities, ensuring that operations either complete fully or not at all. This prevents data inconsistencies that might occur with external schedulers.

### 4. Centralized Management

All scheduled tasks are stored in the database and manageable through the same API, providing a unified interface for monitoring and control.

### 5. Built-in Monitoring

The execution history and status tracking make it easy to monitor task performance and troubleshoot issues when they arise.

## Best Practices

### 1. Use Meaningful Task Names

Choose descriptive task names that clearly indicate the purpose:

```javascript
// Good
const task = scheduler.createTask({
    name: "user-cleanup-inactive-accounts",
    // ...
});

// Not as good
const task = scheduler.createTask({
    name: "cleanup-task-1",
    // ...
});
```

### 2. Keep Tasks Focused

Design tasks to do one thing well rather than combining multiple operations:

```javascript
// Better: Separate concerns
scheduler.createTask({
    name: "reports-generate-daily-metrics",
    // ...
});

scheduler.createTask({
    name: "reports-email-daily-metrics",
    // ...
});

// Avoid: Combining too many operations
scheduler.createTask({
    name: "daily-metrics-generate-and-email",
    // ...
});
```

### 3. Configure Appropriate Retry Strategies

Think carefully about whether and how tasks should retry on failure:

```javascript
// Time-sensitive tasks with quick retries
scheduler.createTask({
    name: "payment-gateway-sync",
    // ...
    maxRetries: 5,
    retryDelay: 60000  // 1 minute
});

// Less urgent tasks with longer delays
scheduler.createTask({
    name: "weekly-analytics-rollup",
    // ...
    maxRetries: 3,
    retryDelay: 3600000  // 1 hour
});
```

### 4. Use Task Parameters for Configuration

Parameterize tasks to make them more flexible and configurable:

```javascript
scheduler.createTask({
    name: "data-export",
    type: "script",
    handler: "exports/generate",
    params: {
        format: "csv",
        includeArchived: false,
        limit: 1000
    },
    // ...
});
```

### 5. Implement Idempotent Operations

Design tasks to be idempotent (safe to run multiple times) whenever possible:

```javascript
// In your task handler:
function processPayments(params) {
    // Find unprocessed payments
    const payments = db._query(`
        FOR p IN payments
        FILTER p.status == 'pending' AND p.createdAt < ${Date.now() - 3600000}
        RETURN p
    `).toArray();
    
    for (const payment of payments) {
        // Process only if not already processed
        if (payment.status !== 'processed') {
            // Process payment...
            
            // Mark as processed with transaction timestamp
            db._collection('payments').update(payment._key, {
                status: 'processed',
                processedAt: Date.now()
            });
        }
    }
}
```

### 6. Log Task Activity

Add appropriate logging in your task handlers:

```javascript
function dataCleanup(params) {
    console.log(`Starting data cleanup task with params: ${JSON.stringify(params)}`);
    
    // Task logic...
    
    console.log(`Data cleanup completed. Processed ${count} records.`);
    return { count, timestamp: new Date().toISOString() };
}
```

### 7. Regular Task Auditing

Periodically review your scheduled tasks to ensure they're still necessary and performing optimally:

```javascript
// Get all tasks for review
const tasks = scheduler.getAllTasks();
console.log(`System has ${tasks.length} scheduled tasks`);

// List tasks with failures
const failingTasks = tasks.filter(task => 
    task.lastExecution && task.lastExecution.status === 'failed'
);
console.log(`Found ${failingTasks.length} failing tasks to review`);
```

## Real-World Examples

### Example 1: Session Cleanup

Automatically remove expired user sessions:

```javascript
scheduler.createTask({
    name: "auth-session-cleanup",
    description: "Remove expired user sessions",
    type: "script",
    handler: "auth/cleanup-sessions",
    params: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        batchSize: 500
    },
    schedule: "0 3 * * *", // 3:00 AM daily
    recurring: true
});
```

### Example 2: External API Synchronization

Keep your system in sync with an external service:

```javascript
scheduler.createTask({
    name: "products-sync-inventory",
    description: "Synchronize inventory with ERP system",
    type: "webhook",
    params: {
        url: "https://erp.example.com/api/inventory",
        method: "GET",
        headers: {
            "API-Key": "your-api-key"
        },
        followRedirect: true,
        timeout: 60000 // 60 seconds
    },
    schedule: "*/30 * * * *", // Every 30 minutes
    recurring: true,
    maxRetries: 3
});
```

### Example 3: Report Generation and Delivery

Generate and email reports to stakeholders:

```javascript
scheduler.createTask({
    name: "monthly-financial-report",
    description: "Generate and email monthly financial report",
    type: "script",
    handler: "reports/financial-monthly",
    params: {
        recipients: ["finance@example.com", "executives@example.com"],
        format: "pdf",
        includeCharts: true
    },
    schedule: "0 9 1 * *", // 9:00 AM on the 1st of each month
    recurring: true
});
```

## Conclusion

The Scheduler service in Foxx Builder provides a powerful way to automate tasks directly within your ArangoDB microservices. By leveraging this feature, you can simplify your architecture, improve reliability, and automate routine operations without external dependencies.

Whether you're cleaning up old data, synchronizing with external systems, or generating reports, the Scheduler service offers the flexibility and reliability needed for production applications. With proper task design and attention to best practices, you can build a robust automation system that keeps your application running smoothly with minimal manual intervention.

Start exploring the Scheduler service in your Foxx Builder applications today to unlock the full potential of task automation in your ArangoDB microservices.

---

*Have questions about the Scheduler service or other Foxx Builder features? Join our community at [community.arangodb.com](https://community.arangodb.com) or check out the [official documentation](https://docs.arangodb.com).*