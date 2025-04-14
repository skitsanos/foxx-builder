# FoxxBuilder Core

The FoxxBuilder is the core component of the foxx-builder project. It provides a framework for creating and managing ArangoDB Foxx services.

## Features

- Automatic route discovery and registration
- Support for all HTTP methods
- GraphQL integration
- Parameter validation
- Error handling
- Context extensions

## Code Structure

The FoxxBuilder core consists of the following components:

- **index.js**: Main entry point that discovers and registers routes
- **unified/**: Query builder for ArangoDB AQL queries
- **context-extensions.js**: Extends the Foxx context with utility functions

## Route File Organization

Routes are organized in the `src/routes` directory with the following convention:

- Each HTTP endpoint has its own file named after the HTTP method (e.g., `get.js`, `post.js`)
- Path parameters are defined with the `$` prefix (e.g., `users/$id/get.js`)
- GraphQL endpoints are defined with `graphql.js` files

## Route Handler Structure

A route handler is a JavaScript module that exports an object with the following properties:

```javascript
module.exports = {
    // Name of the route for documentation
    name: 'Get user by id',
    
    // Request handler function
    handler: (req, res) => {
        // Handle the request
        res.send({ result: true });
    },
    
    // Path and query parameters
    params: {
        path: {
            id: {
                schema: { type: 'string' },
                description: 'User ID'
            }
        },
        query: {
            include: {
                schema: { type: 'string' },
                description: 'Comma-separated list of related entities to include'
            }
        }
    },
    
    // Request headers
    headers: {
        'accept-language': {
            schema: { type: 'string' },
            description: 'Preferred language'
        }
    },
    
    // Request body
    body: {
        model: { type: 'object' },
        mimes: ['application/json'],
        description: 'Request body'
    },
    
    // Error definitions
    error: [
        { 400: 'Bad Request' },
        { 404: 'Not Found' }
    ]
};
```

## GraphQL Support

To define a GraphQL endpoint, create a `graphql.js` file with a `schema` property:

```javascript
const { GraphQLSchema, GraphQLObjectType, GraphQLString } = require('graphql');

module.exports = {
    schema: new GraphQLSchema({
        query: new GraphQLObjectType({
            name: 'Query',
            fields: {
                hello: {
                    type: GraphQLString,
                    resolve: () => 'Hello World!'
                }
            }
        })
    })
};
```

## Context Extensions

The FoxxBuilder provides several context extensions to simplify common tasks:

- **get, insert, update, remove**: CRUD operations for collections
- **auth**: JWT token management
- **utils**: Utility functions for validation and query building
- **jobs**: Queue job management
- **runTask**: Task scheduling and execution

See the `context-extensions.js` file for more details.
