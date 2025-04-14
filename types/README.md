# Type Definitions for Foxx Builder

This directory contains TypeScript declaration files that provide type information for the Foxx Builder framework. These types improve IDE support and documentation without requiring the project to be written in TypeScript.

## How to Use

### In JavaScript Files with JSDoc

You can use these types in your JavaScript files with JSDoc annotations. For example:

```javascript
/**
 * Creates a new user
 * @param {Object} req - The request object
 * @param {EndpointResponse} res - The response object
 */
function createUser(req, res) {
  // Your code here
}
```

### In VS Code or WebStorm

Modern IDEs can use these type definitions for:

1. **Auto-completion**: Suggests properties and methods as you type
2. **Type checking**: Flags potential type errors
3. **Documentation**: Shows parameter types and return values in tooltips

### Referencing Types in JSDoc

For specific types, you can reference them directly:

```javascript
/**
 * @typedef {import('../types').EndpointHandler} EndpointHandler
 */

/**
 * @type {EndpointHandler}
 */
const handler = {
  name: 'Get User',
  handler: (req, res) => {
    // Handler implementation
  }
};
```

## Type Definitions

The type definitions cover the core components of Foxx Builder:

- **ModuleContext**: The extended module.context object
- **AuthContext**: Authentication methods and utilities
- **EndpointRequest/Response**: HTTP request and response objects
- **EndpointHandler**: Route handler definitions
- **Various utility types**: For query building, filtering, etc.

## Extending Types

If you need to add new types or extend existing ones, you can:

1. Modify the `index.d.ts` file directly
2. Create additional `.d.ts` files for specific domains
3. Use module augmentation in your own files:

```typescript
// myTypes.d.ts
declare namespace FoxxBuilder {
  interface ModuleContext {
    // Add your custom properties or methods
    myCustomMethod(): void;
  }
}
```

## Benefits Over JSDoc-Only Approach

- **Better organization**: Types are centralized and easier to maintain
- **More powerful**: Full TypeScript syntax for complex types
- **Better IDE integration**: Better auto-completion and error checking
- **No runtime overhead**: Types are removed during compilation
