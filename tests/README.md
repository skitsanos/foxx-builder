# Tests for FoxxBuilder

This directory contains tests for the FoxxBuilder components.

## Structure

- `builder/` - Tests for the core FoxxBuilder components
  - `index-test.js` - Tests for the main FoxxBuilder module
  - (more tests will be added as components are refactored)

## Running Tests

These tests are designed to be run in the ArangoDB environment, as they depend on ArangoDB-specific modules and APIs.

To run the tests:

1. Start an ArangoDB server
2. Deploy the Foxx service
3. Execute the test files from within the ArangoDB environment

## Writing Tests

When writing tests:

1. Create separate test files for each component
2. Use descriptive names that indicate what is being tested
3. Organize tests in logical groups
4. Include both positive and negative test cases
5. Mock external dependencies when necessary
