/**
 * ArangoDB Foxx Services Builder
 *
 * @version 1.6.20201104
 * @author Skitsanos, info@skitsanos.com, https://github.com/skitsanos
 */
const createRouter = require('@arangodb/foxx/router');
const createGraphQLRouter = require('@arangodb/foxx/graphql');
const graphql = require('graphql');
const fs = require('fs');
const path = require('path');
const {graphqlSync} = require('graphql');

const getServicesBase = () =>
{
    const v1Path = path.join(module.context.basePath, 'foxx');
    if (fs.exists(v1Path))
    {
        return v1Path;
    }

    const v2Path = path.join(module.context.basePath, 'src', 'routes');
    if (fs.exists(v2Path))
    {
        return v2Path;
    }

    console.error('Failed to setup services base');
    process.exit(1);
};

const supportedMethods = ['all', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace', 'graphql'];

const index = {
    foxxServicesLocation: getServicesBase(),

    assignParams(type, params, endpoint)
    {
        for (const param of Object.keys(params))
        {
            if (Object.keys(param).length > 0)
            {
                const {schema, description} = params[param];

                switch (type.toLowerCase())
                {
                    case 'header':
                        endpoint.header(param, schema, description);
                        break;
                    case 'path':
                        endpoint.pathParam(param, schema, description);
                        break;
                    case 'query':
                        endpoint.queryParam(param, schema, description);
                        break;
                    default:
                        break;
                }
            }
            else
            {
                switch (type.toLowerCase())
                {
                    case 'header':
                        endpoint.header(param);
                        break;
                    case 'path':
                        endpoint.pathParam(param);
                        break;
                    case 'query':
                        endpoint.queryParam(param);
                        break;
                    default:
                        break;
                }
            }
        }
    },

    parsePath(p)
    {
        if (fs.exists(p))
        {
            const fsItems = fs.list(p);
            if (fsItems.length > 0)
            {
                for (const item of fsItems)
                {
                    const fullPath = path.join(p, item);
                    if (fs.isDirectory(fullPath))
                    {
                        this.parsePath(fullPath);
                    }

                    if (fs.isFile(fullPath))
                    {
                        const method = path.basename(fullPath, '.js');

                        if (supportedMethods.includes(method))
                        {
                            const temp = fullPath.split(this.foxxServicesLocation)[1].split(`${method}.js`)[0];
                            const pathToHandle = temp.substring(0, temp.length - 1).replace(/\\/gi, '/');
                            const routeHandlerModule = require(fullPath);

                            //parse path params
                            const pathParsed = pathToHandle.replace(/\$/gi, ':');

                            //
                            // create endpoint handler for the GraphQL
                            //
                            if (method === 'graphql')
                            {
                                if (!('schema' in routeHandlerModule))
                                {
                                    const err = `GraphQL schema is not defined for ${pathParsed}`;
                                    console.error(err);
                                    throw new Error(err);
                                }

                                module.context.use(pathParsed, createGraphQLRouter({
                                    graphql,
                                    formatError: (error) =>
                                    {
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
                                            schema: routeHandlerModule.schema,
                                            contextValue: context,
                                            source: document,
                                            variableValues: variables
                                        }),
                                    ...routeHandlerModule
                                }));
                                return;
                            }

                            //
                            // create endpoint handler for the HTTP verbs
                            //
                            const r = createRouter();
                            const endpoint = r[method](pathParsed, routeHandlerModule.handler);

                            //check if params were defined
                            if (Object.prototype.hasOwnProperty.call(routeHandlerModule, 'params'))
                            {
                                //check for path params
                                if (Object.prototype.hasOwnProperty.call(routeHandlerModule.params, 'path'))
                                {
                                    this.assignParams('path', routeHandlerModule.params.path, endpoint);
                                }

                                //check for query params
                                if (Object.prototype.hasOwnProperty.call(routeHandlerModule.params, 'query'))
                                {
                                    this.assignParams('query', routeHandlerModule.params.query, endpoint);
                                }
                            }

                            //check headers
                            if (Object.prototype.hasOwnProperty.call(routeHandlerModule, 'headers'))
                            {
                                this.assignParams('headers', routeHandlerModule.headers, endpoint);
                            }

                            //check for body defs
                            if (Object.prototype.hasOwnProperty.call(routeHandlerModule, 'body'))
                            {
                                if (Boolean(routeHandlerModule.body))
                                {
                                    const {model, mimes, description} = routeHandlerModule.body;
                                    endpoint.body(model, mimes, description);
                                }
                                else
                                {
                                    endpoint.body(null);
                                }
                            }

                            if (Object.prototype.hasOwnProperty.call(routeHandlerModule, 'error') && Array.isArray(routeHandlerModule.error))
                            {
                                for (const rule of routeHandlerModule.error)
                                {
                                    const [status, message] = Object.entries(rule)[0];
                                    endpoint.error(Number(status), message);
                                }
                            }
                            //assign route handler
                            module.context.use('/', r);
                        }
                    }
                }
            }
        }
    },

    init()
    {
        this.parsePath(this.foxxServicesLocation);
        const extensions = require('./context-extensions');
        Object.assign(module.context, extensions);
    }
};

module.exports = index;