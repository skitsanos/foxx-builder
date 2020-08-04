/**
 * Basic API Session Management
 *
 * @version 1.0
 * @author skitsanos
 */
const {db} = require('@arangodb');
const sessionMiddleware = require('@arangodb/foxx/sessions');
const collectionStorage = require('@arangodb/foxx/sessions/storages/collection');

const sessionManager = {
    init: (transport = ['header']) =>
    {
        const name = 'sessions';

        if (!db._collection(name))
        {
            db._createDocumentCollection(name);
        }

        const sessions = sessionMiddleware({
            storage: collectionStorage({
                collection: db._collection(name),
                ttl: module.context.configuration.sessionTtl,
                pruneExpired: true
            }),
            transport
        });

        module.context.use(sessions);
    }
};

module.exports = sessionManager;


