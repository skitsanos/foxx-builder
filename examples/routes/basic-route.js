/**
 * Example of a basic route handler
 * 
 * This file demonstrates how to create a simple route handler
 * that returns static data.
 */

module.exports = {
    contentType: 'application/json',
    name: 'Basic Route Example',
    
    handler: (req, res) => {
        res.json({
            message: 'This is a basic route example',
            timestamp: new Date().toISOString(),
            requestPath: req.path,
            requestMethod: req.method
        });
    }
};
