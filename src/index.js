/**
 * Main entry point for Foxx service
 * 
 * Initializes the service and sets up middleware based on configuration
 * 
 * @author skitsanos
 */
const builder = require('./builder/index');
const rateLimiter = require('./builder/middleware/rate-limiter');

// Initialize the Foxx Builder
builder.init();

// Note: Scheduler is initialized in setup.js to avoid duplicate registrations

// Get configuration
const { 
    useAuth = false,
    authExemptPaths = ['/', '/login', '/signup']
} = module.context.configuration;

// Check if authentication is enabled
if (useAuth) {
    console.log('Authentication middleware is enabled');
    
    // Add authentication middleware
    module.context.use((req, res, next) => {
        try {
            const { auth } = module.context;
            
            // Create the authentication middleware
            const authMiddleware = auth.createMiddleware({
                // Use exempt paths from configuration
                exempt: authExemptPaths,
                
                // Success handler
                onSuccess: (req, res) => {
                    // Attach user information to the request if available
                    if (req.userId) {
                        try {
                            const user = module.context.get('users', req.userId).toArray()[0];
                            if (user) {
                                req.user = user;
                            }
                        } catch (error) {
                            console.error(`Failed to load user ${req.userId}:`, error.message);
                        }
                    }
                },
                
                // Error handler
                onError: (res, message, statusCode) => {
                    res.status(statusCode);
                    res.json({
                        error: true,
                        message,
                        code: statusCode
                    });
                }
            });
            
            // Apply the middleware
            authMiddleware(req, res, next);
        } catch (error) {
            console.error('Authentication middleware error:', error.message);
            res.throw(500, 'Authentication system error');
        }
    });
    
    console.log('Authentication middleware registered');
} else {
    console.log('Authentication middleware is disabled');
}

// Configure rate limiting middleware if enabled
const {
    useRateLimiting = false,
    requestsPerMinute = 60,
    rateLimitExemptPaths = ['/status', '/health'],
    rateLimitExemptRoles = ['admin']
} = module.context.configuration;

if (useRateLimiting) {
    console.log('Rate limiting middleware is enabled');
    
    // Initialize rate limiter with configuration
    const rateLimitMiddleware = rateLimiter.init({
        enabled: true,
        requestsPerMinute,
        exemptPaths: rateLimitExemptPaths,
        exemptRoles: rateLimitExemptRoles
    });
    
    // Apply the rate limiting middleware
    module.context.use(rateLimitMiddleware);
    
    console.log(`Rate limiting middleware registered (${requestsPerMinute} requests per minute)`);
} else {
    console.log('Rate limiting middleware is disabled');
}

// Additional middleware can be added here
