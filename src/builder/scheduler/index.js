/**
 * Scheduler Service for Foxx Builder
 * 
 * @module builder/scheduler
 * 
 * Provides a comprehensive task scheduling system with:
 * - One-time and recurring tasks
 * - Cron-like scheduling syntax
 * - Task management API (create, update, delete, pause, resume)
 * - Execution history and status tracking
 * 
 * @version 1.0.0
 * @author skitsanos
 */
const { db, query } = require('@arangodb');
const tasks = require('@arangodb/tasks');
const crypto = require('@arangodb/crypto');
const request = require('@arangodb/request');
const aql = require('@arangodb').aql;
const emailService = require('../email');

/**
 * Helper function to parse cron-like expressions
 * 
 * @param {string} cronExpression - Cron-like expression (e.g., "0 0 * * *" for daily at midnight)
 * @returns {Object} Next run time information
 */
const parseCronExpression = (cronExpression) => {
    try {
        // Simple cron parser for common patterns
        // In a production system, you might want to use a more robust parser
        
        // Daily at specific time: "0 8 * * *" (8:00 AM daily)
        if (cronExpression.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/)) {
            const [_, minute, hour] = cronExpression.split(/\s+/);
            const now = new Date();
            const nextRun = new Date(now);
            
            nextRun.setHours(parseInt(hour));
            nextRun.setMinutes(parseInt(minute));
            nextRun.setSeconds(0);
            nextRun.setMilliseconds(0);
            
            // If the time has already passed today, schedule for tomorrow
            if (nextRun <= now) {
                nextRun.setDate(nextRun.getDate() + 1);
            }
            
            return {
                nextRun: nextRun.getTime(),
                period: 24 * 60 * 60 * 1000, // Daily (in ms)
                type: 'daily'
            };
        }
        
        // Hourly at specific minute: "30 * * * *" (at minute 30 of every hour)
        if (cronExpression.match(/^(\d+)\s+\*\s+\*\s+\*\s+\*$/)) {
            const [_, minute] = cronExpression.split(/\s+/);
            const now = new Date();
            const nextRun = new Date(now);
            
            nextRun.setMinutes(parseInt(minute));
            nextRun.setSeconds(0);
            nextRun.setMilliseconds(0);
            
            // If the time has already passed this hour, schedule for next hour
            if (nextRun <= now) {
                nextRun.setHours(nextRun.getHours() + 1);
            }
            
            return {
                nextRun: nextRun.getTime(),
                period: 60 * 60 * 1000, // Hourly (in ms)
                type: 'hourly'
            };
        }
        
        // Weekly on specific day and time: "0 8 * * 1" (8:00 AM on Mondays)
        if (cronExpression.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+(\d+)$/)) {
            const [_, minute, hour, dayOfWeek] = cronExpression.split(/\s+/);
            const now = new Date();
            const nextRun = new Date(now);
            
            nextRun.setHours(parseInt(hour));
            nextRun.setMinutes(parseInt(minute));
            nextRun.setSeconds(0);
            nextRun.setMilliseconds(0);
            
            // Set to the next occurrence of the specified day of week
            const currentDay = nextRun.getDay();
            const targetDay = parseInt(dayOfWeek);
            let daysToAdd = targetDay - currentDay;
            
            if (daysToAdd < 0 || (daysToAdd === 0 && nextRun <= now)) {
                daysToAdd += 7;
            }
            
            nextRun.setDate(nextRun.getDate() + daysToAdd);
            
            return {
                nextRun: nextRun.getTime(),
                period: 7 * 24 * 60 * 60 * 1000, // Weekly (in ms)
                type: 'weekly'
            };
        }
        
        // Monthly on specific day: "0 0 1 * *" (midnight on the 1st of every month)
        if (cronExpression.match(/^(\d+)\s+(\d+)\s+(\d+)\s+\*\s+\*$/)) {
            const [_, minute, hour, dayOfMonth] = cronExpression.split(/\s+/);
            const now = new Date();
            const nextRun = new Date(now.getFullYear(), now.getMonth(), parseInt(dayOfMonth), parseInt(hour), parseInt(minute), 0, 0);
            
            // If the time has already passed this month, schedule for next month
            if (nextRun <= now) {
                nextRun.setMonth(nextRun.getMonth() + 1);
            }
            
            return {
                nextRun: nextRun.getTime(),
                period: 30 * 24 * 60 * 60 * 1000, // ~Monthly (in ms)
                type: 'monthly'
            };
        }
        
        // Default: treat as a one-time task at the specified time
        throw new Error('Unsupported cron expression format');
    } catch (error) {
        console.error(`Error parsing cron expression "${cronExpression}":`, error.message);
        
        // Default to a daily task at midnight
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        return {
            nextRun: tomorrow.getTime(),
            period: 24 * 60 * 60 * 1000, // Daily (in ms)
            type: 'daily'
        };
    }
};

