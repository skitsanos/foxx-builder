/**
 * Get Task Executions Endpoint
 * 
 * Retrieves execution history for a scheduled task
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { time } = require('@arangodb');
const joi = require('joi');
const scheduler = require('../../../../../builder/scheduler');

module.exports = {
    contentType: 'application/json',
    name: 'Get Task Executions',
    
    // Define path parameters validation
    params: {
        path: {
            id: {
                schema: joi.string().required(),
                description: 'Task ID'
            }
        },
        query: {
            limit: {
                schema: joi.number().integer().min(1).max(50).default(10),
                description: 'Maximum number of executions to return'
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
     * Handle the request to get task executions
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const start = time();
        const { id } = req.pathParams;
        const { limit = 10 } = req.queryParams;
        
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
            
            // Get task executions
            const executions = scheduler.getTaskExecutions(id, parseInt(limit) || 10);
            
            // Prepare response
            const response = {
                taskId: id,
                taskName: task.name,
                executions,
                totalExecutions: executions.length,
                meta: {
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error fetching executions for task ${id}:`, error.message);
            res.throw(500, 'Error fetching task executions');
        }
    }
};
