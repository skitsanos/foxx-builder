/**
 * Health Check Endpoint
 * 
 * Provides system health information and status of various components
 * Useful for monitoring and integration with orchestration systems
 * 
 * @version 1.0.0
 */
const { db, aql, time } = require('@arangodb');
const internal = require('@arangodb/internal');
const joi = require('joi');
const crypto = require('@arangodb/crypto');
const fs = require('fs');
const path = require('path');

module.exports = {
    contentType: 'application/json',
    name: 'Health Check',
    
    // Define query parameters
    params: {
        query: {
            format: {
                schema: joi.string().valid('simple', 'detailed').default('simple'),
                description: 'Response format - simple returns just status, detailed includes component information'
            },
            check: {
                schema: joi.string().valid('all', 'db', 'memory', 'tasks', 'auth').default('all'),
                description: 'Specific system component to check'
            },
            timeout: {
                schema: joi.number().integer().min(100).max(10000).default(3000),
                description: 'Timeout in milliseconds for each check operation'
            }
        }
    },
    
    // Define possible errors
    error: [
        {'500': 'Health check failed'},
        {'503': 'Service unavailable'}
    ],
    
    /**
     * Execute the health check
     * 
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handler: (req, res) => {
        const start = time();
        const { format = 'simple', check = 'all', timeout = 3000 } = req.queryParams;
        
        try {
            // Get service information
            const { manifest } = module.context;
            const packageFile = path.join(module.context.basePath, 'package.json');
            const packageInfo = fs.exists(packageFile) 
                ? JSON.parse(fs.read(packageFile)) 
                : { name: 'unknown', version: 'unknown' };
            
            // Initialize health status
            let status = 'ok';
            const checks = {};
            
            // Execute requested checks
            if (check === 'all' || check === 'db') {
                checks.database = this.checkDatabase();
                if (checks.database.status !== 'ok') status = 'degraded';
            }
            
            if (check === 'all' || check === 'memory') {
                checks.memory = this.checkMemory();
                if (checks.memory.status !== 'ok' && status === 'ok') status = 'degraded';
            }
            
            if (check === 'all' || check === 'tasks') {
                checks.tasks = this.checkTasks();
                if (checks.tasks.status !== 'ok' && status === 'ok') status = 'degraded';
            }
            
            if (check === 'all' || check === 'auth') {
                checks.auth = this.checkAuth();
                if (checks.auth.status !== 'ok' && status === 'ok') status = 'degraded';
            }
            
            // Add server information
            const serverInfo = internal.db._version(true);
            
            // Prepare response based on format
            let response;
            
            if (format === 'simple') {
                response = {
                    status,
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString(),
                    service: {
                        name: manifest.name,
                        version: manifest.version
                    }
                };
            } else {
                response = {
                    status,
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString(),
                    service: {
                        name: manifest.name,
                        version: manifest.version,
                        description: manifest.description || packageInfo.description,
                        author: manifest.author || packageInfo.author
                    },
                    server: {
                        version: serverInfo.version,
                        license: serverInfo.license,
                        details: serverInfo.details
                    },
                    checks,
                    meta: {
                        execTime: time() - start
                    }
                };
            }
            
            // If overall status is not ok, set appropriate status code
            if (status !== 'ok') {
                res.status(503);
            }
            
            res.send(response);
        } catch (error) {
            console.error('Health check failed:', error.message);
            
            res.status(500).json({
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    },
    
    /**
     * Check database connectivity and status
     * 
     * @returns {Object} Database health status
     */
    checkDatabase() {
        try {
            const start = time();
            
            // Check if required collections exist
            const requiredCollections = ['users', 'roles', 'audit'];
            const missingCollections = [];
            
            for (const collection of requiredCollections) {
                if (!db._collection(collection)) {
                    missingCollections.push(collection);
                }
            }
            
            // Perform a simple query to check database responsiveness
            const queryStart = time();
            const result = db._query(aql`RETURN 1`).toArray();
            const queryTime = time() - queryStart;
            
            // Check if query executed successfully
            const querySuccess = result && result.length === 1 && result[0] === 1;
            
            // Get database statistics
            const stats = {
                collections: db._collections().length,
                queryResponseTime: queryTime
            };
            
            // Determine status
            let status = 'ok';
            let message = 'Database is healthy';
            
            if (missingCollections.length > 0) {
                status = 'degraded';
                message = `Missing collections: ${missingCollections.join(', ')}`;
            } else if (!querySuccess) {
                status = 'error';
                message = 'Database query failed';
            } else if (queryTime > 1.0) {
                status = 'degraded';
                message = 'Database response time is high';
            }
            
            return {
                status,
                message,
                stats,
                execTime: time() - start
            };
        } catch (error) {
            return {
                status: 'error',
                message: `Database check failed: ${error.message}`,
                execTime: 0
            };
        }
    },
    
    /**
     * Check memory usage and resources
     * 
     * @returns {Object} Memory health status
     */
    checkMemory() {
        try {
            const start = time();
            
            // Get memory statistics
            const stats = internal.processStat();
            
            // Calculate memory usage percentage
            const memoryUsagePercent = stats.rss / stats.vsize * 100;
            
            // Determine status
            let status = 'ok';
            let message = 'Memory usage is healthy';
            
            if (memoryUsagePercent > 90) {
                status = 'error';
                message = 'Critical memory usage';
            } else if (memoryUsagePercent > 75) {
                status = 'degraded';
                message = 'High memory usage';
            }
            
            return {
                status,
                message,
                stats: {
                    memoryUsage: {
                        rss: Math.round(stats.rss / 1024 / 1024) + ' MB',
                        heapTotal: Math.round(stats.heapTotal / 1024 / 1024) + ' MB',
                        heapUsed: Math.round(stats.heapUsed / 1024 / 1024) + ' MB',
                        external: Math.round(stats.external / 1024 / 1024) + ' MB',
                        usagePercent: Math.round(memoryUsagePercent * 100) / 100 + '%'
                    },
                    cpuTime: {
                        user: stats.utime,
                        system: stats.stime
                    }
                },
                execTime: time() - start
            };
        } catch (error) {
            return {
                status: 'error',
                message: `Memory check failed: ${error.message}`,
                execTime: 0
            };
        }
    },
    
    /**
     * Check scheduled tasks status
     * 
     * @returns {Object} Tasks health status
     */
    checkTasks() {
        try {
            const start = time();
            
            // Check if scheduledTasks collection exists
            if (!db._collection('scheduledTasks')) {
                return {
                    status: 'degraded',
                    message: 'Scheduled tasks collection does not exist',
                    execTime: time() - start
                };
            }
            
            // Get task statistics
            const stats = db._query(aql`
                LET total = LENGTH(FOR task IN scheduledTasks RETURN 1)
                LET active = LENGTH(FOR task IN scheduledTasks FILTER task.status == 'active' RETURN 1)
                LET failed = LENGTH(FOR task IN scheduledTasks FILTER task.status == 'failed' RETURN 1)
                LET running = LENGTH(FOR task IN scheduledTasks FILTER task.status == 'running' RETURN 1)
                LET retrying = LENGTH(FOR task IN scheduledTasks FILTER task.status == 'retry-scheduled' RETURN 1)
                
                RETURN {
                    total: total,
                    active: active,
                    failed: failed,
                    running: running,
                    retrying: retrying
                }
            `).toArray()[0];
            
            // Check if any tasks have been stuck in running state for too long
            const now = new Date().getTime();
            const stuckTasks = db._query(aql`
                FOR task IN scheduledTasks
                FILTER task.status == 'running'
                LET lastExec = task.lastExecution
                FILTER lastExec != null
                FILTER lastExec.time < ${now - 3600000} // 1 hour
                RETURN task._key
            `).toArray();
            
            // Determine status
            let status = 'ok';
            let message = 'Task system is healthy';
            
            if (stuckTasks.length > 0) {
                status = 'degraded';
                message = `${stuckTasks.length} tasks appear to be stuck in running state`;
            } else if (stats.failed > 0) {
                status = 'degraded';
                message = `${stats.failed} failed tasks detected`;
            }
            
            return {
                status,
                message,
                stats,
                execTime: time() - start
            };
        } catch (error) {
            return {
                status: 'error',
                message: `Tasks check failed: ${error.message}`,
                execTime: 0
            };
        }
    },
    
    /**
     * Check authentication system
     * 
     * @returns {Object} Auth health status
     */
    checkAuth() {
        try {
            const start = time();
            
            // Check if auth is enabled in configuration
            const { configuration } = module.context;
            const authEnabled = configuration.useAuth === true;
            
            // Check if required collections exist
            const authCollections = ['users', 'roles'];
            const missingCollections = [];
            
            for (const collection of authCollections) {
                if (!db._collection(collection)) {
                    missingCollections.push(collection);
                }
            }
            
            // Check if admin role exists
            let adminRoleExists = false;
            if (db._collection('roles')) {
                adminRoleExists = db._query(aql`
                    RETURN LENGTH(
                        FOR role IN roles
                        FILTER role.name == 'admin' AND role.isSystem == true
                        LIMIT 1
                        RETURN 1
                    )
                `).toArray()[0] > 0;
            }
            
            // Get auth statistics
            const stats = {
                authEnabled,
                adminRoleExists
            };
            
            if (db._collection('users')) {
                stats.userCount = db._query(aql`
                    RETURN LENGTH(FOR user IN users RETURN 1)
                `).toArray()[0];
            }
            
            // Determine status
            let status = 'ok';
            let message = 'Authentication system is healthy';
            
            if (missingCollections.length > 0) {
                status = 'degraded';
                message = `Missing collections: ${missingCollections.join(', ')}`;
            } else if (!adminRoleExists) {
                status = 'degraded';
                message = 'Admin role not found';
            }
            
            return {
                status,
                message,
                stats,
                execTime: time() - start
            };
        } catch (error) {
            return {
                status: 'error',
                message: `Auth check failed: ${error.message}`,
                execTime: 0
            };
        }
    }
};
