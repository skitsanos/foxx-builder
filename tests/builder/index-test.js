/**
 * Test file for the refactored FoxxBuilder
 *
 * This file demonstrates how to use the refactored FoxxBuilder
 * and verifies its functionality.
 *
 * @author skitsanos
 */


//TODO: Mock @arangddb internals to prevent the following error
//error: Cannot find module '@arangodb/foxx/router' from
// '/Users/skitsanos/FTP/Products/Skitsanos/foxx-builder/src/builder/index.js'

// Import the refactored FoxxBuilder
const foxxBuilder = require('../../src/index');

// Mock the required dependencies for testing
const mockFs = {
    exists: (path) => true,
    list: (path) => [
        'get.js',
        'post.js',
        'subdir'
    ],
    isDirectory: (path) => path.endsWith('subdir'),
    isFile: (path) => path.endsWith('.js')
};

const mockPath = {
    join: (...args) => args.join('/'),
    basename: (filePath, ext) => filePath.split('/').pop().replace(ext, '')
};

const mockRouter = {
    get: (path, handler) => ({
        path,
        handler,
        methods: ['get']
    }),
    post: (path, handler) => ({
        path,
        handler,
        methods: ['post']
    })
};

const mockCreateRouter = () => mockRouter;

const mockModule = {
    context: {
        basePath: '/app',
        use: (path, router) => console.log(`Registered router at ${path}`)
    }
};

// Set up the mocks
global.module = mockModule;
global.require = (path) =>
{
    if (path.endsWith('/context-extensions'))
    {
        return {
            extension1: true,
            extension2: () =>
            {
            }
        };
    }
    if (path.endsWith('.js'))
    {
        return {
            handler: (req, res) => res.send({success: true}),
            params: {
                path: {
                    id: {
                        schema: {type: 'string'},
                        description: 'User ID'
                    }
                },
                query: {
                    filter: {
                        schema: {type: 'string'},
                        description: 'Filter query'
                    }
                }
            },
            headers: {
                'accept-language': {
                    schema: {type: 'string'},
                    description: 'Preferred language'
                }
            },
            body: {
                model: {type: 'object'},
                mimes: ['application/json'],
                description: 'Request body'
            },
            error: [
                {400: 'Bad Request'},
                {404: 'Not Found'}
            ]
        };
    }
    return {};
};

// Test the FoxxBuilder
function testFoxxBuilder()
{
    console.log('Testing FoxxBuilder...');

    try
    {
        // Test getServicesBase function
        const servicesBase = getServicesBase();
        console.log(`Services base: ${servicesBase}`);

        // Test processRouteFile function
        const routePath = foxxBuilder.extractRoutePath('/app/src/routes/users/$id/get.js', 'get');
        console.log(`Route path: ${routePath}`);

        // Test setupHttpEndpoint function
        const routeHandler = {
            handler: (req, res) => res.send({success: true}),
            params: {
                path: {
                    id: {
                        schema: {type: 'string'},
                        description: 'User ID'
                    }
                }
            }
        };
        foxxBuilder.setupHttpEndpoint('/users/:id', 'get', routeHandler);

        // Test assignParams function
        const endpoint = {
            pathParam: (name, schema, description) =>
                console.log(`Configured path param: ${name}, schema: ${schema}, description: ${description}`),
            queryParam: (name, schema, description) =>
                console.log(`Configured query param: ${name}, schema: ${schema}, description: ${description}`),
            header: (name, schema, description) =>
                console.log(`Configured header: ${name}, schema: ${schema}, description: ${description}`)
        };
        foxxBuilder.assignParams('path', {
            id: {
                schema: {type: 'string'},
                description: 'User ID'
            }
        }, endpoint);

        console.log('All tests passed!');
    }
    catch (error)
    {
        console.error(`Test failed: ${error.message}`);
    }
}

// Run the tests
testFoxxBuilder();
