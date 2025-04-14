# Configuration Manager

The Configuration Manager provides a centralized way to access and validate configuration settings for Foxx services. It loads configuration from the manifest.json file, validates it according to the schema, and provides a clean API for accessing configuration values.

## Features

- **Validation**: Ensures configuration values meet expected formats and constraints
- **Default Values**: Provides sensible defaults when configuration values are missing
- **Type Conversion**: Converts configuration values to appropriate types
- **Grouping**: Organizes related configuration values into logical groups
- **Documentation**: Generates documentation from the configuration schema

## Usage

### Basic Usage

```javascript
// Get the configuration manager
const getConfig = require('../builder/config');
const config = getConfig(module.context);

// Get a configuration value
const jwtSecret = config.get('jwtSecret');
const sessionTtl = config.getNumber('sessionTtl');
const debugMode = config.getBoolean('debugMode');
```

### Configuration Groups

```javascript
// Get all authentication-related configuration
const authConfig = config.getGroup('auth');
console.log(authConfig.jwtSecret);
console.log(authConfig.sessionTtl);
console.log(authConfig.useTokenExpiration);

// Get all database-related configuration
const dbConfig = config.getGroup('database');
console.log(dbConfig.useCache);
console.log(dbConfig.cacheTtl);
```

### Feature Flags

```javascript
// Check if a feature is enabled
if (config.isEnabled('useRefreshTokens')) {
    // Implement refresh token functionality
}
```

### Typed Access

```javascript
// String values
const apiKey = config.getString('apiKey', '');

// Numeric values
const timeout = config.getNumber('timeout', 30000);

// Boolean values
const enableCache = config.getBoolean('enableCache', false);

// JSON values
const allowedOrigins = config.getJSON('allowedOrigins', []);
```

### Documentation Generation

```javascript
// Generate markdown documentation for configuration
const docs = config.generateDocs();
console.log(docs);
```

## Defining Configuration

Configuration is defined in the manifest.json file:

```json
"configuration": {
  "jwtSecret": {
    "type": "string",
    "default": "SuperSecretWord",
    "description": "Secret key for JWT token generation"
  },
  "sessionTtl": {
    "default": 3600,
    "type": "integer",
    "description": "Session lifetime in seconds"
  },
  "useTokenExpiration": {
    "default": true,
    "type": "boolean",
    "description": "Whether tokens should expire"
  }
}
```

## Supported Types

- **string**: String values
- **integer**: Integer values
- **number**: Numeric values (both integer and floating point)
- **boolean**: Boolean values
- **json**: JSON values (objects, arrays, etc.)

## API Reference

### Core Methods

- **get(key, defaultValue)**: Get a configuration value
- **getString(key, defaultValue)**: Get a string value
- **getNumber(key, defaultValue)**: Get a numeric value
- **getBoolean(key, defaultValue)**: Get a boolean value
- **getJSON(key, defaultValue)**: Get a JSON value
- **getGroup(groupName)**: Get a configuration group
- **isEnabled(feature)**: Check if a feature is enabled
- **getAll()**: Get all configuration
- **generateDocs()**: Generate documentation

### Configuration Groups

- **auth**: Authentication settings
- **database**: Database settings
- **logging**: Logging settings
- **api**: API settings
- **integration**: External integration settings
