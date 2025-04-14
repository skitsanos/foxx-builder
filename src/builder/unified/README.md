# Unified Query Builder

The Unified Query Builder is a robust implementation for creating AQL queries. It supports multiple query formats, provides comprehensive validation, and returns consistent results.

## Features

- Support for string-based queries
- Support for array-based queries
- Support for structured object-based queries
- Comprehensive input validation
- Detailed error messages
- Consistent output format

## Usage

The main function is `buildQuery`, which accepts input in various formats and produces a consistent AQL query output.

### String Format

```javascript
const { buildQuery } = require('./unified');

// Using string-based query
const query = buildQuery('name=John AND age>30', 'user');
// Results in: FILTER user.name == "John" && user.age > 30
```

### Array Format

```javascript
const { buildQuery } = require('./unified');

// Using array-based query
const query = buildQuery(['name:John', 'age:30'], 'user');
// Results in: FILTER user.name == "John" AND user.age == 30
```

### Structured Object Format

```javascript
const { buildQuery } = require('./unified');

// Using structured object format
const query = buildQuery([
  { key: 'name', operation: '==', value: 'John' },
  { key: 'age', operation: '>', value: 30, logic: 'AND' }
], 'user');
// Results in: FILTER user.name == "John" && user.age > 30
```

## Advanced Usage

### Structured Query Builder

For more complex queries, the structured object format provides the most control:

```javascript
const { structuredBuilder } = require('./unified');

const query = structuredBuilder([
  { key: 'name', operation: 'LIKE', value: 'Jo' },
  { key: 'age', operation: '>', value: 30, logic: 'AND' },
  { key: 'isActive', operation: '==', value: true, logic: 'AND' }
], 'user');
```

### Supported Operations

The unified query builder supports the following operations:

- `==` or `=`: Equality
- `!=` or `~`: Inequality
- `>`: Greater than
- `<`: Less than
- `LIKE` or `?`: String containing (adds % automatically)

### Logic Operators

For structured queries, you can specify the logic between conditions:

- `AND` or `&&`: Logical AND (default)
- `OR` or `||`: Logical OR

### Helper Functions

The unified query builder also provides two helper functions:

- `rxQuery(queryString, docVar)`: For string-based queries
- `filterBuilder(queryArray, docVar, textFields)`: For array-based queries
- `structuredBuilder(filters, docVar)`: For structured object-based queries
