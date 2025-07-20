/**
 * Email Task Examples for Foxx Builder Scheduler
 * 
 * Email tasks use the scheduler service to send emails at specific times or intervals.
 * They integrate with the email service for reliable delivery and error handling.
 */

const scheduler = require('../../src/builder/scheduler');

// Example: Daily newsletter
function scheduleDailyNewsletter() {
    return scheduler.createTask({
        name: 'daily-newsletter',
        description: 'Send daily newsletter to subscribers',
        type: 'email',
        schedule: '0 8 * * *',           // Every day at 8:00 AM
        recurring: true,
        maxRetries: 3,
        retryDelay: 300000,              // 5 minutes between retries
        params: {
            to: 'subscribers@example.com',
            subject: 'Daily Newsletter - {{date}}',
            html: `
                <h1>Daily Newsletter</h1>
                <p>Here's what's happening today...</p>
                <p>Date: {{date}}</p>
            `,
            provider: 'resend'
        }
    });
}

// Example: Weekly report email
function scheduleWeeklyReport() {
    return scheduler.createTask({
        name: 'weekly-analytics-report',
        description: 'Weekly analytics report email',
        type: 'email',
        schedule: '0 9 * * 1',           // Every Monday at 9:00 AM
        recurring: true,
        maxRetries: 2,
        params: {
            to: ['admin@example.com', 'analytics@example.com'],
            subject: 'Weekly Analytics Report',
            html: `
                <h2>Weekly Analytics Report</h2>
                <p>Please find attached the weekly analytics report.</p>
                <ul>
                    <li>Total users: {{totalUsers}}</li>
                    <li>New signups: {{newSignups}}</li>
                    <li>Active sessions: {{activeSessions}}</li>
                </ul>
            `,
            attachments: [
                {
                    filename: 'analytics-report.pdf',
                    path: '/tmp/reports/analytics-weekly.pdf'
                }
            ]
        }
    });
}

// Example: Welcome email for new users (triggered)
function scheduleWelcomeEmail(userId, userEmail, userName) {
    return scheduler.createTask({
        name: `welcome-email-${userId}`,
        description: `Welcome email for user ${userId}`,
        type: 'email',
        schedule: 'now',                 // Send immediately
        recurring: false,
        maxRetries: 3,
        retryDelay: 60000,              // 1 minute between retries
        params: {
            to: userEmail,
            subject: `Welcome to our platform, ${userName}!`,
            html: `
                <h1>Welcome ${userName}!</h1>
                <p>Thank you for joining our platform. Here's how to get started:</p>
                <ol>
                    <li>Complete your profile</li>
                    <li>Explore our features</li>
                    <li>Join our community</li>
                </ol>
                <p>If you have any questions, feel free to reach out!</p>
                <a href="https://example.com/getting-started">Get Started</a>
            `,
            provider: 'resend'
        }
    });
}

// Example: Password reset reminder
function schedulePasswordResetReminder(userId, email, resetToken) {
    return scheduler.createTask({
        name: `password-reset-${userId}`,
        description: `Password reset reminder for user ${userId}`,
        type: 'email',
        schedule: 'now',
        recurring: false,
        maxRetries: 2,
        params: {
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h2>Password Reset Request</h2>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="https://example.com/reset-password?token=${resetToken}">
                    Reset Password
                </a>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request this reset, please ignore this email.</p>
            `,
            provider: 'resend'
        }
    });
}

// Example: Monthly billing notification
function scheduleMonthlyBilling() {
    return scheduler.createTask({
        name: 'monthly-billing-notification',
        description: 'Monthly billing notification to customers',
        type: 'email',
        schedule: '0 10 1 * *',          // 1st day of month at 10:00 AM
        recurring: true,
        maxRetries: 3,
        retryDelay: 600000,              // 10 minutes between retries
        params: {
            to: 'customers@example.com',
            subject: 'Monthly Billing Statement',
            html: `
                <h2>Monthly Billing Statement</h2>
                <p>Your monthly billing statement is ready.</p>
                <table>
                    <tr><td>Account:</td><td>{{accountId}}</td></tr>
                    <tr><td>Period:</td><td>{{billingPeriod}}</td></tr>
                    <tr><td>Amount:</td><td>{{amount}}</td></tr>
                </table>
                <p>Payment will be processed on {{paymentDate}}.</p>
            `,
            attachments: [
                {
                    filename: 'billing-statement.pdf',
                    content: '{{billPdfContent}}',
                    contentType: 'application/pdf'
                }
            ]
        }
    });
}

// Example: Event reminder series
function scheduleEventReminders(eventId, eventDate, attendeeEmails) {
    const tasks = [];
    
    // 7 days before event
    tasks.push(scheduler.createTask({
        name: `event-reminder-7d-${eventId}`,
        description: `7-day reminder for event ${eventId}`,
        type: 'email',
        schedule: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        recurring: false,
        params: {
            to: attendeeEmails,
            subject: 'Event Reminder - 7 Days',
            html: `
                <h2>Event Reminder</h2>
                <p>Don't forget! Your event is in 7 days.</p>
                <p><strong>Event Date:</strong> {{eventDate}}</p>
                <p><strong>Location:</strong> {{eventLocation}}</p>
            `
        }
    }));
    
    // 1 day before event
    tasks.push(scheduler.createTask({
        name: `event-reminder-1d-${eventId}`,
        description: `1-day reminder for event ${eventId}`,
        type: 'email',
        schedule: new Date(eventDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        recurring: false,
        params: {
            to: attendeeEmails,
            subject: 'Event Reminder - Tomorrow!',
            html: `
                <h2>Event Tomorrow!</h2>
                <p>Your event is tomorrow. We're excited to see you!</p>
                <p><strong>Event Date:</strong> {{eventDate}}</p>
                <p><strong>Time:</strong> {{eventTime}}</p>
                <p><strong>Location:</strong> {{eventLocation}}</p>
            `
        }
    }));
    
    return tasks;
}

// Example: Subscription renewal reminder
function scheduleSubscriptionRenewal(subscriptionId, renewalDate, userEmail) {
    return scheduler.createTask({
        name: `subscription-renewal-${subscriptionId}`,
        description: `Subscription renewal reminder for ${subscriptionId}`,
        type: 'email',
        schedule: new Date(renewalDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        recurring: false,
        maxRetries: 2,
        params: {
            to: userEmail,
            subject: 'Subscription Renewal Reminder',
            html: `
                <h2>Subscription Renewal</h2>
                <p>Your subscription will renew in 3 days.</p>
                <p><strong>Renewal Date:</strong> {{renewalDate}}</p>
                <p><strong>Amount:</strong> {{renewalAmount}}</p>
                <p>To manage your subscription, <a href="{{managementUrl}}">click here</a>.</p>
            `,
            provider: 'resend'
        }
    });
}

module.exports = {
    scheduleDailyNewsletter,
    scheduleWeeklyReport,
    scheduleWelcomeEmail,
    schedulePasswordResetReminder,
    scheduleMonthlyBilling,
    scheduleEventReminders,
    scheduleSubscriptionRenewal
};