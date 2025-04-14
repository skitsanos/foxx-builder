/**
 * User Logout Endpoint
 * 
 * Handles user logout actions and records logout activity
 * Note: With JWT tokens, actual "logout" is client-side,
 * but we record the action server-side for auditing
 * 
 * @version 1.0.0
 */
const joi = require('joi');
const { db } = require('@arangodb');

module.exports = {
    contentType: 'application/json',
    name: 'Logout',
    
    // Define request body validation
    body: {
        model: joi.object({
            userId: joi.string().optional()
        }).optional()
    },
    
    /**
     * Handle logout request
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        try {
            // Get userId from token or request body
            const userId = req.user?._key || (req.body?.userId) || null;
            
            // Record logout activity if we have a userId
            if (userId) {
                try {
                    const userActivities = db._collection('userActivities');
                    userActivities.insert({
                        userId,
                        type: 'logout',
                        timestamp: new Date().getTime(),
                        ipAddress: req.remoteAddress,
                        userAgent: req.headers['user-agent'] || 'unknown'
                    });
                    
                    console.log(`User ${userId} logged out successfully`);
                } catch (error) {
                    console.warn(`Failed to record logout activity: ${error.message}`);
                    // Non-critical error, continue with logout process
                }
            }
            
            // Respond with success message
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Error during logout:', error.message);
            res.status(500).json({
                error: true,
                message: 'Error processing logout request'
            });
        }
    }
};
