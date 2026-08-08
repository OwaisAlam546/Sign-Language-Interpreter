// ─────────────────────────────────────────────────────────────
//  services/notification.service.js — NOTIFICATION BUSINESS LOGIC
//  Inbox reads are always scoped to the authenticated user — the
//  service injects req.user.id AFTER the whitelist so no query
//  parameter can ever read another user's notifications.
// ─────────────────────────────────────────────────────────────
const Notification = require('../models/notification.model');
const ApiError = require('../utils/ApiError');
const { requireObjectId } = require('../utils/objectId');
const { buildListQuery, paginate } = require('../utils/listQuery');

async function createNotification(userId, { type, title, message, ref = '' }) {
  return Notification.create({ userId, type, title, message, ref });
}

// `?read=unread` / `?read=read` map onto readAt = null / not null —
// an index-friendly equality instead of scanning every row.
function notificationConditions(query) {
  if (query.read === 'unread') return { readAt: null };
  if (query.read === 'read') return { readAt: { $ne: null } };
  return {};
}

// The unread badge — one indexed count per user, very cheap.
async function unreadCount(userId) {
  return Notification.countDocuments({ userId, readAt: null });
}

async function listNotifications(userId, query) {
  const opts = buildListQuery(query, {
    filterFields: { type: 'type' },
    sortMap: {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    },
  });
  opts.conditions.userId = userId;
  Object.assign(opts.conditions, notificationConditions(query));
  return paginate(Notification, opts.conditions, opts);
}

async function markRead(userId, notificationId) {
  // Owner-only update: the user id is part of the query, so a random
  // id from another user simply matches nothing.
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId, readAt: null },
    { readAt: new Date() },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
  return notification;
}

async function markAllRead(userId) {
  const { modifiedCount } = await Notification.updateMany(
    { userId, readAt: null },
    { readAt: new Date() }
  );
  return { modifiedCount };
}

// READ one notification — owner-scoped, 404 on miss/foreign id.
async function getNotification(userId, id) {
  requireObjectId(id);
  const notification = await Notification.findOne({ _id: id, userId }).lean();
  if (!notification) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
  return notification;
}

// DELETE one notification ("dismiss this").
async function removeNotification(userId, id) {
  requireObjectId(id);
  const notification = await Notification.findOneAndDelete({ _id: id, userId });
  if (!notification) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
  return notification;
}

module.exports = {
  createNotification,
  unreadCount,
  listNotifications,
  markRead,
  markAllRead,
  getNotification,
  removeNotification,
};