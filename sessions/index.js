/**
 * Basic API Session Management
 *
 * @version 1.2.20200808
 * @author skitsanos
 */
const {db} = require('@arangodb');
const sessionMiddleware = require('@arangodb/foxx/sessions');
const collectionStorage = require('@arangodb/foxx/sessions/storages/collection');

const sessionManager = {
    allowedResources: [
        '/signup',
        '/login',
        '/logout'
    ],

    init(transport = ['header'])
    {
        const name = 'sessions';

        if (!db._collection(name))
        {
            db._createDocumentCollection(name);
        }

        const sessions = sessionMiddleware({
            storage: collectionStorage({
                autoUpdate: true,
                collection: db._collection(name),
                ttl: module.context.configuration.sessionTtl,
                pruneExpired: true
            }),
            transport
        });

        //Removes all expired sessions from the collection
        sessions.storage.prune();

        module.context.use(sessions);

        module.context.use((req, res, next) =>
        {
            const allowed = this.allowedResources.includes(req.path);

            if (allowed)
            {
                next();
            }
            else
            {
                //check if path is actually RegExp
                for (const rxp of this.allowedResources)
                {
                    if (typeof rxp !== 'string' && rxp.constructor.name === 'RegExp' && req.path.match(rxp))
                    {
                        next();
                        return;
                    }
                }

                //otherwise, just continue with sessions based access
                const sid = req.get('x-session-id');

                if (!Boolean(sid))
                {
                    res.throw(401, 'The request lacks valid authentication credentials for the target resource');
                }
                else
                {
                    //check sid
                    const {get, update} = module.context;
                    const doc = get('sessions', sid).toArray()[0];

                    if (!Boolean(doc))
                    {
                        res.throw(403, 'Session expired');
                    }

                    //update session expires
                    req.session.uid = doc.uid;
                    req.sessionStorage.save(req.session);
                    //update('sessions', sid, {expires: (new Date().getTime()) + module.context.configuration.sessionTtl});

                    next();
                }
            }
        });
    }
};

module.exports = sessionManager;


