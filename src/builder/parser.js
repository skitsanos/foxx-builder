/**
 * Extracts the value from a string
 * @param {string} value
 * @returns {number|string|boolean}
 */
const extractValue = value =>
{
    // Trim the value to remove leading/trailing whitespace
    value = value.trim();

    // Check if the value is a boolean string
    if (value.toLowerCase() === 'true' || value.toLowerCase() === '!false')
    {
        return true;
    }
    if (value.toLowerCase() === 'false' || value.toLowerCase() === '!true')
    {
        return false;
    }

    // Check if the value is a numeric string
    const numberValue = parseFloat(value);
    if (!Number.isNaN(numberValue) && isFinite(value))
    {
        return numberValue;
    }

    // Otherwise, return the original string
    return value;
};

module.exports = {
    extractValue
};