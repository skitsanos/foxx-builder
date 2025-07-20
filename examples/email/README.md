# Email Service Examples

The Foxx Builder email service provides reliable email delivery with support for multiple providers and comprehensive features:

- **Multiple Providers**: Resend (default), SMTP, and more
- **Template Support**: HTML templates with variable substitution
- **Attachments**: File attachments and inline content
- **Error Handling**: Automatic retries and delivery tracking
- **Bulk Sending**: Efficient batch email processing

## Directory Structure

- `basic-sending.js`: Simple email sending examples
- `templates.js`: HTML templates and variable substitution
- `attachments.js`: File attachments and inline content
- `bulk-emails.js`: Batch processing and mailing lists
- `transactional.js`: Order confirmations, receipts, notifications
- `newsletters.js`: Marketing emails and campaigns

## Configuration

Email service configuration in `manifest.json`:

```json
{
  "configuration": {
    "emailProvider": {
      "type": "string",
      "default": "resend",
      "description": "Email service provider"
    },
    "emailApiKey": {
      "type": "string",
      "required": true,
      "description": "Email service API key"
    },
    "emailFromAddress": {
      "type": "string",
      "default": "noreply@example.com",
      "description": "Default sender address"
    }
  }
}
```

## Getting Started

```javascript
const emailService = require('../../src/builder/email');

// Initialize email service
emailService.init(module.context);

// Send basic email
const result = emailService.send({
    to: 'user@example.com',
    subject: 'Welcome!',
    html: '<h1>Welcome to our service!</h1>'
});
```

## Best Practices

- Use HTML templates for consistent branding
- Implement proper error handling and retries
- Validate email addresses before sending
- Use appropriate subject lines to avoid spam filters
- Include both HTML and text versions when possible
- Monitor delivery rates and bounce handling