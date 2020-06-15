/**
 * ArangoDB Foxx Services Builder
 *
 * @version 1.0.20200615
 * @author Skitsanos, info@skitsanos.com, https://github.com/skitsanos
 */

const createRouter = require('@arangodb/foxx/router');
const fs = require('fs');
const path = require('path');

const index = {
    foxxServicesLocation: path.join(module.context.basePath, '/foxx'),
    supportedMethods: ['all', 'get', 'post', 'put', 'delete', 'patch'],

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
                        if (this.supportedMethods.includes(method))
                        {
                            const temp = fullPath.split(this.foxxServicesLocation)[1].split(`${method}.js`)[0];
                            const pathToHandle = temp.substring(0, temp.length - 1);
                            const m = require(fullPath);

                            //parse path params
                            const pathParsed = pathToHandle.replace(/\$/gi, ':');

                            //create endpoint handler
                            const r = createRouter();
                            const endpoint = r[method](pathParsed, m.handler);

                            //check if params were defined
                            if (Object.prototype.hasOwnProperty.call(m, 'params'))
                            {
                                console.log('Processing params...');
                                //check for path params
                                if (Object.prototype.hasOwnProperty.call(m.params, 'path'))
                                {
                                    this.assignParams('path', m.params.path, endpoint);
                                }

                                //check for query params
                                if (Object.prototype.hasOwnProperty.call(m.params, 'query'))
                                {
                                    this.assignParams('query', m.params.query, endpoint);
                                }

                                //check headers
                                if (Object.prototype.hasOwnProperty.call(m, 'headers'))
                                {
                                    this.assignParams('headers', m.headers, endpoint);
                                }

                                //check for body defs
                                if (Object.prototype.hasOwnProperty.call(m, 'body'))
                                {
                                    const {model, mimes, description} = m.body;
                                    endpoint.body(model, mimes, description);
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
        console.log('>>> foxx services building completed');
    }
};

module.exports = index;