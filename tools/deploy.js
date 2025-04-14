#!/usr/bin/env node
/**
 * Foxx Service Deployment Tool
 * A simple tool to deploy Foxx microservices without foxx-cli
 * Works in both Node.js and Bun environments
 * 
 * Usage:
 * node deploy.js install|replace|uninstall [options]
 */

const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');
const { program } = require('commander');
const packageJson = require('../package.json');

// Define the program version based on the package.json version
program.version(packageJson.version);

// Default configuration
const defaults = {
    host: 'http://localhost:8529',
    database: '_system',
    username: 'root',
    password: '',
    mountPoint: '/api',
    serviceDir: '.',
    quiet: false
};

// Log function that respects the quiet flag
function log(...messages) {
    if (!program.opts().quiet) {
        console.log(...messages);
    }
}

// Error handling
function handleError(error) {
    if (error.response) {
        console.error('Server Error:', error.response.statusText);
        console.error(error.response.data);
    } else {
        console.error('Error:', error.message);
    }
    process.exit(1);
}

// Create a zip file of the service
async function createServiceZip(serviceDir, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            log(`Creating service archive from ${serviceDir}...`);
            
            // Check if service directory exists
            if (!fs.existsSync(serviceDir)) {
                reject(new Error(`Service directory ${serviceDir} does not exist`));
                return;
            }

            // Require archiver for zipping
            let archiver;
            try {
                archiver = require('archiver');
            } catch (e) {
                reject(new Error('Package "archiver" is required for creating zip files. Please install it using "npm install archiver" or run with an existing zip file using --zipFile option.'));
                return;
            }

            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            output.on('close', () => {
                log(`Service archive created: ${outputPath} (${archive.pointer()} bytes)`);
                resolve(outputPath);
            });
            
            archive.on('error', (err) => {
                reject(err);
            });
            
            archive.pipe(output);
            
            // Add all files, excluding node_modules, .git and other common exclusions
            archive.glob('**/*', {
                cwd: serviceDir,
                ignore: [
                    'node_modules/**', 
                    '.git/**', 
                    '.backup/**',
                    '.idea/**',
                    '.circleci/**',
                    '.github/**',
                    '.netlify/**',
                    '*.zip'
                ]
            });
            
            archive.finalize();
        } catch (err) {
            reject(err);
        }
    });
}

// Helper function to create FormData
async function createFormData(zipPath) {
    // Check if we're in Node.js environment
    let formData;
    
    try {
        // Try to use the FormData from Node.js fetch API (Node 18+)
        formData = new FormData();
        formData.append('service', createReadStream(zipPath));
        return formData;
    } catch (e) {
        // If global FormData is not available, try to use form-data package
        try {
            const FormData = require('form-data');
            formData = new FormData();
            formData.append('service', createReadStream(zipPath));
            return formData;
        } catch (err) {
            throw new Error('Unable to create FormData. For Node.js versions prior to 18, please install the "form-data" package.');
        }
    }
}

// Install a service
async function installService(options) {
    const { host, database, username, password, mountPoint, zipPath } = options;
    
    log(`Installing service at mount point ${mountPoint}...`);
    
    try {
        const formData = await createFormData(zipPath);
        const hasGetHeaders = typeof formData.getHeaders === 'function';
        
        const url = `${host}/_db/${database}/_api/foxx/service?mount=${encodeURIComponent(mountPoint)}`;
        const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        
        const headers = {
            'Authorization': authHeader
        };
        
        // Add form headers if available (from form-data package)
        if (hasGetHeaders) {
            Object.assign(headers, formData.getHeaders());
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            const error = new Error(`ArangoDB API responded with status ${response.status}`);
            error.response = {
                statusText: response.statusText,
                data: responseData
            };
            throw error;
        }
        
        log('Service installed successfully!');
        return responseData;
    } catch (error) {
        handleError(error);
    }
}

// Replace an existing service
async function replaceService(options) {
    const { host, database, username, password, mountPoint, zipPath } = options;
    
    log(`Replacing service at mount point ${mountPoint}...`);
    
    try {
        const formData = await createFormData(zipPath);
        const hasGetHeaders = typeof formData.getHeaders === 'function';
        
        const url = `${host}/_db/${database}/_api/foxx/service/${encodeURIComponent(mountPoint)}`;
        const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        
        const headers = {
            'Authorization': authHeader
        };
        
        // Add form headers if available (from form-data package)
        if (hasGetHeaders) {
            Object.assign(headers, formData.getHeaders());
        }
        
        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: formData
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            const error = new Error(`ArangoDB API responded with status ${response.status}`);
            error.response = {
                statusText: response.statusText,
                data: responseData
            };
            throw error;
        }
        
        log('Service replaced successfully!');
        return responseData;
    } catch (error) {
        handleError(error);
    }
}

