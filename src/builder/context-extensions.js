const {
    db,
    query,
    aql
} = require('@arangodb');
const path = require('path');

const queues = require('@arangodb/foxx/queues');
const queue = queues.create('default');

const tasks = require('@arangodb/tasks');

const crypto = require('@arangodb/crypto');
const joi = require('joi');

const filterBuilder = require('./filter-builder');

const rxq = require('./rxq');

/**
 *
 * @type {ModuleContext}
 */
const extensions = {
    appRoot: path.join(__dirname, '..'),

    /**
     * Get document from collection
     * @param {String} collection - name of the collection
     * @param {String} docId - document id
     * @returns {*}
     */
    get: (collection, docId) => query`return unset(document(${db._collection(collection)}, ${docId}), "_id", "_rev")`,

    insert: (collection, doc) => query`INSERT ${{
        ...doc,
        createdOn: new Date().getTime(),
        updatedOn: new Date().getTime()
    }} IN ${db._collection(collection)} RETURN UNSET(NEW, "_id", "_rev")`,

    update: (collection, docId, doc) => query`UPDATE ${docId} WITH ${{
        ...doc,
        updatedOn: new Date().getTime()
    }} IN ${db._collection(collection)} RETURN KEEP(NEW, "_key")`,

    remove: (collection, docId) =>
    {
        if (!docId)
        {
            return null;
        }

        const [exists] = module.context.get(collection, docId).toArray();

        return exists
               ? query`REMOVE ${docId} IN ${db._collection(collection)} RETURN KEEP(OLD, "_key")`
               : {toArray: () => []};
    },

    queries: {
        filterBuilder
    },

    //
    // JWT helpers
    //
    auth: {
        /**
         * Encodes payload into JWT token
         * @param {Object} payload - payload to encode
         * @returns {String} - JWT token
         */
        encode: payload =>
        {
            const {
                jwtSecret,
                sessionTtl = 60
            } = module.context.configuration;

            if (!jwtSecret)
            {
                throw new Error('Encoding is failed. jwtSecret is missing in configuration');
            }

            const expiresOn = new Date().getTime() + (sessionTtl * 1000);

            const jsonPayload = JSON.stringify({
                ...payload || {},
                expiresOn
            });

            return crypto.jwtEncode(jwtSecret, jsonPayload, 'HS512');
        },

        /**
         * Decodes JWT token
         * @param {String} token - JWT token
         * @returns {Object} - decoded payload
         */
        decode: token =>
        {
            const {jwtSecret} = module.context.configuration;

            if (!jwtSecret)
            {
                throw new Error('Decoding is failed. jwtSecret is missing in configuration');
            }

            return JSON.parse(crypto.jwtDecode(jwtSecret, token, false));
        },

        isExpired: token =>
        {
            const {jwtSecret} = module.context.configuration;

            if (!jwtSecret)
            {
                throw new Error('jwtSecret is missing in configuration');
            }

            const session = JSON.parse(crypto.jwtDecode(jwtSecret, token, false));

            const {expiresOn} = session;

            return new Date().getTime() >= expiresOn;
        }
    },

    //
    // Queue Jobs
    //
    jobs: {
        /**
         * Runs job
         * @param scriptName {String} name of the script listed in manifest file
         * @param data {Object}
         * @param opts {Object}
         * @returns {String}
         */
        run: (scriptName, data, opts) =>
        {
            return queue.push(
                {
                    mount: module.context.mount || '/api',
                    // script name in the service manifest
                    name: scriptName
                },
                data, // arguments
                {
                    success: (_result, _jobData, job) =>
                    {
                        const {db: database} = require('@arangodb');
                        const updateQuery = global.aqlQuery`REMOVE ${job._key} in _jobs`;
                        updateQuery.options = {
                            ttl: 5,
                            maxRuntime: 5
                        };

                        database._query(updateQuery);
                    },
                    failure: (result, _jobData, job) =>
                    {
                        console.log(job, result);
                    },
                    ...opts
                }
            );
        },

        /**
         * Aborts scheduled job
         * @param jobId {String}
         * @param withRemove {Boolean}
         */
        abort: (jobId, withRemove = true) =>
        {
            try
            {
                const job = queue.get(jobId);
                if (job)
                {
                    job.abort();
                    if (withRemove)
                    {
                        queue.delete(jobId);
                    }
                }
            }
            catch (e)
            {
                //no job found
            }
        }
    },

    /**
     * Runs a single or repeated task
     * @param name
     * @param handler
     * @param params
     * @param period
     */
    runTask: (name, handler, params, period) =>
    {
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
            command: p =>
            {
                const {
                    script,
                    context
                } = p;

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
    },

    utils: {
        isEmail(str)
        {
            const schemaEmail = joi.string().email().required();
            const validation = schemaEmail.validate(str);
            return !(validation.error);
        },

        filterBuilder(q = [], doc = 'doc')
        {
            const filtersSchema = joi.array().required().items(joi.object({
                key: joi.string().required(),
                op: joi.string().valid('=', '~', '>', '<', '?').default('='),
                value: joi.any()
            }));

            const validation = filtersSchema.validate(q);
            if (validation.error)
            {
                throw validation.error;
            }

            if (q.length === 0)
            {
                return aql.literal(' ');
            }

            const parts = [
                aql` `
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

                    case '?':
                        parts.push(aql.literal(`LIKE(${key},`));
                        const opValue = `%${el.value}%`;
                        parts.push(aql`${opValue}, true)`);
                        break;

                    default:
                        parts.push(aql.literal(key));
                        parts.push(aql` == ${el.value}`);
                        break;
                }

                if (i < q.length - 1 && !el.logic)
                {
                    parts.push(aql`&&`);
                }
            }

            return aql.join(parts, ' ');
        },

        filter(q = [], doc = 'doc')
        {
            const qb = module.context.utils.filterBuilder(q, doc);

            const {query: filterQuery} = qb;

            if (!filterQuery)
            {
                return aql.literal(' ');
            }

            const parts = [
                aql` filter`,
                qb
            ];

            return aql.join(parts, ' ');
        },

        rxQuery(value, doc = 'doc')
        {
            return rxq(value, doc);
        }
    }
};

module.exports = extensions;