const builder = require('./builder/index');
builder.init();


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
