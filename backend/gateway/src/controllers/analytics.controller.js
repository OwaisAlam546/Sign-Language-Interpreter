// ─────────────────────────────────────────────────────────────
//  controllers/analytics.controller.js — DASHBOARD HANDLERS
//  Thin: read request → call service → shape response.
//  The admin variant lives in admin.controller (same service,
//  scope 'admin') — this one is the signed-in user's own view.
// ─────────────────────────────────────────────────────────────
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const analyticsService = require('../services/analytics.service');

exports.dashboard = asyncHandler(async (req, res) => {
  const dashboard = await analyticsService.buildDashboard({ scope: 'user', userId: req.user.id });
  ApiResponse.ok(res, { dashboard });
});
