/**
 * ArangoDB Foxx Services Builder
 *
 * @version 1.3.20201023
 * @author Skitsanos, info@skitsanos.com, https://github.com/skitsanos
 */
const {db, query, aql} = require('@arangodb');
const createRouter = require('@arangodb/foxx/router');
const fs = require('fs');
const path = require('path');

const queues = require('@arangodb/foxx/queues');
const queue = queues.create('default');

const tasks = require('@arangodb/tasks');

const crypto = require('@arangodb/crypto');
const joi = require('joi');

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
                            const pathToHandle = temp.substring(0, temp.length - 1).replace(/\\/gi, '/');
                            const m = require(fullPath);

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

                            if (Object.prototype.hasOwnProperty.call(m, 'error') && Array.isArray(m.error))
                            {
                                for (const rule of m.error)
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

        /**
         * Add context helpers
         */

        module.context.appRoot = path.join(__dirname, '..');

        //get record by id
        module.context.get = (store, docId) => query`return unset(document(${db._collection(store)}, ${docId}), "_id", "_rev")`;

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
        module.context.remove = (store, docId) =>
        {
            if (!docId)
            {
                return null;
            }

            const [exists] = module.context.get(store, docId).toArray();

            return Boolean(exists)
                ? query`REMOVE ${docId} IN ${db._collection(store)} RETURN KEEP(OLD, "_key")`
                : {toArray: () => []};
        };

        module.context.runScript = (scriptName, data, opts) =>
        {
            return queue.push(
                {
                    mount: module.context.mount, // i.e. this current service
                    name: scriptName // script name in the service manifest
                },
                data, // arguments
                opts
            );
        };

        /**
         * Runs single or repeated task
         * @param id
         * @param name
         * @param handler
         * @param params
         * @param period
         */
        module.context.runTask = (name, handler, params, period) =>
        {
            const config = {
                name,
                id: crypto.uuidv4(),
                params: {
                    ...params,
                    script: handler,
                    context: {
                        appRoot: module.context.appRoot,
                        mount: module.context.mount,
                        configuration: module.context.configuration
                    }
                },
                command: p =>
                {
                    const {script, context} = p;

                    delete p.script;

                    const m = require(`${context.appRoot}/tasks/${script}.js`);
                    m(p);
                }
            };

            if (period)
            {
                config.period = period;
            }

            tasks.register(config);
        };

        module.context.utils = {
            isEmail(str)
            {
                return str.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
            },

            filterBuilder(q = [], doc = 'doc')
            {
                const filtersSchema = joi.array().required().items(joi.object({
                    key: joi.string().required(),
                    op: joi.string().valid('=', '~', '>', '<', '%').default('='),
                    value: joi.any()
                }));

                const validation = filtersSchema.validate(q);
                if (validation.error)
                {
                    throw validation.error;
                }

                if (q.length === 0)
                {
                    return aql.join([aql``], ' ');
                }

                const parts = [
                    aql` FILTER`
                ];

                for (let i = 0; i < q.length; i++)
                {
                    const el = q[i];
                    const key = `${doc}${el.key.split('.').map(k => `.${k}`).join('')}`;

                    switch (el.op)
                    {
                        case '~':
                            parts.push(aql.literal(key));
                            parts.push(aql` != ${el.value}`);
                            break;

                        case '>':
                            parts.push(aql.literal(key));
                            parts.push(aql` > ${el.value}`);
                            break;

                        case '<':
                            parts.push(aql.literal(key));
                            parts.push(aql` < ${el.value}`);
                            break;

                        case '%':
                            //parts.push(aql.literal('LIKE('));
                            parts.push(aql.literal(`LIKE(${key},`));
                            parts.push(aql`${el.value}, true)`);
                            break;

                        default:
                            parts.push(aql.literal(key));
                            parts.push(aql` == ${el.value}`);
                            break;
                    }

                    //parts.push(output);

                    if (i < q.length - 1 && !Boolean(el.logic))
                    {
                        parts.push(aql`&&`);
                    }
                }

                return aql.join(parts, ' ');
            }
        };

        console.log('Installed on ', module.context.mount);

        console.log('>>> foxx services building completed');
    }
};

module.exports = index;