// ─────────────────────────────────────────────────────────────
//  controllers/setting.controller.js — SETTINGS HANDLERS
//  GET    /settings       → public system defaults
//  GET    /settings/me     → the caller's preferences
//  PATCH  /settings/me     → upsert one preference
//  DELETE /settings/me/:key → drop one preference (back to default)
// ─────────────────────────────────────────────────────────────
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const settingService = require('../services/setting.service');

exports.system = asyncHandler(async (_req, res) => {
  const settings = await settingService.listSystem();
  ApiResponse.ok(res, { settings });
});

exports.listMine = asyncHandler(async (req, res) => {
  const settings = await settingService.listMine(req.user.id);
  ApiResponse.ok(res, { settings });
});

exports.setMine = asyncHandler(async (req, res) => {
  const setting = await settingService.setKey(req.user.id, req.body);
  ApiResponse.ok(res, { setting });
});

exports.removeUserKey = asyncHandler(async (req, res) => {
  const setting = await settingService.removeKey(req.user.id, req.params.key);
  ApiResponse.ok(res, { setting, message: 'Preference removed — default applies.' });
});