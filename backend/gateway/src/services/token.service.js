// ─────────────────────────────────────────────────────────────
//  services/token.service.js — JWT & REFRESH-TOKEN LOGIC
//  Access token : short-lived (15m), stateless, in-memory client-side.
//  Refresh token: long-lived (7d), httpOnly cookie, stored HASHED
//                 in MongoDB so it can be revoked/rotated.
// ─────────────────────────────────────────────────────────────
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const RefreshToken = require('../models/refreshToken.model');

// One-way hash so a leaked DB never yields usable tokens.
const sha256 = (token) => crypto.createHash('sha256').update(token).digest('hex');

// ── Access tokens ────────────────────────────────────────────
function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.jwtAccessSecret,
    { expiresIn: env.accessTokenTtl }
  );
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwtAccessSecret);
  } catch {
    throw new ApiError(401, 'INVALID_TOKEN', 'Access token is invalid or expired.');
  }
}

// ── Refresh tokens ───────────────────────────────────────────
// `jti` (unique id) makes every issued token unique even when two
// tokens are signed in the same second (iat has 1s resolution) —
// without it, a fast rotation could produce an identical token,
// whose hash would collide with the unique tokenHash index.
function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), jti: crypto.randomUUID() },
    env.jwtRefreshSecret,
    { expiresIn: `${env.refreshTokenTtlDays}d` }
  );
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.jwtRefreshSecret);
  } catch {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
  }
}

async function storeRefreshToken(userId, token) {
  await RefreshToken.create({
    userId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
  });
}

async function revokeRefreshToken(token) {
  await RefreshToken.findOneAndUpdate(
    { tokenHash: sha256(token), revokedAt: null },
    { revokedAt: new Date() }
  );
}

// Rotation (OWASP): revoke the used token and issue + store a new one.
// Returns null when the presented token was revoked/expired/unknown.
async function rotateRefreshToken(oldToken, userId) {
  const record = await RefreshToken.findOne({ tokenHash: sha256(oldToken), revokedAt: null });
  if (!record || record.expiresAt < new Date()) return null;

  await record.updateOne({ revokedAt: new Date() });

  const nextToken = jwt.sign(
    { sub: userId.toString(), jti: crypto.randomUUID() },
    env.jwtRefreshSecret,
    { expiresIn: `${env.refreshTokenTtlDays}d` }
  );
  await storeRefreshToken(userId, nextToken);
  return nextToken;
}

// Kill EVERY session for a user — used after a password reset/change,
// so a stolen old token cannot keep working.
async function revokeAllUserSessions(userId) {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() }
  );
}

// ── Short-lived single-purpose tokens (emails) ───────────────
// Same JWT secret, but the `purp` claim restricts WHAT the token
// may be used for: an email-verification token can never be used
// to reset a password, even if leaked.
function signPurposeToken(user, purpose, ttl) {
  return jwt.sign(
    { sub: user._id.toString(), purp: purpose },
    env.jwtAccessSecret,
    { expiresIn: ttl }
  );
}

function verifyPurposeToken(token, purpose) {
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    if (payload.purp !== purpose) {
      throw new ApiError(400, 'INVALID_TOKEN', 'This link is invalid or has expired.');
    }
    return payload;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, 'INVALID_TOKEN', 'This link is invalid or has expired.');
  }
}

const signEmailVerificationToken = (user) =>
  signPurposeToken(user, 'email_verify', env.verifyTokenTtl);

const verifyEmailVerificationToken = (token) =>
  verifyPurposeToken(token, 'email_verify');

const signPasswordResetToken = (user) =>
  signPurposeToken(user, 'password_reset', env.resetTokenTtl);

const verifyPasswordResetToken = (token) =>
  verifyPurposeToken(token, 'password_reset');

module.exports = {
  sha256,
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  revokeAllUserSessions,
  signEmailVerificationToken,
  verifyEmailVerificationToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
};
