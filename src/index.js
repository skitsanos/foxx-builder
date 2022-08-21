const builder = require('./builder/index');
builder.init();

/**
 * Run Google Analytics on each API endpoint request
 */
module.context.use((req, _res, next) =>
{
    const {runTask} = module.context;
    runTask(
        'Google Analytics PageView recording',
        'ga',
        {
            clientId: req.headers['x-user-id'],
            path: req.path,
            headers: req.headers
        });

    next();
});
