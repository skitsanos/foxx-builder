# Enhanced User Management

Foxx Builder provides a comprehensive user management system that goes beyond basic authentication. It includes role-based access control, user profiles, activity tracking, and detailed audit logs.

## Core Features

### Role-Based Access Control (RBAC)

Control access to your API endpoints with a flexible role-based permission system:

- **Multiple Roles per User**: Users can have multiple roles, each with their own set of permissions
- **Granular Permissions**: Assign specific permissions to roles (e.g., `users:read`, `content:write`)
- **System Roles**: Built-in system roles (`admin`, `user`, `guest`, `api`) that cannot be deleted
- **Custom Roles**: Create your own roles for specific use cases
- **Permission Inheritance**: Users inherit all permissions from their assigned roles

### User Accounts and Profiles

Complete user account management including:

- **Registration**: Secure user registration with validation
- **Authentication**: Login with username or email
- **Profile Management**: Users can update their profile information
- **Password Management**: Secure password updates with verification
- **Avatar Support**: Integration with Gravatar for user profile images
- **Preferences**: Flexible user preferences system for storing personalization options

### User Preferences

Store and manage user-specific settings with a flexible preferences system:

- **UI Preferences**: Theme, language, accessibility options
- **Notifications**: Configure notification channels and frequency
- **Custom Settings**: Application-specific configuration and personalization
- **Defaults**: System-provided default values for all preferences

[Learn more about User Preferences](./user-preferences.md)

### Activity Tracking and Auditing

Monitor and track user activities for security and analytics:

- **Login/Logout Tracking**: Record all authentication events
- **Activity History**: View user activity timeline
- **Audit Logs**: Comprehensive audit logs for security-sensitive operations
- **User Statistics**: Track user engagement metrics

## API Endpoints

### Role Management (Admin Only)

- **GET /roles**: List all available roles
- **POST /roles**: Create a new role
- **GET /roles/:id**: Get details for a specific role
- **PUT /roles/:id**: Update a role's attributes
- **DELETE /roles/:id**: Delete a role if not in use

### User Management

- **GET /users**: List users (admin sees all details, users see limited info)
- **POST /signup**: Create a new user account
- **POST /login**: Authenticate and get JWT token
- **POST /logout**: Record logout event
- **GET /users/:id**: Get user details (with permission checks)
- **GET /users/:id/roles**: Get roles for a specific user
- **PUT /users/:id/roles**: Update roles for a user (admin only)
- **GET /users/:id/activities**: View activity history for a user

### Profile Management

- **GET /profile**: Get current user's profile
- **PUT /profile**: Update user's own profile information
- **GET /profile/preferences**: Get user preferences
- **PUT /profile/preferences**: Update multiple preferences
- **PUT /profile/preferences/:key**: Update a single preference
- **DELETE /profile/preferences/:key**: Delete a specific preference

## Pagination and Limits

All list endpoints include proper pagination with built-in limits:

- Maximum of 100 records per page
- Default limit of 25 records per page
- Skip parameter for offset-based pagination
- Total count for client-side pagination controls

## Security Features

The enhanced user management system includes several security features:

- **Password Hashing**: Secure password storage using SHA-384
- **JWT Token Authentication**: Secure, stateless authentication
- **Role Verification**: Automatic role checks for protected endpoints
- **Account Status**: Support for different account states (active, locked, pending)
- **Activity Monitoring**: Track and alert on suspicious activities
- **Audit Trails**: Complete audit logs for security-relevant actions

## Database Schema

### Collections

- **users**: Stores user accounts and profile information
- **roles**: Defines available roles and their permissions
- **userActivities**: Tracks user actions chronologically
- **audit**: Records security-relevant events

## Usage Examples

### Assigning Roles to a User

```javascript
// PUT /users/123456/roles
{
  "roles": ["admin", "user"],
  "reason": "Promoting user to administrator"
}
```

### User Registration with Profile Data

```javascript
// POST /signup
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "secure-password",
  "firstName": "John",
  "lastName": "Doe",
  "acceptTerms": true
}
```

### Filtering Users by Role

```
GET /users?role=admin&limit=50
```

### Updating User Profile

```javascript
// PUT /profile
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "currentPassword": "old-password",
  "newPassword": "new-secure-password",
  "confirmPassword": "new-secure-password",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

## Best Practices

1. **Always use HTTPS** to protect authentication credentials and tokens
2. **Assign minimal required permissions** to roles following the principle of least privilege
3. **Use precise pagination parameters** to avoid loading too many records at once
4. **Regularly review audit logs** for suspicious activities
5. **Create custom roles** for specific business needs instead of using admin for everything
