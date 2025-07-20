/**
 * Create Scheduled Task Endpoint
 * 
 * Creates a new scheduled task
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { time } = require('@arangodb');
const joi = require('joi');
const scheduler = require('../../../builder/scheduler');

module.exports = {
    contentType: 'application/json',
    name: 'Create Scheduled Task',
    
    // Define request body validation
    body: {
        model: joi.object({
            name: joi.string().required().min(3).max(50),
            description: joi.string().required().max(200),
            type: joi.string().valid('script', 'webhook', 'email').default('script'),
            handler: joi.string().when('type', {
                is: 'script',
                then: joi.string().required(),
                otherwise: joi.string().optional()
            }),
            params: joi.object().optional(),
            schedule: joi.alternatives().try(
                joi.string().valid('now'),
                joi.string().regex(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/),
                joi.string().regex(/^(\d+)\s+\*\s+\*\s+\*\s+\*$/),
                joi.string().regex(/^(\d+)\s+(\d+)\s+\*\s+\*\s+(\d+)$/),
                joi.string().regex(/^(\d+)\s+(\d+)\s+(\d+)\s+\*\s+\*$/)
            ).required(),
            recurring: joi.boolean().default(false),
            maxRetries: joi.number().integer().min(0).max(10).default(0)
                .description('Maximum number of retry attempts (0 means no retries)'),
            retryDelay: joi.number().integer().min(1000).max(3600000).default(60000)
                .description('Delay between retries in milliseconds (default: 1 minute)')
        }).required()
    },
    
    // Define possible errors
    error: [
        {'403': 'Access denied'},
        {'400': 'Invalid task data'},
        {'409': 'Task already exists'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to create a scheduled task
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const start = time();
        
        // Check if user has admin role
        if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
            return res.throw(403, 'Access denied: admin role required');
        }
        
        try {
            // Create task
            const task = scheduler.createTask(req.body);
            
            // Prepare response
            const response = {
                task,
                meta: {
                    message: 'Task created successfully',
                    execTime: time() - start
                }
            };
            
            res.status(201).send(response);
        } catch (error) {
            console.error('Error creating scheduled task:', error.message);
            
            if (error.message.includes('already exists')) {
                res.throw(409, error.message);
            } else if (error.message.includes('Invalid')) {
                res.throw(400, error.message);
            } else {
                res.throw(500, 'Error creating scheduled task');
            }
        }
    }
};
