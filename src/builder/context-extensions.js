/**
 * Context Extensions for Foxx Microservices
 * 
 * Extends the Foxx context with utility functions for common operations
 * 
 * @version 2.2.0
 * @author Skitsanos
 */
const {
    db,
    query,
    aql
} = require('@arangodb');
const path = require('path');
const queues = require('@arangodb/foxx/queues');
const tasks = require('@arangodb/tasks');
const crypto = require('@arangodb/crypto');
const joi = require('joi');

// Import unified query builder
const { buildQuery, filterBuilder, rxQuery } = require('./unified');

// Import enhanced auth service
const createAuthService = require('./auth');

// Import enhanced database operations
const database = require('./database');
const transactions = require('./database/transaction');

// Import configuration manager
const getConfig = require('./config');

/**
 * Context extensions for Foxx services
 * 
 * @type {ModuleContext}
 */
const extensions = {
    /**
     * Application root path
     */
    appRoot: path.join(__dirname, '..'),

    /**
     * Configuration manager
     * 
     * Provides access to configuration with validation and defaults
     */
    config: null, // Will be initialized later

    /**
     * Database operations
     * 
     * Enhanced database operations with transaction support,
     * batching, error handling, and caching
     */
    db: database,

    /**
     * Transaction utilities
     * 
     * Advanced transaction support for atomic operations
     */
    transaction: transactions,

    /**
     * Get document from collection (legacy method)
     * 
     * @deprecated Use db.get instead
     * @param {String} collection - Name of the collection
     * @param {String} docId - Document ID
     * @returns {*} - Query result
     */
    get: (collection, docId) => 
        query`RETURN UNSET(DOCUMENT(${db._collection(collection)}, ${docId}), "_id", "_rev")`,

    /**
     * Insert document into collection (legacy method)
     * 
     * @deprecated Use db.insert instead
     * @param {String} collection - Name of the collection
     * @param {Object} doc - Document to insert
     * @returns {*} - Query result
     */
    insert: (collection, doc) => 
        query`INSERT ${{
            ...doc,
            createdOn: new Date().getTime(),
            updatedOn: new Date().getTime()
        }} IN ${db._collection(collection)} RETURN UNSET(NEW, "_id", "_rev")`,

    /**
     * Update document in collection (legacy method)
     * 
     * @deprecated Use db.update instead
     * @param {String} collection - Name of the collection
     * @param {String} docId - Document ID
     * @param {Object} doc - Document update
     * @returns {*} - Query result
     */
    update: (collection, docId, doc) => 
        query`UPDATE ${docId} WITH ${{
            ...doc,
            updatedOn: new Date().getTime()
        }} IN ${db._collection(collection)} RETURN KEEP(NEW, "_key")`,

    /**
     * Remove document from collection (legacy method)
     * 
     * @deprecated Use db.remove instead
     * @param {String} collection - Name of the collection
     * @param {String} docId - Document ID
     * @returns {*} - Query result
     */
    remove: (collection, docId) => {
        if (!docId) {
            return null;
        }

        // Check if document exists
        const [exists] = module.context.get(collection, docId).toArray();

        return exists
            ? query`REMOVE ${docId} IN ${db._collection(collection)} RETURN KEEP(OLD, "_key")`
            : { toArray: () => [] };
    },

    /**
     * Query utilities
     */
    queries: {
        filterBuilder
    },

    /**
     * Authentication service
     * 
     * Creates a new instance of the auth service with the current context
     */
    auth: null, // Will be initialized later

    /**
     * Queue job management
     */
    jobs: {
        /**
         * Create and run a new queue job
         * 
         * @param {String} scriptName - Name of the script in manifest
         * @param {Object} data - Job data
         * @param {Object} opts - Job options
         * @returns {String} - Job ID
         */
        run: (scriptName, data, opts) => {
            const queue = queues.create('default');
            
            return queue.push(
                {
                    mount: module.context.mount || '/api',
                    name: scriptName
                },
                data,
                {
                    success: (_result, _jobData, job) => {
                        const { db: database } = require('@arangodb');
                        const updateQuery = global.aqlQuery`REMOVE ${job._key} in _jobs`;
                        updateQuery.options = {
                            ttl: 5,
                            maxRuntime: 5
                        };

                        database._query(updateQuery);
                    },
                    failure: (result, _jobData, job) => {
                        console.error('Job failed:', job, result);
                    },
                    ...opts
                }
            );
        },

        /**
         * Abort a scheduled job
         * 
         * @param {String} jobId - Job ID
         * @param {Boolean} withRemove - Whether to remove the job
         */
        abort: (jobId, withRemove = true) => {
            try {
                const queue = queues.create('default');
                const job = queue.get(jobId);
                
                if (job) {
                    job.abort();
                    if (withRemove) {
                        queue.delete(jobId);
                    }
                }
            } catch (error) {
                console.error(`Failed to abort job ${jobId}:`, error.message);
            }
        }
    },

    /**
     * Run a task once or repeatedly
     * 
     * @param {String} name - Task name
     * @param {String} handler - Task handler
     * @param {Object} params - Task parameters
     * @param {Number} period - Task period (for recurring tasks)
     */
    runTask: (name, handler, params, period) => {
        const config = {
            name,
            id: crypto.uuidv4(),
            params: {
                ...params,
                script: handler,
                context: {
                    appRoot: module.context.appRoot,
                    mount: module.context.mount || '/api',
                    configuration: module.context.configuration
                }
            },
            command: p => {
                const { script, context } = p;
                delete p.script;

                try {
                    const m = require(`${context.appRoot}/tasks/${script}.js`);
                    m(p);
                } catch (error) {
                    console.error(`Failed to execute task ${name}:`, error.message);
                }
            }
        };

        if (period) {
            config.period = period;
        }

        tasks.register(config);
    },

    /**
     * Utility functions
     */
    utils: {
        /**
         * Check if a string is a valid email
         * 
         * @param {String} str - String to check
         * @returns {Boolean} - True if valid email
         */
        isEmail(str) {
            const schemaEmail = joi.string().email().required();
            const validation = schemaEmail.validate(str);
            return !validation.error;
        },

        /**
         * Build a filter for AQL queries
         * 
         * @param {Array} q - Query parameters
         * @param {String} doc - Document variable name
         * @returns {*} - Filter expression
         */
        filterBuilder(q = [], doc = 'doc') {
            const filtersSchema = joi.array().required().items(joi.object({
                key: joi.string().required(),
                op: joi.string().valid('=', '~', '>', '<', '?').default('='),
                value: joi.any()
            }));

            const validation = filtersSchema.validate(q);
            if (validation.error) {
                throw validation.error;
            }

            // Convert to structured format
            const structuredQuery = q.map(item => ({
                key: item.key,
                operation: item.op,
                value: item.value,
                logic: 'AND'
            }));

            return buildQuery(structuredQuery, doc, [], { addFilterKeyword: false });
        },

        /**
         * Create a filter clause for AQL queries
         * 
         * @param {Array} q - Query parameters
         * @param {String} doc - Document variable name
         * @returns {*} - Filter clause
         */
        filter(q = [], doc = 'doc') {
            const qb = module.context.utils.filterBuilder(q, doc);
            const { query: filterQuery } = qb;

            if (!filterQuery) {
                return aql.literal(' ');
            }

            const parts = [
                aql` FILTER`,
                qb
            ];

            return aql.join(parts, ' ');
        },

        /**
         * Create a query using rxQuery syntax
         * 
         * @param {String} value - Query string
         * @param {String} doc - Document variable name
         * @returns {*} - Query
         */
        rxQuery(value, doc = 'doc') {
            return rxQuery(value, doc);
        }
    }
};

// Initialize auth service with the module context
Object.defineProperty(extensions, 'auth', {
    get: function() {
        // Lazily initialize the auth service when first accessed
        if (!this._authService) {
            this._authService = createAuthService(module.context);
        }
        return this._authService;
    },
    configurable: false
});

// Initialize configuration manager with the module context
Object.defineProperty(extensions, 'config', {
    get: function() {
        // Lazily initialize the configuration manager when first accessed
        if (!this._configManager) {
            this._configManager = getConfig(module.context);
        }
        return this._configManager;
    },
    configurable: false
});

module.exports = extensions;
