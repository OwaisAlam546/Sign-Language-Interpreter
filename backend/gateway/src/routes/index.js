// ─────────────────────────────────────────────────────────────
//  routes/index.js — ROUTER AGGREGATOR
//  Mounts every feature router under /api/v1. Adding a feature =
//  one new folder + one line here.
// ─────────────────────────────────────────────────────────────
const express = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const adminRoutes = require('./admin.routes');
const gestureRoutes = require('./gesture.routes');
const translationRoutes = require('./translation.routes');
const feedbackRoutes = require('./feedback.routes');
const notificationRoutes = require('./notification.routes');
const settingRoutes = require('./setting.routes');
const healthRoutes = require('./health.routes');
const aiRoutes = require('./ai.routes');
const analyticsRoutes = require('./analytics.routes');

const api = express.Router();

api.use('/auth', authRoutes);
api.use('/users', userRoutes);
api.use('/admin', adminRoutes);
api.use('/gestures', gestureRoutes);
api.use('/translations', translationRoutes);
api.use('/feedback', feedbackRoutes);
api.use('/notifications', notificationRoutes);
api.use('/settings', settingRoutes);
api.use('/ai', aiRoutes);           // Phase 9: FastAPI proxy (model-status, predict, tts…)
api.use('/analytics', analyticsRoutes); // Phase 11: chart-ready dashboard (user's own view)
api.use('/health', healthRoutes); // versioned alias for the probe

module.exports = { api, health: healthRoutes };
