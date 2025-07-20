/**
 * Rate Limiting Middleware Examples
 * 
 * Demonstrates various rate limiting configurations to prevent API abuse
 * and ensure fair usage across different user types and endpoints.
 */

const rateLimiter = require('../../src/builder/middleware/rate-limiter');

// Example: Basic rate limiting (global)
function createBasicRateLimit() {
    return rateLimiter({
        windowMs: 15 * 60 * 1000,        // 15 minutes
        maxRequests: 100,                // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,           // Return rate limit info in headers
        legacyHeaders: false            // Disable X-RateLimit-* headers
    });
}

// Example: Strict rate limiting for authentication endpoints
function createAuthRateLimit() {
    return rateLimiter({
        windowMs: 15 * 60 * 1000,        // 15 minutes
        maxRequests: 5,                  // Very strict: only 5 login attempts
        message: {
            error: 'Too many authentication attempts',
            code: 'RATE_LIMIT_AUTH',
            retryAfter: 900                // 15 minutes in seconds
        },
        skipSuccessfulRequests: true,    // Don't count successful requests
        skipFailedRequests: false        // Count failed requests
    });
}

// Example: Generous rate limiting for public API
function createPublicApiRateLimit() {
    return rateLimiter({
        windowMs: 60 * 60 * 1000,        // 1 hour
        maxRequests: 1000,               // 1000 requests per hour
        message: 'API rate limit exceeded. Please upgrade to premium for higher limits.',
        keyGenerator: (req) => {
            // Use API key if available, otherwise IP
            return req.headers['x-api-key'] || req.remoteAddress;
        }
    });
}

// Example: User-tier based rate limiting
function createTieredRateLimit() {
    return rateLimiter({
        windowMs: 60 * 60 * 1000,        // 1 hour
        maxRequests: (req) => {
            // Dynamic limit based on user tier
            if (req.user && req.user.tier === 'premium') {
                return 10000;             // Premium users: 10,000/hour
            } else if (req.user && req.user.tier === 'standard') {
                return 5000;              // Standard users: 5,000/hour
            }
            return 1000;                  // Free/anonymous: 1,000/hour
        },
        keyGenerator: (req) => {
            // Use user ID if authenticated, otherwise IP
            return req.user ? req.user.id : req.remoteAddress;
        },
        message: (req) => {
            const tier = req.user ? req.user.tier : 'free';
            return {
                error: `Rate limit exceeded for ${tier} tier`,
                upgrade: tier === 'free' ? 'Consider upgrading to premium' : null
            };
        }
    });
}

// Example: Endpoint-specific rate limiting
function createEndpointSpecificRateLimit() {
    return {
        // Heavy operations - very strict
        heavyOperations: rateLimiter({
            windowMs: 60 * 60 * 1000,    // 1 hour
            maxRequests: 10,              // Only 10 heavy operations per hour
            message: 'Heavy operation limit exceeded. Please wait before retrying.'
        }),
        
        // Search endpoints - moderate
        search: rateLimiter({
            windowMs: 60 * 1000,         // 1 minute
            maxRequests: 30,              // 30 searches per minute
            message: 'Search rate limit exceeded. Please wait a moment.'
        }),
        
        // File uploads - limited
        uploads: rateLimiter({
            windowMs: 15 * 60 * 1000,    // 15 minutes
            maxRequests: 20,              // 20 uploads per 15 minutes
            message: 'Upload limit exceeded. Please wait before uploading more files.'
        })
    };
}

// Example: Role-based exemptions
function createRoleBasedRateLimit() {
    return rateLimiter({
        windowMs: 60 * 60 * 1000,        // 1 hour
        maxRequests: 1000,               // Base limit
        skip: (req) => {
            // Skip rate limiting for admins and system accounts
            if (req.user) {
                return req.user.roles.includes('admin') || 
                       req.user.roles.includes('system');
            }
            return false;
        },
        keyGenerator: (req) => {
            return req.user ? req.user.id : req.remoteAddress;
        }
    });
}

