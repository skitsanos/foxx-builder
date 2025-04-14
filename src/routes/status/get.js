/**
 * Status Endpoint
 * 
 * Provides a lightweight status check to verify the service is running
 * Useful for kubernetes liveness probes and simple monitoring
 * 
 * @version 1.0.0
 */
const { db, time } = require('@arangodb');

module.exports = {
    contentType: 'application/json',
    name: 'Status Check',
    
    /**
     * Execute the status check
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const start = time();
        
        try {
            // Get service information
            const { manifest } = module.context;
            
            // Simple database check
            let dbStatus = 'ok';
            try {
                db._query('RETURN 1').toArray();
            } catch (error) {
                dbStatus = 'error';
            }
            
            // Prepare response
            const response = {
                status: dbStatus === 'ok' ? 'ok' : 'error',
                service: manifest.name,
                version: manifest.version,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                execTime: time() - start
            };
            
            // Set appropriate status code
            if (response.status !== 'ok') {
                res.status(503);
            }
            
            res.send(response);
        } catch (error) {
            console.error('Status check failed:', error.message);
            
            res.status(500).json({
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
};
