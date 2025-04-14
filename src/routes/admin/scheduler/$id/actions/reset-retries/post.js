/**
 * Reset Task Retry Count Endpoint
 * 
 * Resets the retry count for a specific task
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { time } = require('@arangodb');
const joi = require('joi');
const scheduler = require('../../../../../../builder/scheduler');

module.exports = {
    contentType: 'application/json',
    name: 'Reset Task Retry Count',
    
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
     * Handle the request to reset task retry count
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
            
            // Reset retry count
            scheduler.resetRetryCount(id);
            
            // Get updated task
            const updatedTask = scheduler.getTask(id);
            
            // Prepare response
            const response = {
                success: true,
                task: updatedTask,
                meta: {
                    message: `Retry count for task "${task.name}" has been reset`,
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error resetting retry count for task ${id}:`, error.message);
            res.throw(500, 'Error resetting retry count');
        }
    }
};
