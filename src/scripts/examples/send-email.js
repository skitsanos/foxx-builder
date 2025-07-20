/**
 * Example script for sending an email directly using the email service
 * 
 * Usage:
 * - Use this when you need to send an email directly from your code
 * - For scheduled emails, use the scheduler with 'email' task type
 * 
 * @param {Object} params - Parameters passed to the script
 * @param {Object} context - Execution context
 * @author skitsanos
 */
 
const emailService = require('../../builder/email');

module.exports = function(params, context) {
    try {
        // Initialize email service with context if not already initialized
        emailService.init(context);
        
        // Send an email
        const result = emailService.send({
            to: params.to || 'recipient@example.com',
            subject: params.subject || 'Example Email',
            html: params.html || '<h1>Hello!</h1><p>This is an example email sent from Foxx Builder.</p>',
            text: params.text || 'Hello! This is an example email sent from Foxx Builder.',
            from: params.from, // Optional, uses default if not specified
            cc: params.cc,     // Optional
            bcc: params.bcc,   // Optional
            replyTo: params.replyTo, // Optional
            provider: params.provider // Optional, uses default if not specified
        });
        
        return {
            success: true,
            messageId: result.messageId,
            provider: result.provider
        };
    } catch (error) {
        console.error('Error sending email:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};
