const builder = require('./builder/index');
builder.init();

//
// Example on how to use JWT token authorization.
// Only /login and /signup requesats will be allowed without authentication
//
module.context.use((req, res, next) =>
{
    if (req.path.match(/\/(login|signup)/igu))
    {
        next();
    }
    else
    {
        const {authorization} = req.headers;

        if (!authorization)
        {
            res.throw(404, 'Missing authorization header');
        }

        const token = authorization && authorization.split(' ')[1];

        try
        {
            const {auth} = module.context;

            if (auth.isExpired(token))
            {
                res.throw(403, 'The token is expired');
            }

            next();
        }
        catch (e)
        {
            res.throw(403, e.message);
        }
    }
});

/*module.context.use((req, res, next) =>
 {
 const {runTask} = module.context;
 runTask(
 'Apilitics via Amplitude',
 'amplitude',
 {
 userId: Boolean(req.session && req.session.uid) ? req.session.uid : '(anonymous)',
 authorized: Boolean(req.session && req.session.uid),
 path: req.path,
 headers: req.headers,
 events: [
 {
 type: 'prod.site.pageview'
 }
 ]
 });

 next();
 });*/
