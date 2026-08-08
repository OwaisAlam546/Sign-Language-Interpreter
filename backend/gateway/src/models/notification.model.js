// ─────────────────────────────────────────────────────────────
//  models/notification.model.js — NOTIFICATIONS (Collection: notifications)
//  Read-optimised inbox for a user. readAt is NULL until the user
//  opens the notification — so "unread" is `readAt: null`, an
//  index-friendly equality query (no bool + timestamp juggling).
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['feedback', 'translation', 'system', 'admin'],
      default: 'system',
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    ref: { type: String, default: '' }, // e.g. the feedback id this relates to
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Inbox page: "my notifications, unread first, newest first".
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
// The unread badge count (only run for one user at a time).
notificationSchema.index({ userId: 1, readAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema, 'notifications');