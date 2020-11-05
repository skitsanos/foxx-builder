const builder = require('./builder/index');
builder.init();

const sessions = require('./sessions/index');
sessions.allowedResources = [
    ...sessions.allowedResources,
    '/echo',
    /\/examples(\/.*)?/gi,
    /\/users(\/.*)?/gi
];

sessions.init();

/**
 * Run Google Analytics on each API endpoint request
 */
/*
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
 });*/

module.context.use((req, res, next) =>
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
});
