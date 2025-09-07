import SibApiV3Sdk from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

/**
 * Email Service for JuanLMS
 * Handles sending emails via Brevo for OTPs and notifications
 */
class EmailService {
  constructor() {
    this.setupBrevo();
  }

  setupBrevo() {
    let defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  /**
   * Send OTP to personal email via Brevo
   * @param {string} personalEmail - User's personal email
   * @param {string} firstName - User's first name
   * @param {string} otp - The OTP code
   * @param {string} purpose - Purpose of OTP (password reset, password change, etc.)
   * @param {string} zohoEmail - User's Zoho email (optional)
   * @returns {Promise<Object>} Result of email sending
   */
  async sendOTP(personalEmail, firstName, otp, purpose = 'verification', zohoEmail = null) {
    try {
      const subject = this.getOTPSubject(purpose);
      const content = this.getOTPContent(firstName, otp, purpose, zohoEmail);

      const sendSmtpEmail = {
        to: [{ email: personalEmail, name: firstName || '' }],
        sender: { email: 'juanlms.sjddefi@sjdefilms.com', name: 'JuanLMS Support' },
        subject: subject,
        textContent: content
      };

      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      
      return {
        success: true,
        message: 'OTP sent successfully',
        data: result
      };
    } catch (error) {
      console.error('Error sending OTP via Brevo:', error);
      return {
        success: false,
        message: 'Failed to send OTP',
        error: error.message
      };
    }
  }

  /**
   * Send welcome email to personal email via Brevo
   * @param {string} personalEmail - User's personal email
   * @param {string} firstName - User's first name
   * @param {string} zohoEmail - User's Zoho email
   * @param {string} password - User's password
   * @returns {Promise<Object>} Result of email sending
   */
  async sendWelcomeEmail(personalEmail, firstName, zohoEmail, password) {
    try {
      const sendSmtpEmail = {
        to: [{ email: personalEmail, name: firstName || '' }],
        sender: { email: 'juanlms.sjddefi@sjdefilms.com', name: 'JuanLMS Support' },
        subject: 'Welcome to JuanLMS! - Your Account is Ready',
        textContent: this.getWelcomeContent(firstName, zohoEmail, password)
      };

      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      
      return {
        success: true,
        message: 'Welcome email sent successfully',
        data: result
      };
    } catch (error) {
      console.error('Error sending welcome email via Brevo:', error);
      return {
        success: false,
        message: 'Failed to send welcome email',
        error: error.message
      };
    }
  }

  /**
   * Send notification to Zoho Mail account
   * @param {string} zohoEmail - User's Zoho email
   * @param {string} firstName - User's first name
   * @param {string} subject - Email subject
   * @param {string} content - Email content
   * @returns {Promise<Object>} Result of email sending
   */
  async sendZohoNotification(zohoEmail, firstName, subject, content) {
    try {
      const sendSmtpEmail = {
        to: [{ email: zohoEmail, name: firstName || '' }],
        sender: { email: 'juanlms.sjddefi@sjdefilms.com', name: 'JuanLMS Support' },
        subject: subject,
        textContent: content
      };

      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      
      return {
        success: true,
        message: 'Notification sent to Zoho Mail successfully',
        data: result
      };
    } catch (error) {
      console.error('Error sending notification to Zoho Mail via Brevo:', error);
      return {
        success: false,
        message: 'Failed to send notification to Zoho Mail',
        error: error.message
      };
    }
  }

  getOTPSubject(purpose) {
    switch (purpose) {
      case 'password_reset':
        return 'Your JuanLMS Password Reset OTP';
      case 'password_change':
        return 'Your JuanLMS Password Change OTP';
      case 'verification':
        return 'Your JuanLMS Verification OTP';
      default:
        return 'Your JuanLMS OTP';
    }
  }

  getOTPContent(firstName, otp, purpose, zohoEmail) {
    const purposeText = this.getPurposeText(purpose);
    
    let content = `Hello ${firstName || ''},\n\n`;
    content += `🔐 Your OTP for ${purposeText} is: ${otp}\n\n`;
    content += `⏰ This OTP will expire in 15 minutes.\n\n`;
    content += `⚠️ If you did not request this ${purposeText}, please ignore this email and contact support.\n\n`;
    
    if (zohoEmail && zohoEmail.includes('@sjdefilms.com')) {
      content += `📧 This OTP was sent to your Zoho Mail address (${zohoEmail}).\n\n`;
      content += `🌐 You can access your Zoho Mail at: mail.zoho.com\n\n`;
    }
    
    content += `Thank you,\nJuanLMS Team`;
    
    return content;
  }

  getPurposeText(purpose) {
    switch (purpose) {
      case 'password_reset':
        return 'password reset';
      case 'password_change':
        return 'password change';
      case 'verification':
        return 'account verification';
      default:
        return 'verification';
    }
  }

  getWelcomeContent(firstName, zohoEmail, password) {
    return `Hello ${firstName || ''},\n\n` +
      `Your JuanLMS account has been successfully created!\n\n` +
      `📧 Zoho Mail Account Created:\n` +
      `   Email: ${zohoEmail}\n` +
      `   Password: ${password}\n\n` +
      `🔐 LMS Login Credentials:\n` +
      `   Email: ${zohoEmail}\n` +
      `   Password: ${password}\n\n` +
      `📱 What you can do now:\n` +
      `   • Login to JuanLMS with the credentials above\n` +
      `   • Access your Zoho Mail at mail.zoho.com\n` +
      `   • Change your password after first login\n` +
      `   • Check your Zoho Mail for important notifications and OTPs\n\n` +
      `Thank you for joining JuanLMS!\n\n` +
      `Best regards,\nJuanLMS Team`;
  }
}

// Export singleton instance
export default new EmailService();
