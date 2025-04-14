/**
 * Example of a route with complex query parameters
 * 
 * This file demonstrates how to create a route that accepts
 * and processes various query parameters.
 */

const joi = require('joi');

module.exports = {
    contentType: 'application/json',
    name: 'Complex Query Example',
    
    params: {
        query: {
            skip: {
                schema: joi.number().integer().min(0).default(0),
                description: 'Number of items to skip'
            },
            limit: {
                schema: joi.number().integer().min(1).max(100).default(10),
                description: 'Maximum number of items to return'
            },
            sort: {
                schema: joi.string().valid('asc', 'desc').default('asc'),
                description: 'Sort direction'
            },
            filter: {
                schema: joi.string(),
                description: 'Filter query string'
            },
            fields: {
                schema: joi.string(),
                description: 'Comma-separated list of fields to return'
            }
        }
    },
    
    handler: (req, res) => {
        const { skip, limit, sort, filter, fields } = req.queryParams;
        const { utils, db } = module.context;
        
        // Parse fields if provided
        const fieldsList = fields ? fields.split(',').map(f => f.trim()) : null;
        
        // Use our enhanced database operations
        const result = db.find('items', 
            filter ? { category: filter } : {}, 
            {
                skip,
                limit,
                sort: { createdOn: sort === 'desc' ? -1 : 1 },
                fields: fieldsList
            }
        );
        
        // Return the result with metadata
        res.json({
            data: result,
            meta: {
                skip,
                limit,
                sort,
                filter,
                fields: fieldsList,
                total: db.count('items', filter ? { category: filter } : {}),
                timestamp: new Date().toISOString()
            }
        });
    }
};
