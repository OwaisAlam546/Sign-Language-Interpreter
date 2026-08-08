// ─────────────────────────────────────────────────────────────
//  services/email.service.js — EMAIL DELIVERY
//  Two modes, chosen automatically:
//    • SMTP configured (SMTP_USER + SMTP_PASS) → real emails via
//      nodemailer through your provider (Gmail/Outlook/etc).
//    • Dev preview (default) → nodemailer jsonTransport, messages
//      are printed to the server console instead of sent. Zero
//      setup for demos; getSentEmails() lets tests assert delivery.
// ─────────────────────────────────────────────────────────────
const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');
const templates = require('./emailTemplates');

// In-memory record of preview-mode emails — used by tests/verify
// to pick up verification / reset links. Empty when real SMTP is on.
const sentEmails = [];

function createTransport() {
  if (env.smtpUser && env.smtpPass) {
    logger.info(`Email service ready (SMTP ${env.smtpHost}:${env.smtpPort})`);
    return nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: env.smtpUser, pass: env.smtpPass },
    });
  }
  logger.info('Email service in DEV PREVIEW mode — messages print to console, nothing is sent.');
  return nodemailer.createTransport({ jsonTransport: true }); // generates the message, never sends
}

const transport = createTransport();
const previewMode = !(env.smtpUser && env.smtpPass);

async function sendEmail({ to, subject, text, html }) {
  const info = await transport.sendMail({ from: env.emailFrom, to, subject, text, html });

  if (previewMode) {
    sentEmails.push({ to, subject, text, at: new Date().toISOString() });
    logger.info(`📧 [dev preview] To: ${to} | ${subject}`);
    logger.info(`   ${text.split('\n').join('\n   ')}`);
  } else {
    logger.info(`📧 Sent "${subject}" to ${to} (messageId ${info.messageId})`);
  }
  return info;
}

function getSentEmails() {
  return sentEmails;
}

module.exports = { sendEmail, getSentEmails, previewMode };