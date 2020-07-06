/**
 * ArangoDB Foxx Services Builder
 *
 * @version 1.0.20200615
 * @author Skitsanos, info@skitsanos.com, https://github.com/skitsanos
 */
const {db, query} = require('@arangodb');
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
                            const pathToHandle = temp.substring(0, temp.length - 1).replace('\\', '/');
                            const m = require(fullPath);

                            console.log(pathToHandle);

                            //parse path params
                            const pathParsed = pathToHandle.replace(/\$/gi, ':');

                            //create endpoint handler
                            const r = createRouter();
                            const endpoint = r[method](pathParsed, m.handler);

                            //check if params were defined
                            if (Object.prototype.hasOwnProperty.call(m, 'params'))
                            {
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
                            }

                            //check headers
                            if (Object.prototype.hasOwnProperty.call(m, 'headers'))
                            {
                                this.assignParams('headers', m.headers, endpoint);
                            }

                            //check for body defs
                            if (Object.prototype.hasOwnProperty.call(m, 'body'))
                            {
                                if (Boolean(m.body))
                                {
                                    const {model, mimes, description} = m.body;
                                    endpoint.body(model, mimes, description);
                                }
                                else
                                {
                                    endpoint.body(null);
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

        /**
         * Add context helpers
         */

        //get record by id
        module.context.get = (store, docId) => query`return document(${db._collection(store)}, ${docId})`;

        //insert new record
        module.context.insert = (store, doc) => query`INSERT ${{
            ...doc,
            createdOn: new Date().getTime(),
            updatedOn: new Date().getTime()
        }} IN ${db._collection(store)} RETURN UNSET(NEW, "_id", "_rev")`;

        //update existing record
        module.context.update = (store, docId, doc) => query`UPDATE ${docId} WITH ${{
            ...doc,
            updatedOn: new Date().getTime()
        }} IN ${db._collection(store)} RETURN KEEP(NEW, "_key")`;

        //removing document by id
        module.context.remove = (store, docId) => query`REMOVE ${docId} IN ${db._collection(store)} RETURN KEEP(OLD, "_key")`;

        console.log('>>> foxx services building completed');
    }
};

module.exports = index;