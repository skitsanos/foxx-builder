const builder = require('./builder/index');
builder.init();

const sessions = require('./sessions/index');
sessions.allowedResources = [
    ...sessions.allowedResources,
    '/echo'
];
sessions.init();

module.context.use((req, res, next) =>
{
    const {runScript} = module.context;
    runScript('telegram_chat_message', {
        chat_id: '-1001171519104',
        text: 'hi there from runScript'
    });

    next();
});