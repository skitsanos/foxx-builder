const builder = require('./builder/index');
builder.init();

module.context.use((req, res, next) =>
{
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== 'some-api-key-string')
    {
        res.throw(400, 'Invalid API key');
    }
    next();
});

