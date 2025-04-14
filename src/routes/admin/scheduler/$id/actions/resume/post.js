/**
 * Resume Task Endpoint
 * 
 * Resumes a paused scheduled task
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { time } = require('@arangodb');
const joi = require('joi');
const scheduler = require('../../../../../../builder/scheduler');

module.exports = {
    contentType: 'application/json',
    name: 'Resume Scheduled Task',
    
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
        {'409': 'Task is not paused'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to resume a scheduled task
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
            
            // Check if task is paused
            if (task.status !== 'paused') {
                return res.throw(409, 'Task is not paused');
            }
            
            // Resume task
            const updatedTask = scheduler.resumeTask(id);
            
            // Prepare response
            const response = {
                success: true,
                task: updatedTask,
                meta: {
                    message: `Task "${task.name}" resumed successfully`,
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error resuming scheduled task ${id}:`, error.message);
            res.throw(500, 'Error resuming scheduled task');
        }
    }
};
