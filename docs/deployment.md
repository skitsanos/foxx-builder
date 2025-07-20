# Foxx Microservice Deployment

There are several ways to deploy Foxx microservices to ArangoDB. This document outlines the available methods for local development, testing, and production deployments.

## Deployment Options

### 1. Local Development with Taskfile (Recommended)

For local development, use the built-in Taskfile commands that provide a streamlined workflow:

```bash
# Setup ArangoDB Docker container and database
task docker-db-setup

# Deploy your service
task deploy-docker

# Run API tests
task test

# List installed services
task list-services

# Create database backup
task docker-db-backup

# Restore database from backup  
task docker-db-restore
```

The Taskfile commands use `foxx-cli` internally for reliable deployments and handle all the container networking and authentication automatically.

### 2. Production Deployment with GitHub Actions

For production deployments, the project includes GitHub Actions workflows:

- **Automatic Deployment**: Push git tags (e.g., `v1.0.0`) to trigger production deployment
- **Manual Deployment**: Use the workflow dispatch feature for staging deployments
- **Health Checks**: Automatic service health verification after deployment

Configure deployment secrets in your GitHub repository:
```
ARANGO_HOST=https://your-arangodb-server.com
ARANGO_DATABASE=your_database_name  
ARANGO_USERNAME=your_deployment_user
ARANGO_PASSWORD=your_deployment_password
```

### 3. Using foxx-cli Directly

For manual deployments, use the standard foxx-cli tool:

```bash
# Register your ArangoDB server
foxx server set dev http://dev:sandbox@localhost:8529

# Install the service
foxx install /api . --server dev --database dev

# Replace an existing service
foxx replace /api . --server dev --database dev

# Uninstall a service
foxx uninstall /api --server dev --database dev
```

### 4. Using the Custom Deployment Tool

The `foxx-builder` includes a deployment tool to simplify deployment without `foxx-cli`:

Located in the `tools` folder, `deploy.js` provides a simple way to deploy Foxx services:

```bash
# Show help
node tools/deploy.js --help

# Install a new service
node tools/deploy.js install -H http://localhost:8529 -d mydb -u root -p secret -m /api

# Replace an existing service
node tools/deploy.js replace -m /api

# Uninstall a service
node tools/deploy.js uninstall -m /api

# List all installed services
node tools/deploy.js list
```

The tool works in both Node.js and Bun environments without any modifications.

### 2. ArangoDB Web Interface

You can deploy Foxx services directly through the ArangoDB web interface:

1. Package your service into a zip file (you can use `zip -r service.zip . -x "node_modules/*" ".git/*"`)
2. Log in to the ArangoDB web interface
3. Go to the Services tab
4. Click "Install Service"
5. Upload the zip file and specify the mount point

### 3. Direct HTTP API

ArangoDB provides a REST API for managing Foxx services. You can use this to upload and deploy your Foxx service using any HTTP client:

```javascript
async function deployFoxxService(arangoURL, dbName, mountPoint, zipPath, username, password) {
  const formData = new FormData();
  formData.append('service', fs.createReadStream(zipPath));
  
  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  
  const response = await fetch(
    `${arangoURL}/_db/${dbName}/_api/foxx/service?mount=${encodeURIComponent(mountPoint)}`,
    {
      method: 'POST',
      headers: {
        'Authorization': authHeader
      },
      body: formData
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to deploy service: ${response.statusText}`);
  }
  
  return await response.json();
}
```

### 4. Docker-based Deployment

If you're using Docker, you can automate the deployment process when your container starts:

1. Add a script that packages and deploys your service
2. Run this script when the container starts

## Deployment Tool Commands and Options

The deployment tool (`deploy.js`) uses Commander for command-line argument parsing, providing a cleaner, more intuitive interface:

### Global Options

These options apply to all commands:

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--host <url>` | `-H` | ArangoDB server URL | http://localhost:8529 |
| `--database <name>` | `-d` | Database name | _system |
| `--username <user>` | `-u` | Username for authentication | root |
| `--password <pass>` | `-p` | Password for authentication | |
| `--quiet` | `-q` | Suppress informational output | false |

### Commands

#### `install` - Install a new service

```bash
node tools/deploy.js install [options]
```

Additional options:

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--mount-point <path>` | `-m` | Mount point for the service | /api |
| `--service-dir <dir>` | `-s` | Directory containing the service | current directory |
| `--zip-file <file>` | `-z` | Use existing zip file instead of creating one | |

#### `replace` - Replace an existing service

```bash
node tools/deploy.js replace [options]
```

Additional options:

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--mount-point <path>` | `-m` | Mount point for the service | /api |
| `--service-dir <dir>` | `-s` | Directory containing the service | current directory |
| `--zip-file <file>` | `-z` | Use existing zip file instead of creating one | |

#### `uninstall` - Uninstall a service

```bash
node tools/deploy.js uninstall [options]
```

Additional options:

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--mount-point <path>` | `-m` | Mount point for the service | /api |

#### `list` - List all installed services

```bash
node tools/deploy.js list [options]
```

No additional options.

## Dependencies

The deployment tool requires the following dependencies:

- `commander`: For command-line argument parsing
- `archiver`: For creating zip archives of your service (required unless you're using the `--zip-file` option)
- `form-data`: For Node.js versions prior to 18, to handle multipart form data

> **Note**: The latest versions of these dependencies require Node.js 18 or newer. If you're using an older Node.js version, you may need to install specific older versions of these packages.

You can install these with:

```bash
npm install commander@^13.1.0 archiver@^7.0.1 form-data@^4.0.2 --save-dev
```

## Using the Deployment Tool in Docker

When running in Docker, you can use the deployment tool directly:

```yaml
# In your docker-compose.yml
version: '3'
services:
  arangodb:
    image: arangodb:latest
    ports:
      - "8529:8529"
    environment:
      - ARANGO_ROOT_PASSWORD=rootpassword
    volumes:
      - ./:/app/service
    command: >
      sh -c "
        arangod --server.authentication=true &
        sleep 10
        cd /app/service
        node tools/deploy.js install -p rootpassword
        tail -f /dev/null
      "
```

## Automation with npm/yarn scripts

For convenience, you can use the script commands defined in `package.json`:

```bash
# Install a new service
npm run deploy -- -d mydb -u root -p secret

# Replace an existing service
npm run replace -- -d mydb -u root -p secret

# Uninstall a service
npm run uninstall -- -d mydb -u root -p secret

# List all installed services
npm run list-services -- -d mydb -u root -p secret
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Ensure you're using the correct username and password
   - Check that the user has permissions to manage services

2. **Zip File Creation Issues**:
   - Ensure you have `archiver` installed: `npm install archiver --save-dev`
   - For manual zipping, exclude large folders like `node_modules` and `.git`

3. **Permission Denied**:
   - Make the deployment script executable: `chmod +x tools/deploy.js`

4. **Service Already Exists**:
   - Use the `replace` command instead of `install` if the service is already mounted

5. **FormData Issues in Older Node.js Versions**:
   - For Node.js versions prior to 18, ensure you have `form-data` installed: `npm install form-data --save-dev`

### Getting Help

For more detailed information on ArangoDB's service API, refer to:
- [ArangoDB Foxx HTTP API Documentation](https://www.arangodb.com/docs/stable/http/foxx.html)

For help with the deployment tool, use the built-in help:

```bash
node tools/deploy.js --help
node tools/deploy.js install --help
```
