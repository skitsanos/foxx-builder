/**
 * List Scheduled Tasks Endpoint
 * 
 * Retrieves a paginated list of scheduled tasks
 * Restricted to admin users only
 * 
 * @version 1.0.0
 */
const { time } = require('@arangodb');
const joi = require('joi');
const scheduler = require('../../../builder/scheduler');

module.exports = {
    contentType: 'application/json',
    name: 'List Scheduled Tasks',
    
    // Define query parameters for pagination and filtering
    params: {
        query: {
            skip: {
                schema: joi.number().integer().min(0).default(0),
                description: 'Number of records to skip'
            },
            limit: {
                schema: joi.number().integer().min(1).max(100).default(20),
                description: 'Maximum number of records to return'
            },
            status: {
                schema: joi.string().valid('active', 'paused', 'running', 'completed', 'failed').optional(),
                description: 'Filter by task status'
            },
            sortBy: {
                schema: joi.string().valid('name', 'nextRun', 'createdAt', 'updatedAt').default('nextRun'),
                description: 'Field to sort by'
            },
            sortOrder: {
                schema: joi.string().valid('asc', 'desc').default('asc'),
                description: 'Sort order (asc or desc)'
            }
        }
    },
    
    // Define possible errors
    error: [
        {'403': 'Access denied'},
        {'500': 'Server error'}
    ],
    
    /**
     * Handle the request to list scheduled tasks
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
            // Get query parameters
            const { skip, limit, status, sortBy, sortOrder } = req.queryParams;
            
            // Get tasks
            const result = scheduler.getAllTasks({
                skip: parseInt(skip) || 0,
                limit: parseInt(limit) || 20,
                status,
                sortField: sortBy || 'nextRun',
                sortDirection: sortOrder || 'asc'
            });
            
            // Prepare response
            const response = {
                ...result,
                meta: {
                    execTime: time() - start
                }
            };
            
            res.send(response);
        } catch (error) {
            console.error('Error fetching scheduled tasks:', error.message);
            res.throw(500, 'Error fetching scheduled tasks');
        }
    }
};
