# Scheduler Service Examples

The Foxx Builder scheduler service provides comprehensive task scheduling capabilities with support for:

- **Script Tasks**: Execute custom JavaScript functions
- **Webhook Tasks**: Make HTTP requests to external services  
- **Email Tasks**: Send scheduled emails
- **Cron Scheduling**: Use cron expressions for recurring tasks
- **Task Management**: Pause, resume, retry, and monitor tasks

## Directory Structure

- `script-tasks.js`: Examples of scheduled script execution
- `webhook-tasks.js`: HTTP webhook scheduling examples
- `email-tasks.js`: Scheduled email examples  
- `cron-patterns.js`: Common cron scheduling patterns
- `task-management.js`: Managing and monitoring tasks
- `one-time-tasks.js`: Immediate and delayed execution

## Getting Started

The scheduler service is available through the module context:

```javascript
const { runTask } = module.context;

// Create a recurring task
runTask(
  'daily-cleanup',         // Task name
  'cleanup-logs',          // Script handler path
  { days: 30 },           // Parameters
  24 * 60 * 60 * 1000     // Period (24 hours in ms)
);
```

## Common Use Cases

1. **Daily Maintenance**: Database cleanup, log rotation
2. **Email Campaigns**: Newsletter sending, reminders
3. **Data Processing**: Report generation, data synchronization
4. **Monitoring**: Health checks, external service validation
5. **Integrations**: Webhook notifications, API synchronization

## Best Practices

- Use specific task names for easy identification
- Implement proper error handling in task scripts
- Set appropriate retry counts and delays
- Monitor task execution history
- Use cron expressions for precise scheduling