const builder = require('./builder/index');
builder.init();

const sessions = require('./sessions/index');
//sessions.allowedResources = [...sessions.allowedResources, '/echo'];
sessions.init();