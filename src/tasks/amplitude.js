/**
 * Amplitude Event Logger Task
 *
 * @version 1.020201105
 * @author Skitsanos
 */

const request = require('@arangodb/request');
const crypto = require('@arangodb/crypto');

const task = ({userId = '(anonymous)', authorized = false, path, headers, events = [], context}) =>
{
    const geo = {};
    if (headers['x-country'])
    {
        geo.country = headers['x-country'];
    }

    const payload = {
        api_key: '68f5dccaddd91742239eba74dda780cc',
        events: [
            {
                user_id: userId,
                ip: headers['client-ip'] || headers['x-real-ip'] || headers['remoteAddress'] || '127.0.0.1',
                ...geo,
                event_type: 'dev.api',
                event_properties: {
                    path,
                    action: 'call',
                    timestamp: new Date().getTime()
                },
                user_properties: {
                    authorized
                }
            },
            ...events.map(el => ({
                user_id: userId,
                ip: headers['client-ip'] || headers['x-real-ip'] || headers['remoteAddress'] || '127.0.0.1',
                ...geo,
                event_type: el.type,
                event_properties: {...el.properties},
                user_properties: {
                    authorized
                }
            }))
        ]
    };

    request({
        method: 'POST',
        url: 'https://api.amplitude.com/2/httpapi',
        json: true,
        body: payload
    });
};

module.exports = task;