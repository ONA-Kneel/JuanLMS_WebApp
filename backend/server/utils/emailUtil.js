import SibApiV3Sdk from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Send an email using Brevo (Sendinblue) transactional API.
 * @param {Object} options
 * @param {string} options.toEmail - Recipient email address
 * @param {string} options.toName - Recipient name
 * @param {string} options.subject - Email subject
 * @param {string} options.textContent - Plain text content
 * @param {string} [options.senderEmail] - Override sender email (default: from env)
 * @param {string} [options.senderName] - Override sender name (default: from env)
 * @param {string} [options.replyTo] - Override reply-to email (default: from env)
 * @returns {Promise<void>}
 */
export async function sendEmail({
  toEmail,
  toName,
  subject,
  textContent,
  senderEmail = process.env.EMAIL_SENDER_ADDRESS,
  senderName = process.env.EMAIL_SENDER_NAME,
  replyTo = process.env.EMAIL_REPLYTO || process.env.EMAIL_SENDER_ADDRESS
}) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set in environment variables.');
  }

  // Initialize Brevo client
  let defaultClient = SibApiV3Sdk.ApiClient.instance;
  let apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  let sendSmtpEmail = {
    to: [{ email: toEmail, name: toName }],
    sender: { email: senderEmail, name: senderName },
    replyTo: { email: replyTo },
    subject,
    textContent
  };

  await apiInstance.sendTransacEmail(sendSmtpEmail);
}
