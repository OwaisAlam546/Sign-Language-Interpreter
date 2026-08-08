// ─────────────────────────────────────────────────────────────
//  controllers/auth.controller.js — AUTH HANDLERS
//  Thin by design: read request → call service → shape response.
//  The refresh-token cookie options live here (HTTP-only, secure
//  in production, sameSite lax).
// ─────────────────────────────────────────────────────────────
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/auth.service');
const env = require('../config/env');
const { COOKIE } = require('../constants');

function refreshCookieOptions() {
  return {
    httpOnly: true, // JavaScript cannot read it → XSS cannot steal it
    sameSite: 'lax',
    secure: env.isProd, // HTTPS-only in production
    maxAge: COOKIE.MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    path: COOKIE.PATH,
  };
}

exports.register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body);
  ApiResponse.created(res, { user });
});

exports.login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.loginUser(req.body);
  res.cookie(COOKIE.REFRESH, refreshToken, refreshCookieOptions());
  ApiResponse.ok(res, { accessToken, user });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.refreshTokens(
    req.cookies[COOKIE.REFRESH]
  );
  res.cookie(COOKIE.REFRESH, refreshToken, refreshCookieOptions());
  ApiResponse.ok(res, { accessToken, user });
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.cookies[COOKIE.REFRESH]);
  res.clearCookie(COOKIE.REFRESH, { path: COOKIE.PATH });
  ApiResponse.noContent(res);
});

// GET /auth/verify-email?token=... — clicked from the email link
exports.verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail(req.query.token);
  ApiResponse.ok(res, { user, message: 'Email verified — you can now log in.' });
});

// POST /auth/resend-verification { email } — always 200 (no probing)
exports.resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.body);
  ApiResponse.ok(res, { message: 'If that account exists and is unverified, a new link is on its way.' });
});

// POST /auth/forgot-password { email } — always 200 (no probing)
exports.forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);
  ApiResponse.ok(res, { message: 'If that email is registered, a reset link has been sent.' });
});

// POST /auth/reset-password { token, password } — from the email link
exports.resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  ApiResponse.ok(res, { message: 'Password updated. All your other sessions were signed out.' });
});
