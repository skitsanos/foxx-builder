/**
 * Delete Scheduled Task Endpoint
 * 
 * Deletes a specific scheduled task
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { time } = require('@arangodb');
const joi = require('joi');
const scheduler = require('../../../../builder/scheduler');

module.exports = {
    contentType: 'application/json',
    name: 'Delete Scheduled Task',
    
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
     * Handle the request to delete a scheduled task
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
            
            // Save task name for response message
            const taskName = task.name;
            
            // Delete task
            const success = scheduler.deleteTask(id);
            
            if (!success) {
                return res.throw(500, 'Failed to delete task');
            }
            
            // Prepare response
            const response = {
                success: true,
                meta: {
                    message: `Task "${taskName}" deleted successfully`,
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error(`Error deleting scheduled task ${id}:`, error.message);
            res.throw(500, 'Error deleting scheduled task');
        }
    }
};
