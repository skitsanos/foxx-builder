# Scheduled Tasks

The Scheduled Tasks feature provides a powerful system for running background tasks on a schedule. This enables automation of routine operations, periodic maintenance, reports generation, and other recurring tasks.

## Overview

The task scheduler offers:

- **Flexible Scheduling**: Run tasks immediately, hourly, daily, weekly, or monthly
- **One-time and Recurring Tasks**: Configure tasks to run once or repeatedly
- **Task Management**: Create, update, pause, resume, and delete tasks
- **Execution History**: Track task executions, success/failure status, and output
- **Admin Controls**: Manage tasks through a comprehensive admin API
- **Automatic Retries**: Configurable retry mechanism for failed tasks

## Core Features

### Task Types

Two primary types of tasks are supported:

1. **One-time Tasks**: Execute at a specific time and then complete
2. **Recurring Tasks**: Execute periodically based on a schedule

### Scheduling Options

Tasks can be scheduled using cron-like expressions:

- **Immediate Execution**: Schedule as "now" to run immediately
- **Hourly**: Run every hour at a specific minute (e.g., "30 * * * *" for 30 minutes past each hour)
- **Daily**: Run every day at a specific time (e.g., "0 8 * * *" for 8:00 AM daily)
- **Weekly**: Run on specific days of the week (e.g., "0 9 * * 1" for 9:00 AM every Monday)
- **Monthly**: Run on specific days of the month (e.g., "0 0 1 * *" for midnight on the 1st of each month)

### Task Execution

Tasks are executed by:

1. A periodic scheduler that runs every minute to check for due tasks
2. Manual execution through the admin API
3. Immediate execution when a one-time task is created with "now" schedule

### Error Handling and Retries

The task scheduler includes a robust error handling and retry system:

- **Automatic Retries**: Failed tasks can automatically retry execution after a configurable delay
- **Configurable Retry Limits**: Set the maximum number of retry attempts per task
- **Retry Delay**: Configure the time to wait between retry attempts
- **Retry Status Tracking**: Monitor the retry count and history for each task
- **Manual Intervention**: Reset retry count or manually execute tasks as needed

When a task fails, the system:

1. Checks if the task has retries configured (`maxRetries > 0`)
2. If retries are available, schedules the task to run again after the specified delay
3. Increments the retry counter and updates the task status to `retry-scheduled`
4. Records the failure and retry information in the execution history
5. After reaching the maximum retry count, marks the task as `failed`

### Task Status

Tasks can have the following statuses:

- **Active**: Ready to run at the scheduled time
- **Paused**: Temporarily disabled, won't run until resumed
- **Running**: Currently executing
- **Completed**: Finished execution (for one-time tasks)
- **Failed**: Encountered an error during execution
- **Retry-Scheduled**: Failed but scheduled for automatic retry

## API Endpoints

### Task Management

- **GET /admin/scheduler**: List all scheduled tasks with pagination and filtering
- **POST /admin/scheduler**: Create a new scheduled task
- **GET /admin/scheduler/:id**: Get details of a specific task
- **PUT /admin/scheduler/:id**: Update a specific task
- **DELETE /admin/scheduler/:id**: Delete a specific task

### Task Control

- **POST /admin/scheduler/:id/actions/run**: Execute a task immediately
- **POST /admin/scheduler/:id/actions/pause**: Pause a task
- **POST /admin/scheduler/:id/actions/resume**: Resume a paused task
- **POST /admin/scheduler/:id/actions/reset-retries**: Reset the retry count for a task

### Task Monitoring

- **GET /admin/scheduler/:id/executions**: Get execution history for a task

## Task Handlers

Task handlers are JavaScript files located in the `src/tasks` directory. Each handler is a module that exports a function which receives parameters and performs the actual task work.

Example task handler:

```javascript
module.exports = (params) => {
    try {
        const { option1, option2 } = params;
        
        // Perform task operations
        console.log('Executing task with parameters:', params);
        
        // Return result
        return {
            success: true,
            message: 'Task completed successfully'
        };
    } catch (error) {
        console.error('Task error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};
```

## Usage Examples

### Creating a Daily Cleanup Task with Retries

```javascript
// POST /admin/scheduler
{
    "name": "daily-cleanup",
    "description": "Remove old logs and temporary files daily",
    "handler": "cleanup-logs",
    "params": {
        "olderThan": 30,
        "dryRun": false
    },
    "schedule": "0 3 * * *",  // Run at 3:00 AM daily
    "recurring": true,
    "maxRetries": 3,          // Retry up to 3 times on failure
    "retryDelay": 300000      // Wait 5 minutes between retry attempts
}
```

### Creating an Immediate One-time Task

```javascript
// POST /admin/scheduler
{
    "name": "generate-monthly-report",
    "description": "Generate monthly sales report",
    "handler": "generate-report",
    "params": {
        "reportType": "sales",
        "month": 7,
        "year": 2023,
        "format": "pdf"
    },
    "schedule": "now",  // Run immediately
    "recurring": false
}
```

### Pausing a Task

```
POST /admin/scheduler/task-123/actions/pause
```

### Running a Task Manually

```
POST /admin/scheduler/task-123/actions/run
```

### Resetting Retry Count

```
POST /admin/scheduler/task-123/actions/reset-retries
```

## Implementation Details

### Database Schema

Tasks are stored in the `scheduledTasks` collection with the following structure:

```json
{
    "_key": "task-123",
    "name": "daily-cleanup",
    "description": "Remove old logs and temporary files daily",
    "handler": "cleanup-logs",
    "params": {
        "olderThan": 30,
        "dryRun": false
    },
    "schedule": "0 3 * * *",
    "scheduleType": "daily",
    "nextRun": 1625097600000,
    "period": 86400000,
    "recurring": true,
    "maxRetries": 3,
    "retryDelay": 300000,
    "retryCount": 0,
    "lastRetry": null,
    "status": "active",
    "createdAt": 1625011200000,
    "updatedAt": 1625011200000,
    "lastExecution": {
        "status": "completed",
        "time": 1625097600000,
        "duration": 1520,
        "error": null
    },
    "executions": [
        {
            "id": "exec-456",
            "taskId": "task-123",
            "status": "completed",
            "startTime": 1625097600000,
            "duration": 1520,
            "error": null,
            "createdAt": 1625097600000
        }
    ]
}
```

### Security

- All task management endpoints require admin privileges
- Task execution is isolated to prevent system-wide issues
- Task parameters are sanitized before execution
- Failed tasks are logged for troubleshooting

## Best Practices

1. **Descriptive Names**: Use clear, descriptive names for tasks
2. **Idempotent Handlers**: Make task handlers idempotent (safe to run multiple times)
3. **Parameters**: Pass configuration as parameters rather than hardcoding
4. **Error Handling**: Implement proper error handling in task handlers
5. **Appropriate Retries**: Configure retries for tasks that might fail due to temporary issues
6. **Progressive Delay**: For production, consider implementing exponential backoff for retries
7. **Resource Usage**: Be mindful of resource usage for long-running tasks
8. **Logging**: Use console.log for important information that will be captured in task output
9. **Run Frequency**: Choose appropriate schedules to avoid overloading the system

## Built-in Task Examples

### Cleanup Logs

Removes old logs and activity records to prevent database bloat.

```javascript
// Parameters
{
    "olderThan": 30,  // Days
    "dryRun": false   // If true, only simulate deletion
}
```

### Database Statistics

Collects and records database statistics for monitoring.

```javascript
// Parameters
{
    "detailed": false  // If true, collect additional details
}
```
