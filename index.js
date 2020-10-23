const builder = require('./builder/index');
builder.init();

const sessions = require('./sessions/index');
sessions.allowedResources = [
    ...sessions.allowedResources,
    '/echo',
    /\/users(\/.*)?/gi
];

sessions.init();

/**
 * Run Google Analytics on each API endpoint request
 */
module.context.use((req, res, next) =>
{
    const {runTask} = module.context;
    runTask(
        'Google Analytics PageView recording',
        'ga',
        {
            clientId: req.headers['x-bb-client-request-uuid'],
            path: req.path,
            headers: req.headers
        });

    next();
});