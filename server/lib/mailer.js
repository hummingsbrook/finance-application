const nodemailer = require('nodemailer');

/**
 * Send an email using SMTP transport configured via environment variables.
 * If SMTP_HOST is not set, logs a warning and resolves without error.
 *
 * @param {Object} params
 * @param {string} params.to       - Recipient email address
 * @param {string} params.subject  - Email subject line
 * @param {string} params.html     - HTML body
 * @param {string} params.text     - Plain-text fallback body
 * @returns {Promise<void>}
 */
async function sendEmail({ to, subject, html, text }) {
  const host = process.env.SMTP_HOST;

  if (!host) {
    console.warn('[mailer] SMTP not configured, email not sent');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });

  const fromName = process.env.SMTP_FROM_NAME || 'ChurchFinance Pro';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '';

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
    text,
  });
}

module.exports = { sendEmail };