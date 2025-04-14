/**
 * Run Task Endpoint
 * 
 * Executes a specific scheduled task immediately
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { time } = require('@arangodb');
const joi = require('joi');
const scheduler = require('../../../../../../builder/scheduler');

module.exports = {
    contentType: 'application/json',
    name: 'Run Scheduled Task',
    
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
        {'500': 'Error executing task'}
    ],
    
    /**
     * Handle the request to run a scheduled task
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
            
            // Execute task
            const success = scheduler.executeTaskManually(id);
            
            if (!success) {
                return res.throw(500, 'Failed to execute task');
            }
            
            // Prepare response
            const response = {
                success: true,
                taskId: id,
                taskName: task.name,
                meta: {
                    message: `Task "${task.name}" execution started`,
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error executing scheduled task ${id}:`, error.message);
            res.throw(500, 'Error executing scheduled task');
        }
    }
};
