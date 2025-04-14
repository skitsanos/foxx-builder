/**
 * Get Scheduled Task Endpoint
 * 
 * Retrieves a specific scheduled task by ID
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { time } = require('@arangodb');
const joi = require('joi');
const scheduler = require('../../../../builder/scheduler');

module.exports = {
    contentType: 'application/json',
    name: 'Get Scheduled Task',
    
    // Define path parameters validation
    params: {
        path: {
            id: {
                schema: joi.string().required(),
                description: 'Task ID'
            }
        }
    },
    
    // Define possible errors
    error: [
        {'403': 'Access denied'},
        {'404': 'Task not found'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to get a scheduled task
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
            // Get task
            const task = scheduler.getTask(id);
            
            if (!task) {
                return res.throw(404, 'Task not found');
            }
            
            // Get recent executions
            const executions = scheduler.getTaskExecutions(id, 5);
            
            // Prepare response
            const response = {
                task,
                executions,
                meta: {
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error fetching scheduled task ${id}:`, error.message);
            res.throw(500, 'Error fetching scheduled task');
        }
    }
};
