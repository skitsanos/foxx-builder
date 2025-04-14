/**
 * Root request handler
 * ArangoDB Foxx Microservices Handler
 * @author skitsanos, https://github.com/skitsanos
 * @version 1.0.20201019
 */

// Reference the type definitions from the types directory
/** @typedef {import('../../types').EndpointHandler} EndpointHandler */
/** @typedef {import('../../types').EndpointRequest} EndpointRequest */
/** @typedef {import('../../types').EndpointResponse} EndpointResponse */

/**
 * Home endpoint handler
 * 
 * @type {EndpointHandler}
 */
module.exports = {
    contentType: 'application/json',
    name: 'home',
    
    /**
     * Handle the root request
     * 
     * @param {EndpointRequest} req - The request object
     * @param {EndpointResponse} res - The response object
     */
    handler: (req, res) => {
        const { manifest } = module.context;

        res.send({
            info: {
                name: manifest.name,
                version: manifest.version
            }
        });
    }
};