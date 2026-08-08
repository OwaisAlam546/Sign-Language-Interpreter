// ─────────────────────────────────────────────────────────────
//  routes/analytics.routes.js — DASHBOARD FEATURE (Phase 11)
//  Chart-ready analytics for the signed-in user. The platform-wide
//  variant lives under /admin (analytics/dashboard).
// ─────────────────────────────────────────────────────────────
const express = require('express');
const auth = require('../middleware/auth');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.use(auth);

// One call → every series the dashboard screens plot.
router.get('/dashboard', analyticsController.dashboard);

module.exports = router;
