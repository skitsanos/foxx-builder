# User Preferences

Foxx Builder includes a flexible user preferences system that allows storing and retrieving user-specific settings such as UI themes, language preferences, notification settings, and application-specific configurations.

## Overview

The preferences system is designed to be:

- **Flexible**: Store any type of preference data (strings, numbers, booleans, objects, arrays)
- **Hierarchical**: Organize preferences in a structured way
- **Per-user**: Each user has their own isolated preferences
- **API-driven**: Simple REST endpoints for reading and updating preferences
- **Defaulted**: System provides sensible defaults for missing preferences

## Core Features

### Preference Storage

User preferences are stored as a JSON object within the user document, allowing for:

- Efficient storage and retrieval
- Flexible schema that can evolve over time
- No additional collections required

### Default Values

The system provides sensible defaults for common preferences:

```javascript
{
  "theme": "light",
  "language": "en",
  "notifications": true,
  "timezone": "UTC",
  "dateFormat": "MM/DD/YYYY",
  "timeFormat": "12h"
}
```

### Supported Preference Types

The preferences system supports storing:

- **Simple values**: Strings, numbers, booleans
- **Complex objects**: Nested JSON structures
- **Arrays**: Ordered lists of values

## API Endpoints

### Get All Preferences

**GET /profile/preferences**

Retrieves all preferences for the current user, merging with system defaults.

**Response:**
```json
{
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": true,
    "timezone": "America/New_York",
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "12h"
  },
  "meta": {
    "execTime": 0.015
  }
}
```

### Update Multiple Preferences

**PUT /profile/preferences**

Updates multiple preferences in a single request.

**Request:**
```json
{
  "theme": "dark",
  "language": "fr",
  "notifications": false
}
```

**Response:**
```json
{
  "preferences": {
    "theme": "dark",
    "language": "fr",
    "notifications": false,
    "timezone": "America/New_York",
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "12h"
  },
  "meta": {
    "message": "Preferences updated successfully",
    "execTime": 0.025
  }
}
```

### Update Single Preference

**PUT /profile/preferences/:key**

Updates a single preference value.

**Path Parameters:**
- `key`: The preference key to update

**Request Body:** The new value (can be any JSON type)

**Example:**
```
PUT /profile/preferences/theme
"dark"
```

**Response:**
```json
{
  "key": "theme",
  "value": "dark",
  "meta": {
    "message": "Preference 'theme' updated successfully",
    "execTime": 0.018
  }
}
```

### Delete Preference

**DELETE /profile/preferences/:key**

Removes a specific preference, reverting to the system default.

**Path Parameters:**
- `key`: The preference key to delete

**Response:**
```json
{
  "key": "theme",
  "meta": {
    "message": "Preference 'theme' deleted successfully",
    "execTime": 0.014
  }
}
```

## Common Preference Categories

### User Interface

```json
{
  "theme": "light",          // "light", "dark", "system", "auto"
  "fontScale": 1.0,          // Scale factor for text (0.8 to 1.5)
  "reducedMotion": false,    // Reduce UI animations
  "highContrast": false,     // High contrast mode
  "sidebarCollapsed": false, // UI sidebar state
  "dashboardLayout": {       // Custom dashboard configuration
    "widgets": [
      {"id": "recent", "position": "top-left", "size": "large"},
      {"id": "stats", "position": "top-right", "size": "medium"}
    ]
  }
}
```

### Localization

```json
{
  "language": "en",           // UI language code
  "timezone": "UTC",          // User's timezone
  "dateFormat": "MM/DD/YYYY", // Preferred date format
  "timeFormat": "12h",        // "12h" or "24h"
  "currency": "USD",          // Preferred currency
  "numberFormat": {
    "decimalSeparator": ".",
    "thousandSeparator": ","
  }
}
```

### Notifications

```json
{
  "notifications": {
    "enabled": true,
    "email": true,
    "push": false,
    "frequency": "immediate", // "immediate", "daily", "weekly"
    "types": {
      "system": true,
      "security": true,
      "updates": false,
      "marketing": false
    }
  }
}
```

## Implementation Details

### Storage

Preferences are stored in the `preferences` field of the user document in the `users` collection. This field contains a JSON object with preference key-value pairs.

### Security

All preference endpoints require authentication and only allow users to access their own preferences.

### Auditing

Changes to preferences are recorded in the audit log, including:
- Which preference was changed
- When it was changed
- Who made the change

## Best Practices

1. **Use dot notation** for hierarchical preferences (e.g., `notifications.email`)
2. **Validate values** on the client side before saving
3. **Respect user preferences** throughout the application
4. **Provide sensible defaults** for all preferences
5. **Cache preferences** client-side for better performance

## Examples

### Setting Theme and Language Preferences

```javascript
// PUT /profile/preferences
{
  "theme": "dark",
  "language": "fr"
}
```

### Storing Complex Dashboard Layout

```javascript
// PUT /profile/preferences/dashboardLayout
{
  "layout": "grid",
  "columns": 3,
  "widgets": [
    {"id": "calendar", "position": 1, "size": "large"},
    {"id": "tasks", "position": 2, "size": "medium"},
    {"id": "notifications", "position": 3, "size": "small"}
  ]
}
```

### Updating Notification Settings

```javascript
// PUT /profile/preferences/notifications
{
  "enabled": true,
  "channels": {
    "email": true,
    "push": false,
    "in-app": true
  },
  "types": {
    "system": true,
    "security": true,
    "updates": false
  }
}
```
