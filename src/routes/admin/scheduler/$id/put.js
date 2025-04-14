/**
 * Update Scheduled Task Endpoint
 * 
 * Updates a specific scheduled task
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { time } = require('@arangodb');
const joi = require('joi');
const scheduler = require('../../../../builder/scheduler');

module.exports = {
    contentType: 'application/json',
    name: 'Update Scheduled Task',
    
    // Define path parameters validation
    params: {
        path: {
            id: {
                schema: joi.string().required(),
                description: 'Task ID'
            }
        }
    },
    
    // Define request body validation
    body: {
        model: joi.object({
            name: joi.string().min(3).max(50).optional(),
            description: joi.string().max(200).optional(),
            handler: joi.string().optional(),
            params: joi.object().optional(),
            schedule: joi.alternatives().try(
                joi.string().valid('now'),
                joi.string().pattern(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/, 'daily schedule'),
                joi.string().pattern(/^(\d+)\s+\*\s+\*\s+\*\s+\*$/, 'hourly schedule'),
                joi.string().pattern(/^(\d+)\s+(\d+)\s+\*\s+\*\s+(\d+)$/, 'weekly schedule'),
                joi.string().pattern(/^(\d+)\s+(\d+)\s+(\d+)\s+\*\s+\*$/, 'monthly schedule')
            ).optional().messages({
                'alternatives.match': 'Invalid schedule format. Use cron syntax or "now".'
            }),
            recurring: joi.boolean().optional(),
            maxRetries: joi.number().integer().min(0).max(10).optional()
                .description('Maximum number of retry attempts (0 means no retries)'),
            retryDelay: joi.number().integer().min(1000).max(3600000).optional()
                .description('Delay between retries in milliseconds')
        }).required()
    },
    
    // Define possible errors
    error: [
        {'403': 'Access denied'},
        {'404': 'Task not found'},
        {'400': 'Invalid task data'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to update a scheduled task
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const start = time();
        const { id } = req.pathParams;
        
        // Check if user has admin role
        if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
            return res.throw(403, 'Access denied: admin role required');
        }
        
        try {
            // Check if task exists
            const task = scheduler.getTask(id);
            
            if (!task) {
                return res.throw(404, 'Task not found');
            }
            
            // Update task
            const updatedTask = scheduler.updateTask(id, req.body);
            
            // Prepare response
            const response = {
                task: updatedTask,
                meta: {
                    message: 'Task updated successfully',
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error updating scheduled task ${id}:`, error.message);
            
            if (error.message.includes('Invalid')) {
                res.throw(400, error.message);
            } else {
                res.throw(500, 'Error updating scheduled task');
            }
        }
    }
};
