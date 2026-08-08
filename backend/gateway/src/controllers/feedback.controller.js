// ─────────────────────────────────────────────────────────────
//  controllers/feedback.controller.js — FEEDBACK HANDLERS
// ─────────────────────────────────────────────────────────────
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const feedbackService = require('../services/feedback.service');

exports.create = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.createFeedback(req.user.id, req.body);
  ApiResponse.created(res, { feedback });
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await feedbackService.listFeedback(req.user.id, req.query);
  ApiResponse.ok(res, { feedback: items }, meta);
});

exports.getOne = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.getFeedback(req.user.id, req.params.id);
  ApiResponse.ok(res, { feedback });
});

exports.update = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.updateFeedback(req.user.id, req.params.id, req.body);
  ApiResponse.ok(res, { feedback });
});

exports.remove = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.deleteFeedback(req.user.id, req.params.id);
  ApiResponse.ok(res, { feedback, message: 'Feedback deleted.' });
});
