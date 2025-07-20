/**
 * Example email task script
 * 
 * This script demonstrates how to set up an email task programmatically
 * 
 * @param {Object} params - Task parameters
 * @param {Object} context - Execution context
 * @author skitsanos
 */
const { db } = require('@arangodb');
const scheduler = require('../../builder/scheduler');

module.exports = function(params, context) {
    try {
        console.log('Creating example email task');
        
        // Create an email task
        const task = scheduler.createTask({
            name: 'test-email-notification',
            description: 'Test email notification task',
            type: 'email',
            params: {
                to: 'test@example.com',
                subject: 'Test Email from Foxx Builder Scheduler',
                text: 'This is a test email sent by the Foxx Builder scheduler.',
                html: '<h1>Test Email</h1><p>This is a test email sent by the <strong>Foxx Builder scheduler</strong>.</p>',
                // Optional params:
                // cc: ['cc@example.com'],
                // bcc: ['bcc@example.com'],
                // from: 'custom@example.com',
                // replyTo: 'replies@example.com',
                // provider: 'resend'  // Specify a provider or use default
            },
            schedule: '0 12 * * *', // Daily at noon
            recurring: true,
            maxRetries: 3,
            retryDelay: 300000 // 5 minutes
        });
        
        return {
            success: true,
            message: 'Email task created successfully',
            task: {
                _key: task._key,
                name: task.name,
                type: task.type,
                nextRun: new Date(task.nextRun).toISOString()
            }
        };
    } catch (error) {
        console.error('Error creating email task:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};
