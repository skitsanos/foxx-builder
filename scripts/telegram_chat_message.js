const request = require('@arangodb/request');

const {argv} = module.context;

const token = module.context.configuration.telegramToken;

request.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    json: true,
    body: argv[0]
});

module.exports = true;