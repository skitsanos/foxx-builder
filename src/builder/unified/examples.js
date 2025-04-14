/**
 * Examples of how to use the unified query builder
 * 
 * NOTE: This is a demonstration file and not meant to be executed directly.
 * The examples show how to use the unified query builder in your code.
 */

const { 
    buildQuery, 
    rxQuery, 
    filterBuilder, 
    structuredBuilder 
} = require('./index');

/**
 * Example 1: String-based query (rxq style)
 */
function stringQueryExample() {
    // Simple string query
    const query1 = buildQuery('name=John', 'user');
    console.log(query1.toString()); // FILTER user.name == "John"
    
    // Complex string query with logic
    const query2 = buildQuery('name=John AND age>30', 'user');
    console.log(query2.toString()); // FILTER user.name == "John" && user.age > 30
    
    // Using LIKE operator
    const query3 = buildQuery('name?Jo', 'user');
    console.log(query3.toString()); // FILTER LIKE(user.name, "%Jo%", true)
}

/**
 * Example 2: Array-based query (filter-builder style)
 */
function arrayQueryExample() {
    // Simple array query
    const [filter1, bindVars1] = filterBuilder(['name:John'], 'user');
    console.log(filter1); // user.name == @bindVarMeta0
    console.log(bindVars1); // { bindVarMeta0: "John" }
    
    // Query with exclusion
    const [filter2, bindVars2] = filterBuilder(['!inactive'], 'user', ['status']);
    console.log(filter2); // NOT LIKE(user.status, @bindVarExclude0, true)
    console.log(bindVars2); // { bindVarExclude0: "%!inactive%" }
}

/**
 * Example 3: Structured object-based query (new style)
 */
function structuredQueryExample() {
    // Simple structured query
    const query1 = structuredBuilder([
        { key: 'name', operation: '==', value: 'John' }
    ], 'user');
    console.log(query1.toString()); // FILTER user.name == "John"
    
    // Complex structured query with logic
    const query2 = structuredBuilder([
        { key: 'name', operation: '==', value: 'John' },
        { key: 'age', operation: '>', value: 30, logic: 'AND' },
        { key: 'isActive', operation: '==', value: true, logic: 'OR' }
    ], 'user');
    console.log(query2.toString()); // FILTER user.name == "John" && user.age > 30 || user.isActive == true
}

/**
 * Example 4: Backward compatibility with rxQuery
 */
function rxQueryCompatExample() {
    const query = rxQuery('name=John AND age>30', 'user');
    console.log(query.toString()); // FILTER user.name == "John" && user.age > 30
}

/**
 * Example 5: Advanced usage with combined types
 */
function advancedExample() {
    // Using multiple fields with LIKE operator
    const query1 = structuredBuilder([
        { key: 'name', operation: 'LIKE', value: 'Jo' },
        { key: 'email', operation: 'LIKE', value: 'jo', logic: 'OR' }
    ], 'user');
    console.log(query1.toString()); // FILTER LIKE(user.name, "%Jo%", true) || LIKE(user.email, "%jo%", true)
    
    // Complex date and numeric filtering
    const query2 = structuredBuilder([
        { key: 'createdAt', operation: '>', value: new Date('2023-01-01').getTime() },
        { key: 'status', operation: '==', value: 'active', logic: 'AND' },
        { key: 'score', operation: '>', value: 80, logic: 'AND' }
    ], 'user');
    console.log(query2.toString()); // FILTER user.createdAt > 1672531200000 && user.status == "active" && user.score > 80
}

// These functions are for demonstration only and are not meant to be executed
// in this file. Use them as reference for your own code.
module.exports = {
    stringQueryExample,
    arrayQueryExample,
    structuredQueryExample,
    rxQueryCompatExample,
    advancedExample
};
