// ─────────────────────────────────────────────────────────────
//  services/auth.service.js — AUTHENTICATION BUSINESS LOGIC
//  register / verify-email / resend-verification / login / refresh
//  / logout / forgot-password / reset-password.
//  Controllers stay thin; every rule lives here so it can be
//  unit-tested in isolation.
//
//  Security decisions baked into this file:
//   • verification & reset links are signed JWTs with a `purp`
//     (purpose) claim — a leaked verify link can never reset a
//     password and vice versa
//   • forgot-password returns the SAME response whether or not the
//     email exists (no account probing)
//   • reset/change password revokes ALL refresh tokens — old
//     sessions die immediately
//   • login can be gated on email verification in production
// ─────────────────────────────────────────────────────────────
const User = require('../models/user.model');
const tokenService = require('./token.service');
const emailService = require('./email.service');
const emailTemplates = require('./emailTemplates');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

// ── Email helpers ────────────────────────────────────────────
// Sending must never break the flow it is part of (registration,
// forgot-password). A dead SMTP server is logged, not fatal.
async function sendVerificationEmailSafely(user) {
  try {
    const token = tokenService.signEmailVerificationToken(user);
    const link = `${env.clientUrl}/verify-email?token=${token}`;
    await emailService.sendEmail({
      to: user.email,
      ...emailTemplates.verificationEmail({ name: user.name, link }),
    });
  } catch (err) {
    logger.warn(`Verification email to ${user.email} failed`, err.message);
  }
}

async function sendPasswordResetEmailSafely(user) {
  try {
    const token = tokenService.signPasswordResetToken(user);
    const link = `${env.clientUrl}/reset-password?token=${token}`;
    await emailService.sendEmail({
      to: user.email,
      ...emailTemplates.resetPasswordEmail({ name: user.name, link }),
    });
  } catch (err) {
    logger.warn(`Reset email to ${user.email} failed`, err.message);
  }
}

// ── Register + email verification ─────────────────────────────
async function registerUser({ name, email, password }) {
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');

  const user = await User.create({ name, email, password });
  await sendVerificationEmailSafely(user);
  return user; // toJSON transform strips the password hash
}

async function verifyEmail(token) {
  const payload = tokenService.verifyEmailVerificationToken(token);
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(400, 'INVALID_TOKEN', 'This link is invalid or has expired.');

  if (user.isEmailVerified) return user; // idempotent — re-clicking the link is harmless
  user.isEmailVerified = true;
  await user.save();
  return user;
}

async function resendVerification({ email }) {
  const user = await User.findOne({ email });
  // Identical behaviour whether the user exists/verified or not —
  // the endpoint cannot be used to probe which emails are registered.
  if (user && !user.isEmailVerified) await sendVerificationEmailSafely(user);
}

// ── Login / logout / refresh ─────────────────────────────────────
async function loginUser({ email, password }) {
  // select('+password') — the field is select:false by default
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }

  if (env.requireEmailVerification && !user.isEmailVerified) {
    throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in.');
  }

  const accessToken = tokenService.signAccessToken(user);
  const refreshToken = tokenService.signRefreshToken(user);
  await tokenService.storeRefreshToken(user._id, refreshToken);

  return { accessToken, refreshToken, user };
}

async function refreshTokens(refreshToken) {
  if (!refreshToken) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'No refresh token provided.');
  }

  const payload = tokenService.verifyRefreshToken(refreshToken);
  const nextToken = await tokenService.rotateRefreshToken(refreshToken, payload.sub);
  if (!nextToken) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has been revoked or expired.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'This account no longer exists.');

  return { accessToken: tokenService.signAccessToken(user), refreshToken: nextToken, user };
}

async function logoutUser(refreshToken) {
  if (refreshToken) await tokenService.revokeRefreshToken(refreshToken);
}

// ── Password reset (forgot → email link → new password) ──────
async function forgotPassword({ email }) {
  const user = await User.findOne({ email });
  if (!user) return; // identical response whether or not the email exists
  await sendPasswordResetEmailSafely(user);
}

async function resetPassword({ token, password }) {
  const payload = tokenService.verifyPasswordResetToken(token);
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(400, 'INVALID_TOKEN', 'This link is invalid or has expired.');

  user.password = password; // the pre-save hook re-hashes it
  await user.save();
  await tokenService.revokeAllUserSessions(user._id); // old sessions die at once
  return user;
}

module.exports = {
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
  refreshTokens,
  logoutUser,
  forgotPassword,
  resetPassword,
};