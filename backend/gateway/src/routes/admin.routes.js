// ─────────────────────────────────────────────────────────────
//  routes/admin.routes.js — ADMINISTRATION FEATURE
//  Every route here requires TWO guards:
//    1. auth          — you are logged in
//    2. authorize('admin') — your role is admin
//  Users with role 'user' get 403 FORBIDDEN.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const adminController = require('../controllers/admin.controller');
const { ROLES } = require('../constants');

const router = express.Router();

const updateRoleSchema = Joi.object({
  role: Joi.string().valid(ROLES.USER, ROLES.ADMIN).required(),
});

const predictionLogSchema = Joi.object({
  userId: Joi.string().hex().length(24),
  translationId: Joi.string().hex().length(24),
  engine: Joi.string().valid('mediapipe', 'lstm'),
  gesture: Joi.string().max(100),
  confidence: Joi.number().min(0).max(1),
  inputFrames: Joi.number().integer().min(0),
  latencyMs: Joi.number().min(0),
  inputMode: Joi.string().valid('webcam', 'upload', 'audio'),
  fallbackUsed: Joi.boolean(),
});

const systemSettingSchema = Joi.object({
  key: Joi.string().pattern(/^[a-zA-Z0-9._-]+$/).max(60).required(),
  value: Joi.any().required(),
  description: Joi.string().max(200),
});

const resolveSchema = Joi.object({
  resolved: Joi.boolean().required(),
});

router.use(auth, authorize('admin'));

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id/role', validate(updateRoleSchema), adminController.setRole);
router.delete('/users/:id', adminController.removeUser);

// AI pipeline analytics + moderation views
router.get('/stats', adminController.getStats);
router.get('/analytics', adminController.getAnalytics); // Phase 10: platform dashboard
router.get('/analytics/dashboard', adminController.getAnalyticsDashboard); // Phase 11: chart-ready
router.get('/prediction-logs', adminController.listPredictionLogs);
router.post('/prediction-logs', validate(predictionLogSchema), adminController.createPredictionLog);
router.get('/prediction-logs/:id', adminController.getPredictionLog);
router.delete('/prediction-logs/:id', adminController.deletePredictionLog);
router.get('/feedback', adminController.listFeedback);
router.patch('/feedback/:id/resolve', validate(resolveSchema), adminController.resolveFeedback);
router.delete('/feedback/:id', adminController.deleteFeedback);
router.get('/settings', adminController.listSystemSettings);
router.patch('/settings', validate(systemSettingSchema), adminController.setSystemSetting);
router.delete('/settings/:key', adminController.deleteSystemSetting);

module.exports = router;