/**
 * Scheduler service implementation
 */
const scheduler = {
    /**
     * Context reference
     */
    context: null,
    
    /**
     * Initialize the scheduler
     * 
     * @param {Object} context - Foxx module context
     * @returns {Object} - Scheduler instance
     */
    init(context) {
        if (!context) {
            throw new Error('Context is required for scheduler initialization');
        }
        
        this.context = context;
        
        // Ensure the scheduledTasks collection exists
        if (!db._collection('scheduledTasks')) {
            console.warn('scheduledTasks collection not found. Creating it now.');
            db._createDocumentCollection('scheduledTasks');
            
            // Create required indexes
            const taskCollection = db._collection('scheduledTasks');
            taskCollection.ensureIndex({ type: 'hash', fields: ['name'] });
            taskCollection.ensureIndex({ type: 'skiplist', fields: ['nextRun'] });
            taskCollection.ensureIndex({ type: 'hash', fields: ['status'] });
        }
        
        // Initialize email service
        emailService.init(context);
        
        this.setupTaskRunner();
        return this;
    },
    
    /**
     * Set up the task runner that periodically checks for due tasks
     * @param {number} checkInterval - Interval in seconds between checks (default: 60)
     */
    setupTaskRunner(checkInterval = 60) {
        try {
            // Validate check interval
            if (checkInterval < 10) {
                console.warn('Check interval too small, using 10 seconds minimum');
                checkInterval = 10;
            }
            
            // Check if the task runner is already registered
            try {
                const existingTask = tasks.get('scheduler-task-runner');
                if (existingTask) {
                    console.log('Unregistering existing scheduler task runner');
                    tasks.unregister('scheduler-task-runner');
                }
            } catch (error) {
                // Task doesn't exist, which is fine for first-time setup
                console.log('No existing scheduler task runner found (expected for first install)');
            }
            
            // Store reference to scheduler for task runner
            const schedulerInstance = this;
            
            // Register the task runner
            tasks.register({
                name: 'scheduler-task-runner',
                period: checkInterval,
                offset: 5, // Small offset to avoid potential timing issues
                command: function() {
                    try {
                        const startTime = new Date().getTime();
                        schedulerInstance.processDueTasks();
                        const duration = new Date().getTime() - startTime;
                        
                        if (duration > checkInterval * 500) { // If processing takes more than half the check interval
                            console.warn(`Scheduler task processing took ${duration}ms, which is more than half the check interval (${checkInterval * 1000}ms)`);
                        }
                    } catch (error) {
                        console.error('Error in scheduler task runner:', error.stack || error.message);
                    }
                }
            });
            
            console.log(`Scheduler task runner registered with ${checkInterval}s check interval`);
            
            // Register a watchdog task that ensures the main task runner is active
            const watchdogTaskName = 'scheduler-watchdog';
            try {
                const existingWatchdog = tasks.get(watchdogTaskName);
                if (existingWatchdog) {
                    console.log('Unregistering existing scheduler watchdog');
                    tasks.unregister(watchdogTaskName);
                }
            } catch (error) {
                console.log('No existing scheduler watchdog found (expected for first install)');
            }
            
            tasks.register({
                name: watchdogTaskName,
                period: 300, // Check every 5 minutes
                command: function() {
                    try {
                        // Import tasks module inside the function
                        const tasksModule = require('@arangodb/tasks');
                        
                        // Check if the main task runner exists
                        try {
                            tasksModule.get('scheduler-task-runner');
                        } catch (taskNotFoundError) {
                            console.warn('Scheduler task runner not found, re-registering...');
                            schedulerInstance.setupTaskRunner(checkInterval);
                        }
                    } catch (error) {
                        console.error('Error in scheduler watchdog:', error.message);
                    }
                }
            });
            
            console.log('Scheduler watchdog registered');
        } catch (error) {
            console.error(`Failed to setup task runner: ${error.stack || error.message}`);
            throw error;
        }
    },
    
    /**
     * Process tasks that are due for execution
     * @param {number} maxTasksPerRun - Maximum number of tasks to process in one run (default: 10)
     */
    processDueTasks(maxTasksPerRun = 10) {
        const now = new Date().getTime();
        
        try {
            // Get tasks that are due for execution
            const dueTasks = query`
                FOR task IN scheduledTasks
                FILTER 
                    task.nextRun <= ${now} AND 
                    task.status IN ['active', 'retry-scheduled']
                SORT task.nextRun ASC
                LIMIT ${maxTasksPerRun}
                RETURN task
            `.toArray();
            
            if (dueTasks.length > 0) {
                console.log(`Processing ${dueTasks.length} due tasks`);
            }
            
            // Process each due task
            for (const task of dueTasks) {
                try {
                    this.executeTask(task);
                } catch (taskError) {
                    console.error(`Failed to execute task ${task._key} (${task.name}):`, taskError.stack || taskError.message);
                    
                    // Update task status to avoid continuous failures
                    if (!this.shouldRetryTask(task)) {
                        this.updateTaskStatus(task._key, 'failed');
                        this.recordExecution(task._key, 'failed', null, 
                            `Task execution failed with unhandled error: ${taskError.message}`);
                    }
                }
            }
            
            // Return number of processed tasks
            return dueTasks.length;
        } catch (error) {
            console.error('Error processing due tasks:', error.stack || error.message);
            return 0;
        }
    },
    
    /**
     * Execute a scheduled task
     * 
     * @param {Object} task - Task to execute
     */
    executeTask(task) {
        try {
            // Update task status to "running"
            this.updateTaskStatus(task._key, 'running');
            
            // Create execution record
            const executionKey = this.recordExecution(task._key, 'started');
            
            // Execute the task based on its type
            const startTime = new Date().getTime();
            let result;
            
            switch (task.type) {
                case 'script':
                    result = this.executeScriptTask(task);
                    break;
                    
                case 'webhook':
                    result = this.executeWebhookTask(task);
                    break;
                    
                case 'email':
                    result = this.executeEmailTask(task);
                    break;
                    
                default:
                    throw new Error(`Unsupported task type: ${task.type}`);
            }
            
            const endTime = new Date().getTime();
            const executionTime = endTime - startTime;
            
            // Update execution record
            this.updateExecution(executionKey, 'completed', executionTime, null, result);
            
            // Reset retry count on successful execution
            if (task.retryCount > 0) {
                this.resetRetryCount(task._key);
            }
            
            // If the task is recurring, schedule the next run
            if (task.recurring) {
                let nextRun = task.nextRun + task.period;
                
                // Ensure we don't schedule multiple missed occurrences
                while (nextRun < new Date().getTime()) {
                    nextRun += task.period;
                }
                
                this.updateTaskNextRun(task._key, nextRun);
                this.updateTaskStatus(task._key, 'active');
            } else {
                // One-time task - mark as completed
                this.updateTaskStatus(task._key, 'completed');
            }
            
            return result;
        } catch (error) {
            console.error(`Error executing task ${task.name}:`, error.message);
            
            // Determine if we should retry
            const shouldRetry = this.shouldRetryTask(task);
            
            if (shouldRetry) {
                // Increment retry count and schedule retry
                this.retryTask(task, error.message);
            } else {
                // Update task status to "failed"
                this.updateTaskStatus(task._key, 'failed');
                
                // Record failure in task executions
                this.recordExecution(task._key, 'failed', null, error.message);
            }
            
            throw error;
        }
    },
    
    /**
     * Execute a script task
     * 
     * @param {Object} task - Script task to execute
     * @returns {Object} - Execution result
     */
    executeScriptTask(task) {
        if (!task.handler) {
            throw new Error(`Script task ${task.name} has no handler path`);
        }
        
        try {
            // Use the existing runTask method from the context
            const result = this.context.runTask(
                `scheduled-${task.name}`,
                task.handler,
                task.params || {}
            );
            
            return {
                success: true,
                type: 'script',
                result
            };
        } catch (error) {
            throw new Error(`Script execution failed: ${error.message}`);
        }
    },
    
    /**
     * Execute a webhook task
     * 
     * @param {Object} task - Webhook task to execute
     * @returns {Object} - Execution result
     */
    executeWebhookTask(task) {
        const params = task.params || {};
        
        if (!params.url) {
            throw new Error(`Webhook task ${task.name} has no URL specified`);
        }
        
        try {
            // Prepare request options
            const options = {
                method: params.method || 'GET',
                url: params.url,
                headers: params.headers || {},
                timeout: params.timeout || 30000, // Default timeout: 30 seconds
                followRedirect: params.followRedirect !== false
            };
            
            // Add body for POST, PUT, PATCH methods
            if (['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase()) && params.body) {
                if (typeof params.body === 'string') {
                    options.body = params.body;
                } else {
                    // If body is an object, stringify it as JSON and set proper content type
                    options.body = JSON.stringify(params.body);
                    if (!options.headers['Content-Type']) {
                        options.headers['Content-Type'] = 'application/json';
                    }
                }
            }
            
            // Make the request
            console.log(`Executing webhook task ${task.name} to ${options.method} ${options.url}`);
            const response = request(options);
            
            // Process response
            const result = {
                success: response.status >= 200 && response.status < 300,
                type: 'webhook',
                statusCode: response.status,
                headers: response.headers,
                body: response.body,
                timings: response.timings
            };
            
            // If the response indicates failure, throw an error
            if (!result.success) {
                throw new Error(`Webhook request failed with status ${response.status}: ${response.statusText}`);
            }
            
            return result;
        } catch (error) {
            throw new Error(`Webhook execution failed: ${error.message}`);
        }
    },
    
    /**
     * Execute an email task
     * 
     * @param {Object} task - Email task to execute
     * @returns {Object} - Execution result
     */
    executeEmailTask(task) {
        try {
            const params = task.params || {};
            
            // Validate required fields
            if (!params.to) {
                throw new Error('Recipient (to) is required for email task');
            }
            
            if (!params.subject) {
                throw new Error('Subject is required for email task');
            }
            
            if (!params.text && !params.html) {
                throw new Error('Either text or html content is required for email task');
            }
            
            // Check if email service is enabled
            if (!this.context.configuration.emailEnabled) {
                throw new Error('Email service is disabled in configuration');
            }
            
            console.log(`Executing email task ${task.name} to ${Array.isArray(params.to) ? params.to.join(', ') : params.to}`);
            
            // Send email using email service
            const result = emailService.send({
                to: params.to,
                from: params.from,
                subject: params.subject,
                text: params.text,
                html: params.html,
                cc: params.cc,
                bcc: params.bcc,
                replyTo: params.replyTo,
                attachments: params.attachments,
                provider: params.provider
            });
            
            return {
                success: true,
                type: 'email',
                messageId: result.messageId,
                provider: result.provider,
                recipients: Array.isArray(params.to) ? params.to : [params.to]
            };
        } catch (error) {
            throw new Error(`Email task execution failed: ${error.message}`);
        }
    },
    
    /**
     * Determine if a task should be retried
     * 
     * @param {Object} task - Task object
     * @returns {boolean} - Whether the task should be retried
     */
    shouldRetryTask(task) {
        // Check if retries are configured
        if (!task.maxRetries || task.maxRetries <= 0) {
            return false;
        }
        
        // Check if we've reached max retries
        return (task.retryCount || 0) < task.maxRetries;
    },
    
    /**
     * Retry a failed task after a delay
     * 
     * @param {Object} task - Task to retry
     * @param {string} errorMessage - Error message from previous attempt
     */
    retryTask(task, errorMessage) {
        try {
            const taskCollection = db._collection('scheduledTasks');
            const retryCount = (task.retryCount || 0) + 1;
            const now = new Date().getTime();
            const retryDelay = task.retryDelay || 60000; // Default: 1 minute
            const retryTime = now + retryDelay;
            
            // Record the failed execution
            this.recordExecution(task._key, 'failed', null, 
                `Execution failed: ${errorMessage}. Retry ${retryCount}/${task.maxRetries} scheduled at ${new Date(retryTime).toISOString()}`);
            
            // Update task with retry information
            taskCollection.update(task._key, {
                retryCount,
                lastRetry: now,
                nextRun: retryTime,
                status: 'retry-scheduled',
                updatedAt: now
            });
            
            console.log(`Task ${task.name} scheduled for retry ${retryCount}/${task.maxRetries} at ${new Date(retryTime).toISOString()}`);
        } catch (error) {
            console.error(`Error scheduling retry for task ${task._key}:`, error.message);
            // Fall back to marking as failed if we can't schedule a retry
            this.updateTaskStatus(task._key, 'failed');
        }
    },
    
    /**
     * Reset retry count for a task after successful execution
     * 
     * @param {string} taskId - Task ID
     */
    resetRetryCount(taskId) {
        try {
            const taskCollection = db._collection('scheduledTasks');
            
            taskCollection.update(taskId, {
                retryCount: 0,
                lastRetry: null,
                updatedAt: new Date().getTime()
            });
            
            console.log(`Reset retry count for task ${taskId} after successful execution`);
        } catch (error) {
            console.error(`Error resetting retry count for task ${taskId}:`, error.message);
        }
    },
    
    /**
     * Create a new scheduled task
     * 
     * @param {Object} taskData - Task data
     * @param {string} taskData.name - Task name
     * @param {string} taskData.description - Task description
     * @param {string} taskData.type - Task type (script, webhook, email, etc.)
     * @param {string} taskData.handler - Task handler script path (for script type)
     * @param {Object} taskData.params - Task parameters
     * @param {string} taskData.schedule - Cron-like schedule expression or "now" for immediate execution
     * @param {boolean} taskData.recurring - Whether the task is recurring
     * @param {number} taskData.maxRetries - Maximum retry attempts (0 means no retries)
     * @param {number} taskData.retryDelay - Delay between retries in milliseconds
     * @returns {Object} - Created task
     */
    createTask(taskData) {
        const { 
            name, 
            description, 
            type = 'script', // Default type is script
            handler, 
            params, 
            schedule, 
            recurring = false,
            maxRetries = 0,
            retryDelay = 60000 // Default: 1 minute delay between retries
        } = taskData;
        
        // Validate task type
        const validTypes = ['script', 'webhook', 'email'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid task type: ${type}. Valid types are: ${validTypes.join(', ')}`);
        }
        
        // Validate required fields based on type
        if (type === 'script' && !handler) {
            throw new Error('Handler path is required for script tasks');
        }
        
        if (type === 'webhook') {
            if (!params || !params.url) {
                throw new Error('URL is required for webhook tasks');
            }
            if (!/^https?:\/\//i.test(params.url)) {
                throw new Error('Invalid webhook URL. Must start with http:// or https://');
            }
        }
        
        if (type === 'email') {
            if (!params || !params.to) {
                throw new Error('Recipient (to) is required for email tasks');
            }
            
            if (!params.subject) {
                throw new Error('Subject is required for email tasks');
            }
            
            if (!params.text && !params.html) {
                throw new Error('Either text or html content is required for email tasks');
            }
        }
        
        try {
            // Check if a task with this name already exists
            const existingTask = this.getTaskByName(name);
            if (existingTask) {
                throw new Error(`Task with name "${name}" already exists`);
            }
            
            // Determine next run time
            let nextRun, period, scheduleType;
            
            if (schedule === 'now') {
                // Execute immediately
                nextRun = new Date().getTime();
                period = 0;
                scheduleType = 'once';
            } else {
                // Parse cron expression
                const scheduleInfo = parseCronExpression(schedule);
                nextRun = scheduleInfo.nextRun;
                period = scheduleInfo.period;
                scheduleType = scheduleInfo.type;
            }
            
            // Create task record
            const taskCollection = db._collection('scheduledTasks');
            const task = taskCollection.save({
                name,
                description,
                type,
                handler: type === 'script' ? handler : null,
                params: params || {},
                schedule,
                scheduleType,
                nextRun,
                period,
                recurring,
                maxRetries,
                retryDelay,
                retryCount: 0,
                lastRetry: null,
                status: 'active',
                createdAt: new Date().getTime(),
                updatedAt: new Date().getTime(),
                executions: []
            });
            
            return task;
        } catch (error) {
            console.error(`Error creating task "${name}":`, error.message);
            throw error;
        }
    },
    
    /**
     * Get a task by ID
     * 
     * @param {string} taskId - Task ID
     * @returns {Object} - Task or null
     */
    getTask(taskId) {
        try {
            const taskCollection = db._collection('scheduledTasks');
            return taskCollection.document(taskId);
        } catch (error) {
            return null;
        }
    },
    
    /**
     * Get a task by name
     * 
     * @param {string} name - Task name
     * @returns {Object} - Task or null
     */
    getTaskByName(name) {
        try {
            const [task] = query`
                FOR task IN scheduledTasks
                FILTER task.name == ${name}
                LIMIT 1
                RETURN task
            `.toArray();
            
            return task || null;
        } catch (error) {
            return null;
        }
    },
    
    /**
     * Update a task
     * 
     * @param {string} taskId - Task ID
     * @param {Object} updateData - Update data
     * @returns {Object} - Updated task
     */
    updateTask(taskId, updateData) {
        try {
            const taskCollection = db._collection('scheduledTasks');
            const task = this.getTask(taskId);
            
            if (!task) {
                throw new Error(`Task with ID "${taskId}" not found`);
            }
            
            // Handle schedule updates
            if (updateData.schedule && updateData.schedule !== task.schedule) {
                const scheduleInfo = parseCronExpression(updateData.schedule);
                updateData.nextRun = scheduleInfo.nextRun;
                updateData.period = scheduleInfo.period;
                updateData.scheduleType = scheduleInfo.type;
            }
            
            // Update task
            const updatedTask = taskCollection.update(taskId, {
                ...updateData,
                updatedAt: new Date().getTime()
            }, { returnNew: true }).new;
            
            return updatedTask;
        } catch (error) {
            console.error(`Error updating task "${taskId}":`, error.message);
            throw error;
        }
    },
    
    /**
     * Delete a task
     * 
     * @param {string} taskId - Task ID
     * @returns {boolean} - Success flag
     */
    deleteTask(taskId) {
        try {
            const taskCollection = db._collection('scheduledTasks');
            taskCollection.remove(taskId);
            return true;
        } catch (error) {
            console.error(`Error deleting task "${taskId}":`, error.message);
            return false;
        }
    },
    
    /**
     * Pause a task
     * 
     * @param {string} taskId - Task ID
     * @returns {Object} - Updated task
     */
    pauseTask(taskId) {
        return this.updateTaskStatus(taskId, 'paused');
    },
    
    /**
     * Resume a paused task
     * 
     * @param {string} taskId - Task ID
     * @returns {Object} - Updated task
     */
    resumeTask(taskId) {
        return this.updateTaskStatus(taskId, 'active');
    },
    
    /**
     * Execute a task manually
     * 
     * @param {string} taskId - Task ID
     * @returns {boolean} - Success flag
     */
    executeTaskManually(taskId) {
        try {
            const task = this.getTask(taskId);
            
            if (!task) {
                throw new Error(`Task with ID "${taskId}" not found`);
            }
            
            this.executeTask(task);
            return true;
        } catch (error) {
            console.error(`Error executing task "${taskId}" manually:`, error.message);
            return false;
        }
    },
    
    /**
     * Update task status
     * 
     * @param {string} taskId - Task ID
     * @param {string} status - New status
     * @returns {Object} - Updated task
     */
    updateTaskStatus(taskId, status) {
        try {
            const taskCollection = db._collection('scheduledTasks');
            
            const updatedTask = taskCollection.update(taskId, {
                status,
                updatedAt: new Date().getTime()
            }, { returnNew: true }).new;
            
            return updatedTask;
        } catch (error) {
            console.error(`Error updating task "${taskId}" status:`, error.message);
            throw error;
        }
    },
    
    /**
     * Update task next run time
     * 
     * @param {string} taskId - Task ID
     * @param {number} nextRun - Next run timestamp
     * @returns {Object} - Updated task
     */
    updateTaskNextRun(taskId, nextRun) {
        try {
            const taskCollection = db._collection('scheduledTasks');
            
            const updatedTask = taskCollection.update(taskId, {
                nextRun,
                updatedAt: new Date().getTime()
            }, { returnNew: true }).new;
            
            return updatedTask;
        } catch (error) {
            console.error(`Error updating task "${taskId}" next run:`, error.message);
            throw error;
        }
    },
    
    /**
     * Record task execution
     * 
     * @param {string} taskId - Task ID
     * @param {string} status - Execution status
     * @param {number} duration - Execution duration in milliseconds
     * @param {string} error - Error message if any
     * @returns {string} - Execution ID
     */
    recordExecution(taskId, status, duration = null, error = null) {
        try {
            const taskCollection = db._collection('scheduledTasks');
            const task = this.getTask(taskId);
            
            if (!task) {
                throw new Error(`Task with ID "${taskId}" not found`);
            }
            
            // Create execution record
            const executionId = crypto.uuidv4();
            const execution = {
                id: executionId,
                taskId,
                status,
                startTime: new Date().getTime(),
                duration,
                error,
                createdAt: new Date().getTime()
            };
            
            // Add to task executions array
            const executions = [...(task.executions || []), execution];
            
            // Keep only the last 10 executions
            if (executions.length > 10) {
                executions.shift();
            }
            
            // Update task with execution record
            taskCollection.update(taskId, {
                executions,
                lastExecution: {
                    status,
                    time: new Date().getTime(),
                    duration,
                    error
                },
                updatedAt: new Date().getTime()
            });
            
            return executionId;
        } catch (error) {
            console.error(`Error recording execution for task "${taskId}":`, error.message);
            return null;
        }
    },
    
    /**
     * Update execution record
     * 
     * @param {string} executionId - Execution ID
     * @param {string} status - New status
     * @param {number} duration - Execution duration
     * @param {string} error - Error message if any
     * @param {Object} result - Execution result
     * @returns {boolean} - Success flag
     */
    updateExecution(executionId, status, duration, error = null, result = null) {
        try {
            if (!executionId) {
                return false;
            }
            
            const [task] = query`
                FOR task IN scheduledTasks
                FILTER ${executionId} IN ATTRIBUTES(task.executions[*].id)
                RETURN task
            `.toArray();
            
            if (!task) {
                return false;
            }
            
            // Update execution
            const taskCollection = db._collection('scheduledTasks');
            const executions = task.executions.map(exec => {
                if (exec.id === executionId) {
                    return {
                        ...exec,
                        status,
                        duration,
                        error,
                        result: result ? this.sanitizeResult(result) : null,
                        updatedAt: new Date().getTime()
                    };
                }
                return exec;
            });
            
            // Update task
            taskCollection.update(task._key, {
                executions,
                lastExecution: {
                    status,
                    time: new Date().getTime(),
                    duration,
                    error,
                    result: result ? this.sanitizeResult(result) : null
                },
                updatedAt: new Date().getTime()
            });
            
            return true;
        } catch (error) {
            console.error(`Error updating execution "${executionId}":`, error.message);
            return false;
        }
    },
    
    /**
     * Sanitize task execution result for storage
     * 
     * @param {Object} result - Execution result
     * @returns {Object} - Sanitized result
     */
    sanitizeResult(result) {
        if (!result) return null;
        
        try {
            // Convert result to JSON and back to strip any circular references
            // or complex objects that can't be serialized
            const sanitized = JSON.parse(JSON.stringify(result));
            
            // Limit result size to prevent document size issues
            const resultJson = JSON.stringify(sanitized);
            if (resultJson.length > 10000) { // Arbitrary limit to prevent huge results
                return {
                    truncated: true,
                    type: result.type || 'unknown',
                    summary: `Result was truncated (${resultJson.length} bytes)`,
                    preview: resultJson.substring(0, 500) + '...'
                };
            }
            
            return sanitized;
        } catch (error) {
            // If the result can't be serialized, return a simplified version
            console.error('Error sanitizing task result:', error.message);
            return {
                type: result.type || 'unknown',
                error: 'Result could not be serialized for storage',
                success: result.success !== false
            };
        }
    },
    
    /**
     * Get task executions
     * 
     * @param {string} taskId - Task ID
     * @param {number} limit - Maximum number of executions to return
     * @returns {Array} - Task executions
     */
    getTaskExecutions(taskId, limit = 10) {
        try {
            const task = this.getTask(taskId);
            
            if (!task || !task.executions) {
                return [];
            }
            
            // Sort by start time descending and limit
            return task.executions
                .sort((a, b) => b.startTime - a.startTime)
                .slice(0, limit);
        } catch (error) {
            console.error(`Error getting executions for task "${taskId}":`, error.message);
            return [];
        }
    },
    
    /**
     * Get all tasks with pagination
     * 
     * @param {Object} options - Query options
     * @param {number} options.skip - Number of records to skip
     * @param {number} options.limit - Maximum number of records to return
     * @param {string} options.status - Filter by status
     * @param {string} options.sortField - Field to sort by
     * @param {string} options.sortDirection - Sort direction (asc or desc)
     * @returns {Object} - Tasks with pagination info
     */
    getAllTasks(options = {}) {
        const { 
            skip = 0, 
            limit = 20, 
            status = null,
            sortField = 'nextRun',
            sortDirection = 'asc'
        } = options;
        
        try {
            // Build status filter
            const statusFilter = status ? `FILTER task.status == '${status}'` : '';
            
            // Build sort
            const sort = `SORT task.${sortField} ${sortDirection.toUpperCase()}`;
            
            // Query tasks
            const tasks = query`
                LET tasks = (
                    FOR task IN scheduledTasks
                    ${statusFilter ? aql.literal(statusFilter) : ''}
                    ${aql.literal(sort)}
                    LIMIT ${skip}, ${limit}
                    RETURN task
                )
                
                LET total = (
                    FOR task IN scheduledTasks
                    ${statusFilter ? aql.literal(statusFilter) : ''}
                    COLLECT WITH COUNT INTO count
                    RETURN count
                )[0]
                
                RETURN {
                    tasks,
                    total,
                    skip: ${skip},
                    limit: ${limit}
                }
            `.toArray()[0];
            
            return tasks;
        } catch (error) {
            console.error('Error getting tasks:', error.message);
            return {
                tasks: [],
                total: 0,
                skip,
                limit
            };
        }
    }
};

module.exports = scheduler;
