// ─────────────────────────────────────────────────────────────
//  controllers/gesture.controller.js — DICTIONARY HANDLERS
// ─────────────────────────────────────────────────────────────
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const gestureService = require('../services/gesture.service');

exports.list = asyncHandler(async (req, res) => {
  const gestures = await gestureService.listGestures(req.query);
  ApiResponse.ok(res, { gestures });
});

exports.getOne = asyncHandler(async (req, res) => {
  const gesture = await gestureService.getGestureByLabel(req.params.label);
  ApiResponse.ok(res, { gesture });
});
