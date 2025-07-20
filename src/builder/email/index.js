/**
 * Email Service for Foxx Builder
 * 
 * Provides email sending capabilities with multiple provider support.
 * Currently supports:
 * - Resend
 * 
 * @module builder/email
 * @version 1.0.0
 * @author skitsanos
 */

const request = require('@arangodb/request');
const { errors } = require('@arangodb');

/**
 * Email service implementation
 */
const emailService = {
    /**
     * Context reference
     */
    context: null,
    
    /**
     * Configuration
     */
    config: null,
    
    /**
     * Initialize the email service
     * 
     * @param {Object} context - Foxx module context
     * @returns {Object} - Email service instance
     */
    init(context) {
        if (!context) {
            throw new Error('Context is required for email service initialization');
        }
        
        this.context = context;
        this.config = context.configuration;
        
        // Check if email is enabled
        if (!this.config.emailEnabled) {
            console.warn('Email service is disabled in configuration');
        }
        
        // Check if email providers are configured
        if (!this.config.emailProviders) {
            console.warn('No email providers configured');
        }
        
        return this;
    },
    
    /**
     * Get the default email provider configuration
     * 
     * @returns {Object} - Default provider configuration
     */
    getDefaultProvider() {
        const providers = this.config.emailProviders;
        
        if (!providers) {
            throw new Error('No email providers configured');
        }
        
        const defaultProvider = providers.default;
        
        if (!defaultProvider || !providers[defaultProvider]) {
            throw new Error('Default email provider not configured');
        }
        
        return {
            name: defaultProvider,
            config: providers[defaultProvider]
        };
    },
    
    /**
     * Get a specific email provider configuration
     * 
     * @param {string} providerName - Provider name
     * @returns {Object} - Provider configuration
     */
    getProvider(providerName) {
        const providers = this.config.emailProviders;
        
        if (!providers) {
            throw new Error('No email providers configured');
        }
        
        if (!providerName) {
            return this.getDefaultProvider();
        }
        
        if (!providers[providerName]) {
            throw new Error(`Provider "${providerName}" not configured`);
        }
        
        return {
            name: providerName,
            config: providers[providerName]
        };
    },
    
    /**
     * Send an email using the specified provider
     * 
     * @param {Object} options - Email options
     * @param {string} options.to - Recipient email address or array of addresses
     * @param {string} options.from - Sender email address (optional, uses default if not provided)
     * @param {string} options.subject - Email subject
     * @param {string} options.text - Plain text content
     * @param {string} options.html - HTML content
     * @param {string} options.provider - Provider to use (optional, uses default if not provided)
     * @returns {Object} - Result of the email sending operation
     */
    send(options) {
        // Check if email is enabled
        if (!this.config.emailEnabled) {
            throw new Error('Email service is disabled in configuration');
        }
        
        // Validate required fields
        if (!options.to) {
            throw new Error('Recipient (to) is required');
        }
        
        if (!options.subject) {
            throw new Error('Subject is required');
        }
        
        if (!options.text && !options.html) {
            throw new Error('Either text or html content is required');
        }
        
        // Get provider
        const provider = this.getProvider(options.provider);
        
        // Send email using the appropriate provider
        switch (provider.name) {
            case 'resend':
                return this.sendWithResend(options, provider.config);
                
            default:
                throw new Error(`Unsupported provider: ${provider.name}`);
        }
    },
    
    /**
     * Send an email using Resend
     * 
     * @param {Object} options - Email options
     * @param {Object} providerConfig - Provider configuration
     * @returns {Object} - Result of the email sending operation
     */
    sendWithResend(options, providerConfig) {
        try {
            // Validate provider configuration
            if (!providerConfig.apiKey) {
                throw new Error('Resend API key is not configured');
            }
            
            // Prepare recipient(s)
            const to = Array.isArray(options.to) ? options.to : [options.to];
            
            // Prepare sender
            const from = options.from || providerConfig.defaultFrom;
            if (!from) {
                throw new Error('Sender (from) is not specified and no default is configured');
            }
            
            // Prepare request
            const requestBody = {
                from: from,
                to: to,
                subject: options.subject,
                text: options.text,
                html: options.html
            };
            
            // Add optional fields if present
            if (options.cc) {
                requestBody.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
            }
            
            if (options.bcc) {
                requestBody.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
            }
            
            if (options.replyTo) {
                requestBody.reply_to = options.replyTo;
            }
            
            // Add attachments if present
            if (options.attachments && Array.isArray(options.attachments)) {
                requestBody.attachments = options.attachments;
            }
            
            // Send the request to Resend API
            const response = request({
                method: 'POST',
                url: 'https://api.resend.com/emails',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${providerConfig.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
            
            // Check response status
            if (response.status >= 200 && response.status < 300) {
                // Parse response body
                const responseBody = JSON.parse(response.body);
                
                return {
                    success: true,
                    provider: 'resend',
                    messageId: responseBody.id,
                    response: responseBody
                };
            } else {
                // Parse error response
                let errorMessage = 'Unknown error';
                try {
                    const errorBody = JSON.parse(response.body);
                    errorMessage = errorBody.message || errorBody.error || 'Unknown error';
                } catch (parseError) {
                    errorMessage = response.body || 'Unknown error';
                }
                
                throw new Error(`Resend API error (${response.status}): ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error sending email with Resend:', error.message);
            throw error;
        }
    }
};

module.exports = emailService;
