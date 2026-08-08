// ─────────────────────────────────────────────────────────────
//  services/emailTemplates.js — EMAIL CONTENT BUILDERS
//  One function per email type. Each returns { subject, text, html }
//  — text for plain-text clients, html for pretty ones.
// ─────────────────────────────────────────────────────────────

function verificationEmail({ name, link }) {
  return {
    subject: 'SignSpeak AI — verify your email',
    text:
      `Hi ${name},\n\n` +
      `Welcome to SignSpeak AI! Please confirm your email address by opening this link (valid for 1 hour):\n\n` +
      `${link}\n\n` +
      `If you did not create an account, you can safely ignore this email.\n\n` +
      `— The SignSpeak AI team`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0B0F19;color:#E2E8F0;border-radius:12px;padding:32px">` +
      `<h2 style="color:#38BDF8;margin-top:0">SignSpeak&nbsp;AI</h2>` +
      `<p>Hi <strong>${name}</strong>,</p>` +
      `<p>Welcome! Please confirm your email address to activate your account.</p>` +
      `<p style="text-align:center;margin:28px 0">` +
      `<a href="${link}" style="display:inline-block;background:#38BDF8;color:#0B0F19;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold">Verify email</a>` +
      `</p>` +
      `<p style="color:#94A3B8;font-size:12px">Link valid for 1 hour. If you didn't create an account, ignore this email.</p>` +
      `</div>`,
  };
}

function resetPasswordEmail({ name, link }) {
  return {
    subject: 'SignSpeak AI — reset your password',
    text:
      `Hi ${name},\n\n` +
      `We received a request to reset your SignSpeak AI password. Click the link below to choose a new one (valid for 15 minutes):\n\n` +
      `${link}\n\n` +
      `If you did not request this, you can safely ignore this email — your password stays unchanged.\n\n` +
      `— The SignSpeak AI team`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0B0F19;color:#E2E8F0;border-radius:12px;padding:32px">` +
      `<h2 style="color:#38BDF8;margin-top:0">SignSpeak&nbsp;AI</h2>` +
      `<p>Hi <strong>${name}</strong>,</p>` +
      `<p>We received a request to reset your password. Click below to set a new one.</p>` +
      `<p style="text-align:center;margin:28px 0">` +
      `<a href="${link}" style="display:inline-block;background:#38BDF8;color:#0B0F19;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold">Reset password</a>` +
      `</p>` +
      `<p style="color:#94A3B8;font-size:12px">Link valid for 15 minutes. If you didn't request this, ignore this email.</p>` +
      `</div>`,
  };
}

module.exports = { verificationEmail, resetPasswordEmail };