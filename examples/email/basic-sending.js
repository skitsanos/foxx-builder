/**
 * Basic Email Sending Examples
 * 
 * Demonstrates fundamental email sending patterns using the Foxx Builder email service.
 */

const emailService = require('../../src/builder/email');

// Initialize email service (typically done in setup.js)
emailService.init(module.context);

// Example: Simple text email
function sendSimpleEmail() {
    try {
        const result = emailService.send({
            to: 'user@example.com',
            subject: 'Simple Text Email',
            text: 'This is a simple text email sent from Foxx Builder.',
            from: 'noreply@example.com'
        });
        
        console.log('Email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
    }
}

// Example: HTML email with styling
function sendHtmlEmail() {
    try {
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .header { background-color: #007cba; color: white; padding: 20px; }
                    .content { padding: 20px; }
                    .footer { background-color: #f0f0f0; padding: 10px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Welcome to Our Service!</h1>
                </div>
                <div class="content">
                    <p>Thank you for joining us. We're excited to have you on board!</p>
                    <p>Here are some next steps to get you started:</p>
                    <ul>
                        <li>Complete your profile</li>
                        <li>Explore our features</li>
                        <li>Join our community</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Best regards,<br>The Team</p>
                </div>
            </body>
            </html>
        `;
        
        const result = emailService.send({
            to: 'user@example.com',
            subject: 'Welcome - HTML Email',
            html: htmlContent,
            from: 'welcome@example.com'
        });
        
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Failed to send HTML email:', error);
        throw error;
    }
}

// Example: Email with both HTML and text versions
function sendMultipartEmail() {
    try {
        const textContent = `
            Welcome to Our Service!
            
            Thank you for joining us. We're excited to have you on board!
            
            Here are some next steps to get you started:
            - Complete your profile
            - Explore our features  
            - Join our community
            
            Best regards,
            The Team
        `;
        
        const htmlContent = `
            <h1>Welcome to Our Service!</h1>
            <p>Thank you for joining us. We're excited to have you on board!</p>
            <p>Here are some next steps to get you started:</p>
            <ul>
                <li>Complete your profile</li>
                <li>Explore our features</li>
                <li>Join our community</li>
            </ul>
            <p>Best regards,<br><strong>The Team</strong></p>
        `;
        
        const result = emailService.send({
            to: 'user@example.com',
            subject: 'Welcome - Multipart Email',
            text: textContent,
            html: htmlContent,
            from: 'welcome@example.com'
        });
        
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Failed to send multipart email:', error);
        throw error;
    }
}

// Example: Email to multiple recipients
function sendToMultipleRecipients() {
    try {
        const result = emailService.send({
            to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
            subject: 'Team Announcement',
            html: `
                <h2>Important Team Announcement</h2>
                <p>We have some exciting news to share with the team...</p>
                <p>Please join us for the team meeting on Friday at 3 PM.</p>
            `,
            from: 'team@example.com'
        });
        
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Failed to send to multiple recipients:', error);
        throw error;
    }
}

// Example: Email with CC and BCC
function sendWithCcBcc() {
    try {
        const result = emailService.send({
            to: 'primary@example.com',
            cc: ['manager@example.com'],
            bcc: ['archive@example.com'],
            subject: 'Project Update',
            html: `
                <h2>Project Update</h2>
                <p>Here's the latest update on our project progress...</p>
            `,
            from: 'projects@example.com'
        });
        
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Failed to send email with CC/BCC:', error);
        throw error;
    }
}

// Example: Email with reply-to address
function sendWithReplyTo() {
    try {
        const result = emailService.send({
            to: 'customer@example.com',
            subject: 'Customer Support Response',
            html: `
                <h2>Thank you for contacting us</h2>
                <p>We've received your inquiry and will respond within 24 hours.</p>
                <p>If you have any urgent questions, please reply to this email.</p>
            `,
            from: 'noreply@example.com',
            replyTo: 'support@example.com'
        });
        
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Failed to send email with reply-to:', error);
        throw error;
    }
}

// Example: Email with custom headers
function sendWithCustomHeaders() {
    try {
        const result = emailService.send({
            to: 'user@example.com',
            subject: 'Newsletter - Custom Headers',
            html: '<h1>This Week in Tech</h1><p>Latest tech news...</p>',
            from: 'newsletter@example.com',
            headers: {
                'List-Unsubscribe': '<mailto:unsubscribe@example.com>',
                'X-Campaign-ID': 'newsletter-2024-01',
                'X-Priority': '3'
            }
        });
        
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Failed to send email with custom headers:', error);
        throw error;
    }
}

// Example: Error handling with retries
function sendEmailWithRetries(emailData, maxRetries = 3) {
    let attempt = 0;
    
    const attemptSend = () => {
        attempt++;
        
        try {
            const result = emailService.send(emailData);
            console.log(`Email sent successfully on attempt ${attempt}:`, result.messageId);
            return { success: true, messageId: result.messageId, attempts: attempt };
        } catch (error) {
            console.error(`Email send attempt ${attempt} failed:`, error.message);
            
            if (attempt >= maxRetries) {
                console.error(`All ${maxRetries} email send attempts failed`);
                throw new Error(`Failed to send email after ${maxRetries} attempts: ${error.message}`);
            }
            
            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, etc.
            console.log(`Retrying in ${delay}ms...`);
            
            setTimeout(() => {
                return attemptSend();
            }, delay);
        }
    };
    
    return attemptSend();
}

// Example: Validate email before sending
function sendEmailWithValidation(to, subject, content) {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(to)) {
        throw new Error(`Invalid email address: ${to}`);
    }
    
    if (!subject || subject.trim().length === 0) {
        throw new Error('Email subject is required');
    }
    
    if (!content || content.trim().length === 0) {
        throw new Error('Email content is required');
    }
    
    try {
        const result = emailService.send({
            to: to,
            subject: subject,
            html: content,
            from: 'validated@example.com'
        });
        
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Validated email send failed:', error);
        throw error;
    }
}

module.exports = {
    sendSimpleEmail,
    sendHtmlEmail,
    sendMultipartEmail,
    sendToMultipleRecipients,
    sendWithCcBcc,
    sendWithReplyTo,
    sendWithCustomHeaders,
    sendEmailWithRetries,
    sendEmailWithValidation
};