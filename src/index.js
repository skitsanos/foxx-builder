const builder = require('./builder/index');
builder.init();

//
// Example on how to use JWT token authorization.
// Only /login and /signup requests will be allowed without authentication
//
module.context.use((req, res, next) =>
{
    if (req.path === '/' || req.path.match(/\/(login|signup|users)/igu))
    {
        next();
    }
    else
    {
        const {auth: authorization} = req;

        const {
            auth,
            get
        } = module.context;

        if (!authorization)
        {
            res.throw(403, 'Missing authorization header');
        }

        const {bearer: token} = authorization;
        if (!token)
        {
            res.throw(403, 'Missing authorization token');
        }

        if (auth.isExpired(token))
        {
            res.throw(403, 'The token is expired');
        }

        const tokenDetails = auth.decode(token);
        const foundUser = get('users', tokenDetails.userId).toArray()[0];

        if (!foundUser)
        {
            res.throw(403, 'Authorization terminated.');
        }

        next();
    }
});