/**
 * Example webhook task script
 * 
 * This script demonstrates how to set up a webhook task programmatically
 * 
 * @param {Object} params - Task parameters
 * @param {Object} context - Execution context
 */
const { db } = require('@arangodb');
const scheduler = require('../../builder/scheduler');

module.exports = function(params, context) {
    try {
        console.log('Creating example webhook task');
        
        // Create a webhook task that pings an API endpoint
        const task = scheduler.createTask({
            name: 'test-webhook-ping',
            description: 'Test webhook task that pings an API endpoint',
            type: 'webhook',
            params: {
                url: 'https://httpbin.org/get',
                method: 'GET',
                headers: {
                    'X-Source': 'Foxx-Builder-Scheduler'
                },
                timeout: 10000
            },
            schedule: '0 * * * *', // Every hour at minute 0
            recurring: true,
            maxRetries: 3,
            retryDelay: 60000 // 1 minute
        });
        
        return {
            success: true,
            message: 'Webhook task created successfully',
            task: {
                _key: task._key,
                name: task.name,
                type: task.type,
                nextRun: new Date(task.nextRun).toISOString()
            }
        };
    } catch (error) {
        console.error('Error creating webhook task:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};
