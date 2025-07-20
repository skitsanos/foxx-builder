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
            params: joi.object().when('type', {
                is: 'webhook',
                then: joi.object({
                    url: joi.string().uri().required(),
                    method: joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD').default('GET'),
                    headers: joi.object().optional(),
                    body: joi.alternatives().try(joi.string(), joi.object()).optional(),
                    timeout: joi.number().integer().min(1000).max(300000).default(30000),
                    followRedirect: joi.boolean().default(true)
                }).required(),
                otherwise: joi.when('type', {
                    is: 'email',
                    then: joi.object({
                        to: joi.alternatives().try(
                            joi.string().email(),
                            joi.array().items(joi.string().email())
                        ).required(),
                        from: joi.string().email().optional(),
                        subject: joi.string().required(),
                        text: joi.string(),
                        html: joi.string(),
                        cc: joi.alternatives().try(
                            joi.string().email(),
                            joi.array().items(joi.string().email())
                        ).optional(),
                        bcc: joi.alternatives().try(
                            joi.string().email(),
                            joi.array().items(joi.string().email())
                        ).optional(),
                        replyTo: joi.string().email().optional(),
                        provider: joi.string().optional(),
                        attachments: joi.array().items(joi.object()).optional()
                    }).required().custom((value, helpers) => {
                        if (!value.text && !value.html) {
                            return helpers.error('object.missing', {
                                peers: ['text', 'html'],
                                peersWithLabels: ['text', 'html']
                            });
                        }
                        return value;
                    }),
                    otherwise: joi.object().optional()
                })
            }),
            schedule: joi.alternatives().try(
                joi.string().valid('now'),
                joi.string().pattern(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/, 'daily schedule'),
                joi.string().pattern(/^(\d+)\s+\*\s+\*\s+\*\s+\*$/, 'hourly schedule'),
                joi.string().pattern(/^(\d+)\s+(\d+)\s+\*\s+\*\s+(\d+)$/, 'weekly schedule'),
                joi.string().pattern(/^(\d+)\s+(\d+)\s+(\d+)\s+\*\s+\*$/, 'monthly schedule')
            ).required().messages({
                'alternatives.match': 'Invalid schedule format. Use cron syntax or "now".'
            }),
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
