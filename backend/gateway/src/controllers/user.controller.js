// ─────────────────────────────────────────────────────────────
//  controllers/user.controller.js — PROFILE HANDLERS
// ─────────────────────────────────────────────────────────────
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const userService = require('../services/user.service');

exports.getMe = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  ApiResponse.ok(res, { user });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  ApiResponse.ok(res, { user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await userService.changePassword(req.user.id, req.body);
  ApiResponse.ok(res, { user, message: 'Password changed. All other sessions were signed out.' });
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const user = await userService.deleteAccount(req.user.id);
  ApiResponse.ok(res, { user, message: 'Your account and all your data have been deleted.' });
});
