/**
 * Pause Task Endpoint
 * 
 * Pauses a specific scheduled task
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { time } = require('@arangodb');
const joi = require('joi');
const scheduler = require('../../../../../../builder/scheduler');

module.exports = {
    contentType: 'application/json',
    name: 'Pause Scheduled Task',
    
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
        {'409': 'Task is already paused'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to pause a scheduled task
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
            
            // Check if task is already paused
            if (task.status === 'paused') {
                return res.throw(409, 'Task is already paused');
            }
            
            // Pause task
            const updatedTask = scheduler.pauseTask(id);
            
            // Prepare response
            const response = {
                success: true,
                task: updatedTask,
                meta: {
                    message: `Task "${task.name}" paused successfully`,
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error pausing scheduled task ${id}:`, error.message);
            res.throw(500, 'Error pausing scheduled task');
        }
    }
};
