const { db } = require('@arangodb');

// Initialize configuration
const getConfig = require('./builder/config');
const config = getConfig(module.context);

// Load scheduler
const scheduler = require('./builder/scheduler');

console.log('Initializing Foxx service...');

// Define collections and indexes
const collections = [
    {
        name: 'users',
        index: [
            {
                type: 'hash',
                unique: true,
                fields: ['username']
            }
        ]
    },
    {
        name: 'userActivities',
        index: [
            {
                type: 'hash',
                fields: ['userId']
            },
            {
                type: 'skiplist',
                fields: ['timestamp']
            }
        ]
    },
    {
        name: 'roles',
        index: [
            {
                type: 'hash',
                unique: true,
                fields: ['name']
            }
        ]
    },
    {
        name: 'audit',
        index: [
            {
                type: 'hash',
                fields: ['action']
            },
            {
                type: 'skiplist',
                fields: ['timestamp']
            },
            {
                type: 'hash',
                fields: ['targetId']
            }
        ]
    },
    {
        name: 'scheduledTasks',
        index: [
            {
                type: 'hash',
                fields: ['name']
            },
            {
                type: 'skiplist',
                fields: ['nextRun']
            },
            {
                type: 'hash',
                fields: ['status']
            }
        ]
    },
    'Authors',
    'Articles'
];

// Process collections
console.log('Setting up collections...');
for (const col of collections) {
    if (typeof col === 'string' && !db._collection(col)) {
        console.log(`Creating collection: ${col}`);
        db._createDocumentCollection(col);
    }

    if (typeof col !== 'string') {
        const { name, index } = col;

        // Create collection if not exists
        if (!db._collection(name)) {
            console.log(`Creating collection: ${name}`);
            db._createDocumentCollection(name);
        }

        const { name: indexName = `index_${name}` } = index;

        // Drop all indexes except primary
        for (const ndx of db._collection(name).getIndexes()) {
            const { type } = ndx;
            if (type !== 'primary') {
                console.log(`Dropping index: ${ndx.name || 'unnamed'} on ${name}`);
                db._collection(name).dropIndex(ndx);
            }
        }

        // Create indexes if not exists
        if (index && Array.isArray(index)) {
            for (const ndx of index) {
                const { name: currentIndexName } = ndx;
                if (!currentIndexName) {
                    ndx.name = indexName;
                }
                console.log(`Creating index: ${ndx.name} on ${name}`);
                db._collection(name).ensureIndex(ndx);
            }
        }
    }
}

// Log configuration summary
console.log('Configuration initialized:');
const authConfig = config.getGroup('auth');
console.log(`- Auth enabled: ${config.getBoolean('useAuth', false)}`);
console.log(`- Token expiration: ${authConfig.useTokenExpiration}`);
console.log(`- Refresh tokens: ${authConfig.useRefreshTokens}`);

// Create default roles if roles collection is empty
const rolesCollection = db._collection('roles');
if (rolesCollection.count() === 0) {
    console.log('Creating default roles...');
    
    // Create admin role
    const adminRole = rolesCollection.save({
        name: 'admin',
        description: 'Administrator with full system access',
        permissions: [
            'users:read', 'users:write', 'users:delete',
            'roles:read', 'roles:write', 'roles:delete',
            'system:read', 'system:write'
        ],
        isSystem: true,
        createdAt: new Date().getTime()
    });
    console.log(`Created admin role with key ${adminRole._key}`);
    
    // Create user role
    const userRole = rolesCollection.save({
        name: 'user',
        description: 'Standard user with basic permissions',
        permissions: [
            'profile:read', 'profile:write',
            'content:read'
        ],
        isSystem: true,
        createdAt: new Date().getTime()
    });
    console.log(`Created user role with key ${userRole._key}`);
    
    // Create guest role
    const guestRole = rolesCollection.save({
        name: 'guest',
        description: 'Limited access for unauthenticated users',
        permissions: [
            'content:read'
        ],
        isSystem: true,
        createdAt: new Date().getTime()
    });
    console.log(`Created guest role with key ${guestRole._key}`);
    
    // Create API role
    const apiRole = rolesCollection.save({
        name: 'api',
        description: 'Role for API access and integration',
        permissions: [
            'api:read', 'api:write',
            'content:read', 'content:write'
        ],
        isSystem: true,
        createdAt: new Date().getTime()
    });
    console.log(`Created api role with key ${apiRole._key}`);
    
    // Update existing users to have the user role by default
    const usersCollection = db._collection('users');
    if (usersCollection.count() > 0) {
        const userRoleId = userRole._key;
        const updated = db._query(`
            FOR user IN users
            UPDATE user WITH { 
                roles: APPEND(user.roles || [], "${userRoleId}") 
            } IN users
            RETURN 1
        `).toArray().length;
        
        console.log(`Updated ${updated} existing users with default user role`);
    }
}

// Initialize scheduler service
console.log('Initializing scheduler service...');
try {
    // Check if required collections exist
    if (!db._collection('scheduledTasks')) {
        console.error('scheduledTasks collection not found. Scheduler initialization failed.');
    } else {
        scheduler.init(module.context);
        console.log('Scheduler service initialized successfully');

        // Activate any tasks that should be running
        const count = db._query(`
            FOR task IN scheduledTasks
            FILTER task.status IN ['active', 'retry-scheduled']
            UPDATE task WITH { updatedAt: ${new Date().getTime()} } IN scheduledTasks
            RETURN 1
        `).toArray().length;
        console.log(`Activated ${count} scheduled tasks`);
    }
} catch (error) {
    console.error(`Error initializing scheduler service: ${error.message}`);
}

console.log('Setup completed successfully');
