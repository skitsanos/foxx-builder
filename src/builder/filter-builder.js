const removeSpecialMarks = require('./remove-special-marks');
const {extractValue} = require('./parser');
/**
 * Create a filter for ArangoDB AQL query from a given query tokens
 * @param {String[]} query - Array of query items
 * @param {String=} docVar - Document variable name
 * @param {String[]=} textFields - Array of text fields to search in document
 * @returns {[string[], Object]} - Array of filter items and bind variables
 */
const filterBuilder = (query, docVar = 'doc', textFields = ['name']) =>
{
    const filter = [];
    const bindVars = {};

    const queriesWithoutMeta = query.filter((q) => !q.includes(':'));
    const queriesWithMeta = query.filter((q) => q.includes(':'));

    const queriesWithMetaSplit = queriesWithMeta.map((q) => q.split(':'));

    const queriesThatIncludes = queriesWithoutMeta.filter((q) => !q.startsWith('!'));
    for (const item in queriesThatIncludes)
    {

        const bindVarInclude = `bindVarInclude${item}`;
        const bindVarIncludeValue = `%${queriesThatIncludes[item]}%`;

        for (const textField of textFields)
        {
            filter.push(`LIKE(${docVar}.${textField}, @bindVarInclude${item}, true)`);
        }

        if (item < queriesThatIncludes.length - 1)
        {
            filter.push('AND');
        }

        bindVars[bindVarInclude] = removeSpecialMarks(bindVarIncludeValue, ['!', '"', '\'']);
    }

    const queriesThatExcludes = queriesWithoutMeta.filter((q) => q.startsWith('!'));
    for (const item in queriesThatExcludes)
    {

        const bindVarExclude = `bindVarExclude${item}`;
        const bindVarExcludeValue = `%${queriesThatExcludes[item]}%`;

        if (queriesThatIncludes.length > 0)
        {
            filter.push('AND');
        }

        for (const textField of textFields)
        {
            filter.push(`NOT LIKE(${docVar}.${textField}, @bindVarExclude${item}, true)`);
        }

        if (bindVarExcludeValue.startsWith('!'))
        {
            bindVars[bindVarExclude] = removeSpecialMarks(bindVarExcludeValue, ['!', '"', '\'']);
        }
        else
        {
            bindVars[bindVarExclude] = bindVarExcludeValue;
        }
    }

    if (queriesWithMetaSplit.length > 0)
    {
        filter.push('AND');

        for (const item in queriesWithMetaSplit)
        {
            const [meta, value] = queriesWithMetaSplit[item];

            const bindVarMeta = `bindVarMeta${item}`;

            if (value.startsWith('!'))
            {
                filter.push(`${docVar}.${meta} != @bindVarMeta${item}`);
            }
            else
            {
                filter.push(`${docVar}.${meta} == @bindVarMeta${item}`);
            }
            if (item < queriesWithMetaSplit.length - 1)
            {
                filter.push('AND');
            }

            bindVars[bindVarMeta] = extractValue(removeSpecialMarks(value, ['!', '"', '\'']));
        }
    }

    //-------------------------------------------------------------------------------------//
    if (filter.length > 0 && filter[0] === 'AND')
    {
        filter.shift();
    }

    return [filter.join(' '), bindVars];
};

module.exports = filterBuilder;