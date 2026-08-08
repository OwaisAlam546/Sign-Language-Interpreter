// ─────────────────────────────────────────────────────────────
//  controllers/admin.controller.js — ADMIN HANDLERS
//  Thin: read request → call service → shape response.
//  Covers user directory + moderation + pipeline analytics +
//  system settings + dashboard stats.
// ─────────────────────────────────────────────────────────────
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const adminService = require('../services/admin.service');
const analyticsService = require('../services/analytics.service');
const feedbackService = require('../services/feedback.service');
const predictionLogService = require('../services/predictionLog.service');
const settingService = require('../services/setting.service');

exports.listUsers = asyncHandler(async (req, res) => {
  const { items, meta } = await adminService.listUsers(req.query);
  ApiResponse.ok(res, { users: items }, meta);
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await adminService.getUser(req.params.id);
  ApiResponse.ok(res, { user });
});

exports.setRole = asyncHandler(async (req, res) => {
  const user = await adminService.setUserRole(req.params.id, req.body.role, req.user.id);
  ApiResponse.ok(res, { user });
});

exports.removeUser = asyncHandler(async (req, res) => {
  const user = await adminService.deleteUser(req.params.id);
  ApiResponse.ok(res, { user, message: 'User and all their data have been deleted.' });
});

exports.getStats = asyncHandler(async (_req, res) => {
  const stats = await adminService.getStats();
  ApiResponse.ok(res, { stats });
});

// ── Moderation: feedback ────────────────────────────────────

exports.listFeedback = asyncHandler(async (req, res) => {
  const { items, meta } = await feedbackService.listAllFeedback(req.query);
  ApiResponse.ok(res, { feedback: items }, meta);
});

exports.resolveFeedback = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.resolveFeedback(req.params.id, req.body.resolved);
  ApiResponse.ok(res, { feedback });
});

exports.deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.removeFeedback(req.params.id);
  ApiResponse.ok(res, { feedback, message: 'Feedback removed.' });
});

// ── Pipeline analytics: prediction logs ─────────────────────

exports.createPredictionLog = asyncHandler(async (req, res) => {
  const log = await predictionLogService.createLog(req.body);
  ApiResponse.created(res, { log });
});

exports.listPredictionLogs = asyncHandler(async (req, res) => {
  const { items, meta } = await predictionLogService.listLogs(req.query);
  ApiResponse.ok(res, { logs: items }, meta);
});

exports.getPredictionLog = asyncHandler(async (req, res) => {
  const log = await predictionLogService.getLog(req.params.id);
  ApiResponse.ok(res, { log });
});

exports.deletePredictionLog = asyncHandler(async (req, res) => {
  const log = await predictionLogService.removeLog(req.params.id);
  ApiResponse.ok(res, { log, message: 'Prediction log removed.' });
});

// ── System settings ─────────────────────────────────────────

exports.getAnalytics = asyncHandler(async (_req, res) => {
  const analytics = await adminService.getAnalytics();
  ApiResponse.ok(res, { analytics });
});

// Phase 11: chart-ready platform dashboard (admin scope of the same service).
exports.getAnalyticsDashboard = asyncHandler(async (_req, res) => {
  const dashboard = await analyticsService.buildDashboard({ scope: 'admin' });
  ApiResponse.ok(res, { dashboard });
});

exports.listSystemSettings = asyncHandler(async (_req, res) => {
  const settings = await settingService.listSystem();
  ApiResponse.ok(res, { settings });
});

exports.setSystemSetting = asyncHandler(async (req, res) => {
  const setting = await settingService.setKey(null, req.body);
  ApiResponse.ok(res, { setting });
});

exports.deleteSystemSetting = asyncHandler(async (req, res) => {
  const setting = await settingService.removeKey(null, req.params.key);
  ApiResponse.ok(res, { setting, message: 'System setting removed — the app falls back to its default.' });
});