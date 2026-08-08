// ─────────────────────────────────────────────────────────────
//  controllers/notification.controller.js — INBOX HANDLERS
//  Every handler is scoped by req.user.id — a logged-in user can
//  only ever touch their OWN notifications.
// ─────────────────────────────────────────────────────────────
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const notificationService = require('../services/notification.service');

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await notificationService.listNotifications(req.user.id, req.query);
  ApiResponse.ok(res, { notifications: items }, meta);
});

exports.unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.unreadCount(req.user.id);
  ApiResponse.ok(res, { count });
});

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.user.id, req.params.id);
  ApiResponse.ok(res, { notification });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const { modifiedCount } = await notificationService.markAllRead(req.user.id);
  ApiResponse.ok(res, { modifiedCount });
});

exports.getOne = asyncHandler(async (req, res) => {
  const notification = await notificationService.getNotification(req.user.id, req.params.id);
  ApiResponse.ok(res, { notification });
});

exports.remove = asyncHandler(async (req, res) => {
  const notification = await notificationService.removeNotification(req.user.id, req.params.id);
  ApiResponse.ok(res, { notification, message: 'Notification dismissed.' });
});