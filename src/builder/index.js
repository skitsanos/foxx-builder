/**
 * ArangoDB Foxx Services Builder
 *
 * @version 2.0.0
 * @author Skitsanos, info@skitsanos.com, https://github.com/skitsanos
 */
const createRouter = require('@arangodb/foxx/router');
const createGraphQLRouter = require('@arangodb/foxx/graphql');
const graphql = require('graphql');
const fs = require('fs');
const path = require('path');
const {graphqlSync} = require('graphql');

/**
 * List of supported HTTP methods and GraphQL
 * @type {string[]}
 */
const SUPPORTED_METHODS = [
    'all', 'get', 'post', 'put', 'delete', 
    'patch', 'head', 'options', 'trace', 'graphql'
];

/**
 * Determines the base directory for services
 * Checks for compatibility with v1 and v2 paths
 * 
 * @returns {string} The path to services directory
 * @throws {Error} If neither v1 nor v2 paths exist
 */
const getServicesBase = () => {
    // Check for v1 path (legacy)
    const v1Path = path.join(module.context.basePath, 'foxx');
    if (fs.exists(v1Path)) {
        console.log(`Using v1 services path: ${v1Path}`);
        return v1Path;
    }

    // Check for v2 path (current)
    const v2Path = path.join(module.context.basePath, 'src', 'routes');
    if (fs.exists(v2Path)) {
        console.log(`Using v2 services path: ${v2Path}`);
        return v2Path;
    }

    // Neither path exists
    const error = 'Failed to setup services base: neither v1 nor v2 paths exist';
    console.error(error);
    throw new Error(error);
};

/**
 * FoxxBuilder main implementation
 */