// Example: Path-based exemptions
function createPathBasedRateLimit() {
    return rateLimiter({
        windowMs: 15 * 60 * 1000,        // 15 minutes
        maxRequests: 100,
        skip: (req) => {
            // Skip rate limiting for certain paths
            const exemptPaths = [
                '/health',
                '/status',
                '/metrics',
                '/ping'
            ];
            return exemptPaths.includes(req.path);
        }
    });
}

// Example: Time-based rate limiting (different limits by time of day)
function createTimeBasedRateLimit() {
    return rateLimiter({
        windowMs: 60 * 60 * 1000,        // 1 hour
        maxRequests: (req) => {
            const hour = new Date().getHours();
            
            // Business hours (9 AM - 5 PM): higher limits
            if (hour >= 9 && hour <= 17) {
                return 2000;
            }
            
            // Off hours: lower limits
            return 500;
        },
        message: (req) => {
            const hour = new Date().getHours();
            const isBusinessHours = hour >= 9 && hour <= 17;
            
            return {
                error: 'Rate limit exceeded',
                period: isBusinessHours ? 'business hours' : 'off hours',
                suggestion: isBusinessHours ? 
                    'Try again later or contact support' : 
                    'Higher limits available during business hours (9 AM - 5 PM)'
            };
        }
    });
}

// Example: Custom store for distributed rate limiting
function createDistributedRateLimit() {
    return rateLimiter({
        windowMs: 15 * 60 * 1000,        // 15 minutes
        maxRequests: 100,
        store: {
            // Custom store implementation for Redis or database
            increment: async (key) => {
                // Increment counter in Redis/database
                const { db } = require('@arangodb');
                const collection = db._collection('rateLimitCounters');
                
                const now = Date.now();
                const windowStart = now - (15 * 60 * 1000);
                
                // Clean old entries
                await collection.removeByExample({
                    timestamp: { $lt: windowStart }
                });
                
                // Get current count
                const count = await collection.count({
                    key: key,
                    timestamp: { $gte: windowStart }
                });
                
                // Add new entry
                await collection.save({
                    key: key,
                    timestamp: now
                });
                
                return count + 1;
            },
            
            decrement: async (key) => {
                // Implementation for decrementing (if needed)
            },
            
            resetKey: async (key) => {
                // Implementation for resetting a specific key
                const { db } = require('@arangodb');
                const collection = db._collection('rateLimitCounters');
                await collection.removeByExample({ key: key });
            }
        }
    });
}

// Example: Rate limiting with custom headers
function createCustomHeaderRateLimit() {
    return rateLimiter({
        windowMs: 60 * 60 * 1000,        // 1 hour
        maxRequests: 1000,
        standardHeaders: true,
        customHeaders: {
            'X-Custom-Limit': (req, rateLimitInfo) => rateLimitInfo.limit,
            'X-Custom-Remaining': (req, rateLimitInfo) => rateLimitInfo.remaining,
            'X-Custom-Reset': (req, rateLimitInfo) => rateLimitInfo.resetTime,
            'X-User-Tier': (req) => req.user ? req.user.tier : 'anonymous'
        }
    });
}

// Usage examples in route definitions

// Apply rate limiting to specific routes
module.exports = {
    // Route handler with basic rate limiting
    basicLimitedRoute: {
        name: 'Basic Limited Route',
        middleware: [createBasicRateLimit()],
        handler: (req, res) => {
            res.json({ message: 'Success - within rate limits' });
        }
    },
    
    // Authentication route with strict limiting
    loginRoute: {
        name: 'Login',
        middleware: [createAuthRateLimit()],
        handler: (req, res) => {
            // Login logic here
            res.json({ token: 'example-jwt-token' });
        }
    },
    
    // Different limits for different operations
    searchRoute: {
        name: 'Search',
        middleware: [createEndpointSpecificRateLimit().search],
        handler: (req, res) => {
            // Search logic here
            res.json({ results: [] });
        }
    },
    
    // Heavy operation with strict limits
    processRoute: {
        name: 'Heavy Processing',
        middleware: [createEndpointSpecificRateLimit().heavyOperations],
        handler: (req, res) => {
            // Heavy processing logic here
            res.json({ status: 'processing started' });
        }
    }
};