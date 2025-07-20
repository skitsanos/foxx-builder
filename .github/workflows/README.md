# GitHub Workflows

This directory contains GitHub Actions workflows for the foxx-builder project.

## Workflows

### 1. CI/CD Pipeline (`ci.yml`)

**Trigger:** Push to master/main/develop branches, Pull requests to master/main

**Purpose:** Runs comprehensive tests to ensure code quality and functionality

**Steps:**
- Sets up Bun runtime environment
- Installs project dependencies
- Starts ArangoDB service for testing
- Sets up test database and user
- Deploys Foxx service for testing
- Runs API tests using Hurl
- Uploads test results and reports

**Services Used:**
- ArangoDB 3.12 (containerized)
- Bun (JavaScript runtime)
- Hurl (HTTP testing tool)
- Foxx CLI (ArangoDB service deployment)

### 2. Deployment (`deploy.yml`)

**Trigger:** 
- Git tags starting with 'v' (e.g., v1.0.0)
- Manual workflow dispatch with environment selection

**Purpose:** Deploys the Foxx service to staging or production environments

**Steps:**
- Creates a clean deployment package
- Deploys to ArangoDB using the custom deployment tool
- Performs health checks
- Creates GitHub releases for tagged deployments

**Required Secrets:**
- `ARANGO_HOST` - ArangoDB server URL
- `ARANGO_DATABASE` - Target database name
- `ARANGO_USERNAME` - Deployment user credentials
- `ARANGO_PASSWORD` - Deployment user password

### 3. Code Quality (`code-quality.yml`)

**Trigger:** Push to master/main/develop branches, Pull requests to master/main

**Purpose:** Ensures code quality, security, and documentation standards

**Jobs:**
- **Code Checks:** Basic code quality checks (TODO/FIXME, console.log, secrets detection)
- **Security:** Security vulnerability scanning
- **Documentation:** Documentation completeness checks
- **Dependencies:** Dependency health and update checks

**Note:** ESLint has been removed as it's considered outdated technology for this project.

## Setup Instructions

### 1. Configure Repository Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets for deployment:

```
ARANGO_HOST=https://your-arangodb-server.com
ARANGO_DATABASE=your_database_name
ARANGO_USERNAME=your_deployment_user
ARANGO_PASSWORD=your_deployment_password
```

### 2. Configure Environments (Optional)

For enhanced security, set up deployment environments:

1. Go to Settings → Environments
2. Create environments: `staging`, `production`
3. Add protection rules (required reviewers, branch restrictions)
4. Configure environment-specific secrets if needed

### 3. Branch Protection Rules

Recommended branch protection for `master`/`main`:

1. Go to Settings → Branches
2. Add rule for `master`/`main` branch
3. Enable:
   - Require status checks to pass
   - Require branches to be up to date
   - Required status checks: `api-test`, `code-checks`, `security`
   - Require pull request reviews

## Workflow Status Badges

Add status badges to your README.md:

```markdown
![CI/CD Pipeline](https://github.com/your-username/foxx-builder/workflows/CI/CD%20Pipeline/badge.svg)
![Code Quality](https://github.com/your-username/foxx-builder/workflows/Code%20Quality/badge.svg)
```

## Local Development

To run similar checks locally:

```bash
# Install dependencies
bun install

# Run tests (requires local ArangoDB)
# Start ArangoDB first, then:
foxx server set local http://root:password@localhost:8529
foxx install /api . --server local --database _system

# Run API tests
hurl --test --variables-file tests/hurl/.vars tests/hurl/*.hurl
```

## Troubleshooting

### Common Issues

1. **ArangoDB Connection Failed**
   - Check if ArangoDB service is healthy
   - Verify credentials and connection string
   - Ensure database exists

2. **Deployment Failed**
   - Verify all required secrets are set
   - Check ArangoDB server accessibility
   - Ensure deployment user has sufficient permissions

3. **Tests Timeout**
   - ArangoDB may need more time to initialize
   - Increase health check timeout in workflow
   - Check if test data is being properly set up

### Debugging Workflows

1. Enable debug logging by setting repository secret:
   ```
   ACTIONS_STEP_DEBUG=true
   ```

2. Use workflow_dispatch triggers to manually run workflows with custom inputs

3. Check workflow logs in the Actions tab for detailed error messages

## Migration from Circle CI

This setup replaces the previous Circle CI configuration with equivalent functionality:

- ✅ ArangoDB service setup
- ✅ Bun runtime environment
- ✅ Dependency installation
- ✅ Foxx CLI usage
- ✅ Hurl API testing
- ✅ Test result reporting
- ✅ Artifact storage

Additional improvements:
- 🆕 Environment-based deployments
- 🆕 Code quality checks
- 🆕 Security scanning
- 🆕 Documentation validation
- 🆕 Automated releases
- 🆕 Manual deployment triggers