const foxxBuilder = {
    foxxServicesLocation: null,

    /**
     * Initialize the FoxxBuilder
     * 
     * @throws {Error} If initialization fails
     */
    init() {
        try {
            // Set the base services location
            this.foxxServicesLocation = getServicesBase();
            
            // Process the routes
            this.processRoutes(this.foxxServicesLocation);
            
            // Apply context extensions
            const extensions = require('./context-extensions');
            Object.assign(module.context, extensions);
            
            console.log('FoxxBuilder initialized successfully');
        } catch (error) {
            console.error(`FoxxBuilder initialization failed: ${error.message}`);
            throw error;
        }
    },

    /**
     * Process all routes recursively starting from the base directory
     * 
     * @param {string} directoryPath - Directory to process
     */
    processRoutes(directoryPath) {
        if (!fs.exists(directoryPath)) {
            console.warn(`Directory does not exist: ${directoryPath}`);
            return;
        }

        const items = fs.list(directoryPath);
        
        for (const item of items) {
            const fullPath = path.join(directoryPath, item);
            
            if (fs.isDirectory(fullPath)) {
                // Recursively process subdirectories
                this.processRoutes(fullPath);
            } else if (fs.isFile(fullPath)) {
                // Process file if it's a route handler
                this.processRouteFile(fullPath);
            }
        }
    },

    /**
     * Process a single route file
     * 
     * @param {string} filePath - Path to the route file
     */
    processRouteFile(filePath) {
        try {
            // Extract the method (filename without extension)
            const method = path.basename(filePath, '.js');
            
            // Only process files that match supported HTTP methods
            if (!SUPPORTED_METHODS.includes(method)) {
                return;
            }
            
            // Extract the route path
            const routePath = this.extractRoutePath(filePath, method);
            
            // Parse the route handler module
            const routeHandler = this.loadRouteHandler(filePath);
            
            // Register the route based on method type
            if (method === 'graphql') {
                this.setupGraphQLEndpoint(routePath, routeHandler);
            } else {
                this.setupHttpEndpoint(routePath, method, routeHandler);
            }
        } catch (error) {
            console.error(`Error processing route file ${filePath}: ${error.message}`);
            // Continue processing other routes
        }
    },

    /**
     * Extract the route path from the file path
     * 
     * @param {string} filePath - Path to the route file
     * @param {string} method - HTTP method
     * @returns {string} The route path
     */
    extractRoutePath(filePath, method) {
        try {
            // Get the relative path from the services base
            let relativePath = filePath.substring(this.foxxServicesLocation.length);
            
            // Remove the method.js part
            relativePath = relativePath.substring(0, relativePath.length - (method.length + 3));
            
            // Normalize path separators
            let routePath = relativePath.replace(/\\/g, '/');
            
            // Convert $ parameters to : parameters for Express-style routing
            routePath = routePath.replace(/\$/g, ':');
            
            // Remove trailing slash
            if (routePath.endsWith('/')) {
                routePath = routePath.substring(0, routePath.length - 1);
            }
            
            return routePath;
        } catch (error) {
            throw new Error(`Failed to extract route path: ${error.message}`);
        }
    },

    /**
     * Load the route handler module
     * 
     * @param {string} filePath - Path to the route file
     * @returns {object} The route handler module
     */
    loadRouteHandler(filePath) {
        try {
            return require(filePath);
        } catch (error) {
            throw new Error(`Failed to load route handler: ${error.message}`);
        }
    },

    /**
     * Setup a GraphQL endpoint
     * 
     * @param {string} routePath - The route path
     * @param {object} routeHandler - The route handler module
     */
    setupGraphQLEndpoint(routePath, routeHandler) {
        // Validate that schema is defined
        if (!('schema' in routeHandler)) {
            throw new Error(`GraphQL schema is not defined for ${routePath}`);
        }

        // Create and register the GraphQL router
        try {
            module.context.use(routePath, createGraphQLRouter({
                graphql,
                formatError: (error) => {
                    return {
                        meta: {
                            platform: 'foxx-builder'
                        },
                        message: error.message,
                        locations: error.locations,
                        path: error.path
                    };
                },
                executor: ({context, document, variables}) =>
                    graphqlSync({
                        schema: routeHandler.schema,
                        contextValue: context,
                        source: document,
                        variableValues: variables
                    }),
                ...routeHandler
            }));
            
            console.log(`Registered GraphQL endpoint: ${routePath}`);
        } catch (error) {
            throw new Error(`Failed to setup GraphQL endpoint ${routePath}: ${error.message}`);
        }
    },

    /**
     * Setup an HTTP endpoint for standard HTTP methods
     * 
     * @param {string} routePath - The route path
     * @param {string} method - The HTTP method
     * @param {object} routeHandler - The route handler module
     */
    setupHttpEndpoint(routePath, method, routeHandler) {
        try {
            // Ensure handler is defined
            if (!routeHandler.handler) {
                throw new Error(`Handler function not defined for ${method.toUpperCase()} ${routePath}`);
            }

            // Create router and endpoint
            const router = createRouter();
            const endpoint = router[method](routePath, routeHandler.handler);
            
            // Configure the endpoint
            this.configureEndpoint(endpoint, routeHandler);
            
            // Register the router
            module.context.use('/', router);
            
            console.log(`Registered ${method.toUpperCase()} endpoint: ${routePath}`);
        } catch (error) {
            throw new Error(`Failed to setup HTTP endpoint ${method.toUpperCase()} ${routePath}: ${error.message}`);
        }
    },

    /**
     * Configure an endpoint with params, headers, body, and error handlers
     * 
     * @param {object} endpoint - The endpoint to configure
     * @param {object} routeHandler - The route handler module
     */
    configureEndpoint(endpoint, routeHandler) {
        // Configure parameters
        if (routeHandler.params) {
            this.configureParams(endpoint, routeHandler.params);
        }
        
        // Configure headers
        if (routeHandler.headers) {
            this.configureHeaders(endpoint, routeHandler.headers);
        }
        
        // Configure request body
        if (Object.prototype.hasOwnProperty.call(routeHandler, 'body')) {
            this.configureBody(endpoint, routeHandler.body);
        }
        
        // Configure error handlers
        if (routeHandler.error && Array.isArray(routeHandler.error)) {
            this.configureErrors(endpoint, routeHandler.error);
        }
    },

    /**
     * Configure parameters for an endpoint
     * 
     * @param {object} endpoint - The endpoint to configure
     * @param {object} params - Parameter definitions
     */
    configureParams(endpoint, params) {
        // Configure path parameters
        if (params.path) {
            this.assignParams('path', params.path, endpoint);
        }
        
        // Configure query parameters
        if (params.query) {
            this.assignParams('query', params.query, endpoint);
        }
    },

    /**
     * Configure headers for an endpoint
     * 
     * @param {object} endpoint - The endpoint to configure
     * @param {object} headers - Header definitions
     */
    configureHeaders(endpoint, headers) {
        this.assignParams('header', headers, endpoint);
    },

    /**
     * Configure request body for an endpoint
     * 
     * @param {object} endpoint - The endpoint to configure
     * @param {object|null} body - Body definition
     */
    configureBody(endpoint, body) {
        if (body) {
            const {model, mimes, description} = body;
            endpoint.body(model, mimes, description);
        } else {
            endpoint.body(null);
        }
    },

    /**
     * Configure error handlers for an endpoint
     * 
     * @param {object} endpoint - The endpoint to configure
     * @param {Array} errors - Error definitions
     */
    configureErrors(endpoint, errors) {
        for (const rule of errors) {
            const [status, message] = Object.entries(rule)[0];
            endpoint.error(Number(status), message);
        }
    },

    /**
     * Assign parameters to an endpoint
     * 
     * @param {string} type - Parameter type ('path', 'query', or 'header')
     * @param {object} params - Parameter definitions
     * @param {object} endpoint - The endpoint to configure
     */
    assignParams(type, params, endpoint) {
        for (const param of Object.keys(params)) {
            // Check if parameter has schema and description
            if (Object.keys(params[param]).length > 0) {
                const {schema, description} = params[param];
                
                switch (type.toLowerCase()) {
                    case 'header':
                        endpoint.header(param, schema, description);
                        break;
                    case 'path':
                        endpoint.pathParam(param, schema, description);
                        break;
                    case 'query':
                        endpoint.queryParam(param, schema, description);
                        break;
                }
            } else {
                // Simple parameter without schema or description
                switch (type.toLowerCase()) {
                    case 'header':
                        endpoint.header(param);
                        break;
                    case 'path':
                        endpoint.pathParam(param);
                        break;
                    case 'query':
                        endpoint.queryParam(param);
                        break;
                }
            }
        }
    }
};

module.exports = foxxBuilder;
