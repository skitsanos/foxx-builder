/**
 * Remove special marks from string
 * @param {String} value
 * @param {String[]} marks
 */
const removeSpecialMarks = (value, marks) =>
{
    let result = value;

    if (Array.isArray(marks))
    {
        for (const mark of marks)
        {
            const rx = new RegExp(`[${mark}]`, 'igu');
            result = result.replace(rx, '');
        }
    }

    return result;
};

module.exports = removeSpecialMarks;
