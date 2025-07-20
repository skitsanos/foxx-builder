# Email Service

The Email Service provides a flexible email sending capability for Foxx Builder applications. It supports multiple email providers with a unified API, making it easy to integrate email functionality into your applications.

## Features

- **Multiple Provider Support**: Use different email providers with a unified API
- **Default Provider**: Configure a default provider for all email sending operations
- **Rich Email Options**: Support for all common email features (attachments, CC, BCC, etc.)
- **Integration with Scheduler**: Send emails via the scheduler using email tasks

## Configuration

The email service is configured in the manifest.json file:

```json
"emailProviders": {
  "type": "json",
  "default": {
    "default": "resend",  // Default provider name
    "resend": {
      "apiKey": "re_...",  // Your Resend API key
      "defaultFrom": "Foxx Builder <noreply@example.com>"  // Default sender
    }
    // Additional providers can be configured here
  },
  "description": "Email provider configurations"
},
"emailEnabled": {
  "default": false,
  "type": "boolean",
  "description": "Whether to enable email sending functionality"
}
```

## Supported Providers

### Resend

[Resend](https://resend.com) is a developer-friendly email service. To use Resend:

1. Sign up for an account at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Configure the API key in your manifest.json

## Basic Usage

```javascript
const emailService = require('../builder/email');

// Initialize with context
emailService.init(context);

// Send an email
const result = emailService.send({
  to: 'recipient@example.com',
  subject: 'Hello from Foxx Builder',
  html: '<h1>Hello!</h1><p>This is an example email.</p>',
  text: 'Hello! This is an example email.'
});

console.log(`Email sent with message ID: ${result.messageId}`);
```

## API Reference

### `init(context)`

Initialize the email service.

Parameters:
- `context` - Foxx service context

Returns:
- The email service instance

### `getDefaultProvider()`

Get the default email provider configuration.

Returns:
- Provider configuration object with `name` and `config` properties

### `getProvider(providerName)`

Get a specific email provider configuration.

Parameters:
- `providerName` - Name of the provider (optional, uses default if not specified)

Returns:
- Provider configuration object with `name` and `config` properties

### `send(options)`

Send an email using the specified or default provider.

Parameters:
- `options` - Email options object:
  - `to` - (Required) Recipient email address(es) (string or array)
  - `subject` - (Required) Email subject
  - `text` - Plain text content (required if html not provided)
  - `html` - HTML content (required if text not provided)
  - `from` - Sender email address (uses default if not specified)
  - `cc` - Carbon copy recipients (string or array)
  - `bcc` - Blind carbon copy recipients (string or array)
  - `replyTo` - Reply-to email address
  - `attachments` - Email attachments array (provider-specific format)
  - `provider` - Provider name to use (uses default if not specified)

Returns:
- Result object with provider-specific information

## Using with Scheduler

The email service integrates with the Scheduler service, allowing you to send emails on a schedule:

```javascript
const scheduler = require('../builder/scheduler');

// Create an email task
scheduler.createTask({
  name: 'daily-report',
  description: 'Send daily report email',
  type: 'email',
  params: {
    to: 'team@example.com',
    subject: 'Daily Report',
    html: '<h1>Daily Report</h1><p>Your daily report content here</p>'
  },
  schedule: '0 8 * * *', // Daily at 8:00 AM
  recurring: true
});
```

See the [Scheduler documentation](../scheduler/README.md) for more details on creating and managing email tasks.

## Error Handling

Email sending operations can fail for various reasons (invalid email addresses, server issues, etc.). Always wrap email sending operations in try/catch blocks:

```javascript
try {
  const result = emailService.send({
    to: 'recipient@example.com',
    subject: 'Test Email',
    text: 'This is a test email.'
  });
  console.log('Email sent successfully');
} catch (error) {
  console.error(`Failed to send email: ${error.message}`);
}
```