// Uninstall a service
async function uninstallService(options) {
    const { host, database, username, password, mountPoint } = options;
    
    log(`Uninstalling service from mount point ${mountPoint}...`);
    
    try {
        const response = await fetch(
            `${host}/_db/${database}/_api/foxx/service/${encodeURIComponent(mountPoint)}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
                }
            }
        );
        
        const responseData = await response.json();
        
        if (!response.ok) {
            const error = new Error(`ArangoDB API responded with status ${response.status}`);
            error.response = {
                statusText: response.statusText,
                data: responseData
            };
            throw error;
        }
        
        log('Service uninstalled successfully!');
        return responseData;
    } catch (error) {
        handleError(error);
    }
}

// List all installed services
async function listServices(options) {
    const { host, database, username, password } = options;
    
    log('Listing installed services...');
    
    try {
        const response = await fetch(
            `${host}/_db/${database}/_api/foxx`,
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
                }
            }
        );
        
        const responseData = await response.json();
        
        if (!response.ok) {
            const error = new Error(`ArangoDB API responded with status ${response.status}`);
            error.response = {
                statusText: response.statusText,
                data: responseData
            };
            throw error;
        }
        
        log('Services:');
        responseData.forEach(service => {
            console.log(`- ${service.mount}: ${service.name} (${service.version})`);
        });
        
        return responseData;
    } catch (error) {
        handleError(error);
    }
}

// Command-line interface setup
program
    .name('deploy')
    .description('A tool for deploying Foxx microservices to ArangoDB')
    .option('-H, --host <url>', 'ArangoDB server URL', defaults.host)
    .option('-d, --database <name>', 'Database name', defaults.database)
    .option('-u, --username <user>', 'Username for authentication', defaults.username)
    .option('-p, --password <pass>', 'Password for authentication', defaults.password)
    .option('-q, --quiet', 'Suppress informational output', defaults.quiet);

// Install command
program
    .command('install')
    .description('Install a new Foxx service')
    .option('-m, --mount-point <path>', 'Mount point for the service', defaults.mountPoint)
    .option('-s, --service-dir <dir>', 'Directory containing the service', defaults.serviceDir)
    .option('-z, --zip-file <file>', 'Use existing zip file instead of creating one')
    .action(async (cmdOptions) => {
        try {
            const options = { ...program.opts(), ...cmdOptions };
            let zipPath;
            
            // Use provided zip file or create one
            if (options.zipFile) {
                zipPath = options.zipFile;
                
                if (!fs.existsSync(zipPath)) {
                    throw new Error(`Zip file ${zipPath} does not exist`);
                }
            } else {
                const tempZipPath = path.join(__dirname, `foxx-service-${Date.now()}.zip`);
                zipPath = await createServiceZip(options.serviceDir, tempZipPath);
            }
            
            await installService({ ...options, zipPath });
            
            // Clean up temporary zip file if we created it
            if (!options.zipFile && fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
                log(`Temporary zip file ${zipPath} removed`);
            }
        } catch (error) {
            handleError(error);
        }
    });

// Replace command
program
    .command('replace')
    .description('Replace an existing Foxx service')
    .option('-m, --mount-point <path>', 'Mount point for the service', defaults.mountPoint)
    .option('-s, --service-dir <dir>', 'Directory containing the service', defaults.serviceDir)
    .option('-z, --zip-file <file>', 'Use existing zip file instead of creating one')
    .action(async (cmdOptions) => {
        try {
            const options = { ...program.opts(), ...cmdOptions };
            let zipPath;
            
            // Use provided zip file or create one
            if (options.zipFile) {
                zipPath = options.zipFile;
                
                if (!fs.existsSync(zipPath)) {
                    throw new Error(`Zip file ${zipPath} does not exist`);
                }
            } else {
                const tempZipPath = path.join(__dirname, `foxx-service-${Date.now()}.zip`);
                zipPath = await createServiceZip(options.serviceDir, tempZipPath);
            }
            
            await replaceService({ ...options, zipPath });
            
            // Clean up temporary zip file if we created it
            if (!options.zipFile && fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
                log(`Temporary zip file ${zipPath} removed`);
            }
        } catch (error) {
            handleError(error);
        }
    });

// Uninstall command
program
    .command('uninstall')
    .description('Uninstall a Foxx service')
    .option('-m, --mount-point <path>', 'Mount point for the service', defaults.mountPoint)
    .action(async (cmdOptions) => {
        try {
            const options = { ...program.opts(), ...cmdOptions };
            await uninstallService(options);
        } catch (error) {
            handleError(error);
        }
    });

// List command
program
    .command('list')
    .description('List all installed Foxx services')
    .action(async () => {
        try {
            const options = program.opts();
            await listServices(options);
        } catch (error) {
            handleError(error);
        }
    });

// Parse command line arguments
program.parse();
