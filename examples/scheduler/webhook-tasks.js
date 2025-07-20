/**
 * Webhook Task Examples for Foxx Builder Scheduler
 * 
 * Webhook tasks make HTTP requests to external services on a schedule.
 * Perfect for API synchronization, notifications, and third-party integrations.
 */

const scheduler = require('../../src/builder/scheduler');

// Example: Daily data sync with external API
function scheduleDailyApiSync() {
    return scheduler.createTask({
        name: 'daily-api-sync',
        description: 'Sync data with external CRM system',
        type: 'webhook',
        schedule: '0 2 * * *',           // Every day at 2:00 AM
        recurring: true,
        maxRetries: 3,
        retryDelay: 300000,              // 5 minutes between retries
        params: {
            url: 'https://api.crm-system.com/sync',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer {{apiToken}}',
                'Content-Type': 'application/json',
                'X-API-Version': '2.0'
            },
            body: {
                lastSync: '{{lastSyncTimestamp}}',
                includeDeleted: true,
                batchSize: 100
            },
            timeout: 30000,              // 30 second timeout
            followRedirect: true
        }
    });
}

// Example: Hourly health check notification
function scheduleHealthCheckNotification() {
    return scheduler.createTask({
        name: 'health-check-notification',
        description: 'Send health status to monitoring service',
        type: 'webhook',
        schedule: '0 * * * *',           // Every hour
        recurring: true,
        maxRetries: 2,
        params: {
            url: 'https://monitoring.example.com/api/health',
            method: 'POST',
            headers: {
                'X-API-Key': '{{monitoringApiKey}}',
                'Content-Type': 'application/json'
            },
            body: {
                service: 'foxx-builder-api',
                timestamp: '{{timestamp}}',
                status: 'healthy',
                version: '{{version}}',
                metrics: {
                    uptime: '{{uptime}}',
                    memory: '{{memoryUsage}}',
                    cpu: '{{cpuUsage}}'
                }
            }
        }
    });
}

// Example: Weekly analytics webhook
function scheduleWeeklyAnalytics() {
    return scheduler.createTask({
        name: 'weekly-analytics-webhook',
        description: 'Send weekly analytics to dashboard service',
        type: 'webhook',
        schedule: '0 8 * * 1',           // Every Monday at 8:00 AM
        recurring: true,
        maxRetries: 3,
        retryDelay: 600000,              // 10 minutes between retries
        params: {
            url: 'https://analytics.example.com/api/weekly-report',
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer {{analyticsToken}}',
                'Content-Type': 'application/json'
            },
            body: {
                reportPeriod: {
                    start: '{{weekStart}}',
                    end: '{{weekEnd}}'
                },
                metrics: {
                    totalUsers: '{{totalUsers}}',
                    newSignups: '{{newSignups}}',
                    activeUsers: '{{activeUsers}}',
                    revenue: '{{weeklyRevenue}}'
                }
            }
        }
    });
}

// Example: Slack notification for system events
function scheduleSlackNotification(message, channel = '#alerts') {
    return scheduler.createTask({
        name: `slack-notification-${Date.now()}`,
        description: 'Send notification to Slack channel',
        type: 'webhook',
        schedule: 'now',                 // Send immediately
        recurring: false,
        maxRetries: 2,
        params: {
            url: 'https://hooks.slack.com/services/{{slackWebhookPath}}',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                channel: channel,
                username: 'Foxx Builder Bot',
                icon_emoji: ':robot_face:',
                text: message,
                attachments: [
                    {
                        color: 'warning',
                        fields: [
                            {
                                title: 'Service',
                                value: 'Foxx Builder API',
                                short: true
                            },
                            {
                                title: 'Timestamp',
                                value: new Date().toISOString(),
                                short: true
                            }
                        ]
                    }
                ]
            }
        }
    });
}

// Example: GitHub webhook for deployment notifications
function scheduleGitHubWebhook(deploymentStatus, commitSha) {
    return scheduler.createTask({
        name: `github-deployment-${commitSha}`,
        description: 'Update GitHub deployment status',
        type: 'webhook',
        schedule: 'now',
        recurring: false,
        maxRetries: 3,
        params: {
            url: `https://api.github.com/repos/{{owner}}/{{repo}}/deployments/{{deploymentId}}/statuses`,
            method: 'POST',
            headers: {
                'Authorization': 'token {{githubToken}}',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: {
                state: deploymentStatus,        // 'success', 'failure', 'pending'
                description: `Deployment ${deploymentStatus}`,
                environment: 'production',
                auto_inactive: true
            }
        }
    });
}

// Example: Customer notification webhook
function scheduleCustomerNotification(customerId, notificationType) {
    return scheduler.createTask({
        name: `customer-notification-${customerId}`,
        description: `Send ${notificationType} notification to customer ${customerId}`,
        type: 'webhook',
        schedule: 'now',
        recurring: false,
        maxRetries: 2,
        retryDelay: 120000,              // 2 minutes between retries
        params: {
            url: 'https://notifications.example.com/api/send',
            method: 'POST',
            headers: {
                'X-API-Key': '{{notificationApiKey}}',
                'Content-Type': 'application/json'
            },
            body: {
                customerId: customerId,
                type: notificationType,
                timestamp: new Date().toISOString(),
                payload: {
                    message: '{{notificationMessage}}',
                    actionUrl: '{{actionUrl}}',
                    priority: 'normal'
                }
            }
        }
    });
}

// Example: Payment processor webhook
function schedulePaymentWebhook(orderId, amount, currency = 'USD') {
    return scheduler.createTask({
        name: `payment-webhook-${orderId}`,
        description: `Process payment webhook for order ${orderId}`,
        type: 'webhook',
        schedule: 'now',
        recurring: false,
        maxRetries: 5,                   // High retry count for payments
        retryDelay: 30000,               // 30 seconds between retries
        params: {
            url: 'https://payment-processor.example.com/api/webhooks/charge',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer {{paymentApiKey}}',
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `${orderId}-${Date.now()}`
            },
            body: {
                orderId: orderId,
                amount: amount,
                currency: currency,
                description: `Payment for order ${orderId}`,
                metadata: {
                    source: 'foxx-builder-api',
                    timestamp: new Date().toISOString()
                }
            },
            timeout: 60000               // 60 second timeout for payments
        }
    });
}

// Example: API rate limit status check
function scheduleRateLimitCheck() {
    return scheduler.createTask({
        name: 'api-rate-limit-check',
        description: 'Check API rate limits with external services',
        type: 'webhook',
        schedule: '*/15 * * * *',        // Every 15 minutes
        recurring: true,
        maxRetries: 1,
        params: {
            url: 'https://api.external-service.com/rate-limit-status',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer {{externalApiToken}}',
                'Accept': 'application/json'
            },
            timeout: 10000
        }
    });
}

module.exports = {
    scheduleDailyApiSync,
    scheduleHealthCheckNotification,
    scheduleWeeklyAnalytics,
    scheduleSlackNotification,
    scheduleGitHubWebhook,
    scheduleCustomerNotification,
    schedulePaymentWebhook,
    scheduleRateLimitCheck
};