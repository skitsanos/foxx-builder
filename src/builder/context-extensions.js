const {db, query, aql} = require('@arangodb');
const path = require('path');

const queues = require('@arangodb/foxx/queues');
const queue = queues.create('default');

const tasks = require('@arangodb/tasks');

const crypto = require('@arangodb/crypto');
const joi = require('joi');

const extensions = {
    appRoot: path.join(__dirname, '..'),

    get: (store, docId) => query`return unset(document(${db._collection(store)}, ${docId}), "_id", "_rev")`,

    insert: (store, doc) => query`INSERT ${{
        ...doc,
        createdOn: new Date().getTime(),
        updatedOn: new Date().getTime()
    }} IN ${db._collection(store)} RETURN UNSET(NEW, "_id", "_rev")`,

    update: (store, docId, doc) => query`UPDATE ${docId} WITH ${{
        ...doc,
        updatedOn: new Date().getTime()
    }} IN ${db._collection(store)} RETURN KEEP(NEW, "_key")`,

    remove: (store, docId) =>
    {
        if (!docId)
        {
            return null;
        }

        const [exists] = module.context.get(store, docId).toArray();

        return Boolean(exists)
            ? query`REMOVE ${docId} IN ${db._collection(store)} RETURN KEEP(OLD, "_key")`
            : {toArray: () => []};
    },

    //
    // JWT helpers
    //
    auth: {
        encode: payload =>
        {
            const {jwtSecret, sessionTtl = 60} = module.context.configuration;

            if (!jwtSecret)
            {
                throw new Error('Encoding is failed. jwtSecret is missing in configuration');
            }

            const expiresOn = new Date().getTime() + (sessionTtl * 1000);

            return crypto.jwtEncode(jwtSecret, JSON.stringify({...payload, expiresOn} || {expiresOn}), 'HS512');
        },

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
         *
         * @param scriptName {String} name of the script listed in manifest file
         * @param data {Object}
         * @param opts {Object}
         * @returns {String}
         */
        run: (scriptName, data, opts) =>
        {
            return queue.push(
                {
                    mount: module.context.mount || '/api', // i.e. this current service
                    name: scriptName // script name in the service manifest
                },
                data, // arguments
                {
                    success: (result, jobData, job) =>
                    {
                        const {db: database} = require('@arangodb');
                        const updateQuery = global.aqlQuery`REMOVE ${job._key} in _jobs`;
                        updateQuery.options = {ttl: 5, maxRuntime: 5};

                        database._query(updateQuery);
                    },
                    failure: (result, jobData, job) =>
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
     * Runs single or repeated task
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
    },

    utils: {
        isEmail(str)
        {
            return str.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/ig);
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
                        //parts.push(aql.literal('LIKE('));
                        parts.push(aql.literal(`LIKE(${key},`));
                        const opValue = `%${el.value}%`;
                        parts.push(aql`${opValue}, true)`);
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
        },

        filter(q = [], doc = 'doc')
        {
            const qb = module.context.utils.filterBuilder(q, doc);

            if (!Boolean(qb.query))
            {
                return aql.literal(' ');
            }

            const parts = [
                aql` filter`,
                qb
            ];

            return aql.join(parts, ' ');
        }
    }
};

module.exports = extensions;