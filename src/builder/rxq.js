/**
 * rxQuery, Experimental Query Builder that produces AQL Filter
 *
 * Details are on https://github.com/skitsanos/foxx-builder/wiki/rxQuery
 *
 * @version 1.0.20230112
 * @author skitsanos
 */


const {aql} = require('@arangodb');
const joi = require('joi');

const rx = /(((?<logic>\w+)\s)?(?<key>\w+))(?<operation>[=~?><])(?<value>"?[^\s]*"?)/gui;
const collectFilters = q => [...q.matchAll(rx)].map(el => el.groups);

const preProcessFilters = (f, doc = 'doc') =>
{
    return f.map(filter =>
    {
        const {logic, key, operation, value} = filter;

        let _value = null;

        switch (true)
        {
            case (value.toLowerCase() === 'true' || value.toLowerCase() === 'false'):
                //only logic operations allowed on booleans
                if (!['=', '~'].includes(operation))
                {
                    return {};
                }

                _value = value === 'true';
                break;

            case (value.toString().length === 0):
                _value = null;
                break;

            case (!isNaN(value) && value.toString().length !== 0):
                _value = Number(value);
                break;

            case (isNaN(value) && value.toString().length !== 0):
                _value = value.replace(/(?<=")$|^(?=")/gi, '');
                break;

            default:
                return {};
        }

        return {
            logic,
            operation,
            key: `${doc}.${key}`,
            value: _value
        };
    });
};

/**
 * rxQuery
 * @param {string} qs Query string
 * @param {string} doc query variable name that is used for document in 'FOR doc IN colllection'
 * @returns {*}
 */
const rxq = (qs, doc = 'doc') =>
{
    const queryString = decodeURI(qs);

    const filters = collectFilters(queryString);
    const query = preProcessFilters(filters, doc);

    if (query.length === 1)
    {
        delete query[0].logic;
    }

    const filterSchema = joi.array().required().items(joi.object({
        logic: joi.string().valid('', 'AND', 'OR').default(''),
        key: joi.string().required(),
        operation: joi.string().valid('=', '~', '>', '<', '?').default('='),
        value: joi.any()
    }));

    const validation = filterSchema.validate(query);
    if (validation.error)
    {
        throw validation.error;
    }

    if (query.length === 0)
    {
        return aql.literal(' ');
    }

    const parts = [
        aql` `
    ];

    for (const el of query)
    {
        const {key, value, operation, logic} = el;

        let queryLogic = '';
        if (logic && logic.toUpperCase() === 'AND')
        {
            queryLogic = '&&';
        }

        if (logic && logic.toUpperCase() === 'OR')
        {
            queryLogic = '||';
        }

        parts.push(aql.literal(queryLogic));

        switch (operation)
        {
            case '~':
                parts.push(aql.literal(key));
                parts.push(aql` != ${value}`);
                break;

            case '>':
                parts.push(aql.literal(key));
                parts.push(aql` > ${value}`);
                break;

            case '<':
                parts.push(aql.literal(key));
                parts.push(aql` < ${value}`);
                break;

            case '?':
                parts.push(aql.literal(`LIKE(${key},`));
                const opValue = `%${value}%`;
                parts.push(aql`${opValue}, true)`);
                break;

            default:
                parts.push(aql.literal(key));
                parts.push(aql` == ${value}`);
                break;
        }
    }

    const queryFilter = [
        aql` filter`,
        ...parts
    ];

    return aql.join(queryFilter, ' ');
};

module.exports = rxq;