/**
 * Google Analytics Measuring Task
 * @version 1.0
 * @author skitsanos
 */

const request = require('@arangodb/request');
const crypto = require('@arangodb/crypto');

/**
 *
 * @param clientId
 * @param path
 * @param headers
 * @param mount
 * @returns {boolean}
 */
const task = ({clientId, path, headers, context}) =>
{
    const {googleAnalyticsId} = context.configuration;

    if (Boolean(googleAnalyticsId))
    {
        //https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters

        const params = {
            v: '1',
            an: 'Foxx Microservices',
            aid: 'com.skitsanos.apps.foxx-builder',
            tid: googleAnalyticsId, //The measurement ID / web property ID
            cid: clientId || crypto.uuidv4(),
            t: 'pageview',
            ni: 1,
            dp: `${context.mount}${path}`,
            dt: `${context.mount}${path}`, //document title
            ds: 'api', //data source
            cm: 'organic',
            de: 'UTF-8', //document encoding
            ua: headers['user-agent'],
            uip: headers['client-ip'] || headers['remoteAddress']
        };

        if (headers['x-country'])
        {
            params.geoid = headers['x-country'];
        }

        console.log(params);
        request({
            method: 'get',
            url: 'https://www.google-analytics.com/collect',
            qs: params
        });

        return true;
    }

    return false;
};

module.exports = task;