// ─────────────────────────────────────────────────────────────
//  routes/auth.routes.js — AUTHENTICATION FEATURE
//  register / login / refresh / logout.
//  Refresh & logout read the token from the httpOnly cookie
//  (never from JS — XSS-safe).
// ─────────────────────────────────────────────────────────────
const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const rateLimiter = require('../middleware/rateLimiter');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// The request contract for this feature (Joi schema = documentation)
// Shared password rule: 8–72 chars (bcrypt limit), must mix letter + digit
const passwordRule = Joi.string()
  .min(8)
  .max(72)
  .pattern(/(?=.*[A-Za-z])/, 'must contain a letter')
  .pattern(/(?=.*\d)/, 'must contain a number');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: passwordRule.required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const emailOnlySchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordRule.required(),
});

const verifyEmailQuerySchema = Joi.object({
  token: Joi.string().required(),
});

// Stricter rate limit on every credential endpoint (brute-force protection)
router.use(rateLimiter.auth);

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// ── Email verification ───────────────────────────────────────
router.get('/verify-email', validate(verifyEmailQuerySchema, 'query'), authController.verifyEmail);
router.post('/resend-verification', validate(emailOnlySchema), authController.resendVerification);

// ── Password reset ───────────────────────────────────────────
router.post('/forgot-password', validate(emailOnlySchema), authController.forgotPassword);
router.post('/reset-password', validate(resetSchema), authController.resetPassword);

module.exports = router;
