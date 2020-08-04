const builder = require('./builder/index');
builder.init();

const sessions = require('./sessions/index');
sessions.init();

const allowedResources = [
    '/login',
    '/logout'
];

module.context.use((req, res, next) =>
{
    const allowed = allowedResources.includes(req.path);

    if (allowed)
    {
        next();
    }
    else
    {
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
            update('sessions', sid, (new Date().getTime()) + 10000);

            next();
        }
    }
});