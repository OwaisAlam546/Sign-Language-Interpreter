// ─────────────────────────────────────────────────────────────
//  controllers/translation.controller.js — HISTORY HANDLERS
// ─────────────────────────────────────────────────────────────
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const translationService = require('../services/translation.service');

exports.create = asyncHandler(async (req, res) => {
  const translation = await translationService.saveTranslation(req.user.id, req.body);
  ApiResponse.created(res, { translation });
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await translationService.listTranslations(req.user.id, req.query);
  ApiResponse.ok(res, { translations: items }, meta);
});

exports.stats = asyncHandler(async (req, res) => {
  const stats = await translationService.getStats(req.user.id);
  ApiResponse.ok(res, { stats });
});

exports.getOne = asyncHandler(async (req, res) => {
  const translation = await translationService.getTranslationById(req.user.id, req.params.id);
  ApiResponse.ok(res, { translation });
});

exports.update = asyncHandler(async (req, res) => {
  const translation = await translationService.updateTranslation(req.user.id, req.params.id, req.body);
  ApiResponse.ok(res, { translation });
});

exports.remove = asyncHandler(async (req, res) => {
  const translation = await translationService.deleteTranslation(req.user.id, req.params.id);
  ApiResponse.ok(res, { translation, message: 'Translation deleted.' });
});

exports.clear = asyncHandler(async (req, res) => {
  const { deletedCount } = await translationService.clearHistory(req.user.id);
  ApiResponse.ok(res, { deletedCount, message: 'History cleared.' });
});

// Export streams a file (CSV by default, JSON on ?format=json) — bypasses
// the JSON envelope on purpose.
exports.exportHistory = asyncHandler(async (req, res) => {
  const { format, content } = await translationService.exportTranslations(req.user.id, req.query.format);
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', format === 'json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="signspeak-history-${stamp}.${format}"`);
  res.send(content);
});
