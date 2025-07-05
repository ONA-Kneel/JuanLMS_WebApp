import SibApiV3Sdk from 'sib-api-v3-sdk';

/**
 * Send an email using Brevo (Sendinblue) transactional API.
 * @param {Object} options
 * @param {string} options.toEmail - Recipient email address
 * @param {string} options.toName - Recipient name
 * @param {string} options.subject - Email subject
 * @param {string} options.textContent - Plain text content
 * @param {string} [options.senderEmail] - Sender email address (default: from config)
 * @param {string} [options.senderName] - Sender name (default: from config)
 * @returns {Promise<void>}
 */
export async function sendEmail({ toEmail, toName, subject, textContent, senderEmail = 'juanlms.sjddefi@gmail.com', senderName = 'JuanLMS Support' }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set in environment variables.');
  }
  let defaultClient = SibApiV3Sdk.ApiClient.instance;
  let apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  let sendSmtpEmail = {
    to: [{ email: toEmail, name: toName }],
    sender: { email: senderEmail, name: senderName },
    subject,
    textContent
  };
  await apiInstance.sendTransacEmail(sendSmtpEmail);
} 