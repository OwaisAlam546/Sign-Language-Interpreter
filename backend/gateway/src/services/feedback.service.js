// ─────────────────────────────────────────────────────────────
//  services/feedback.service.js — FEEDBACK BUSINESS LOGIC
//  Full CRUD: create (auto-notification), my-list, read-one,
//  edit-own (locked once admin resolves), delete-own, plus the
//  admin moderation side (list-all, resolve, delete).
//  Submitting feedback also drops a confirmation notification — a
//  real cross-collection data flow (feedback → notifications).
// ─────────────────────────────────────────────────────────────
const Feedback = require('../models/feedback.model');
const Notification = require('../models/notification.model');
const ApiError = require('../utils/ApiError');
const { requireObjectId } = require('../utils/objectId');
const { buildListQuery, paginate } = require('../utils/listQuery');

async function createFeedback(userId, { category, message, rating, translationId }) {
  const feedback = await Feedback.create({ userId, category, message, rating, translationId });

  // Data flow: feedback written → user notified. The notification
  // is a permanent acknowledgement — deleting feedback never deletes it.
  await Notification.create({
    userId,
    type: 'feedback',
    title: 'Feedback received',
    message: `Thanks! Your ${rating}★ feedback is in the report.`,
    ref: feedback._id.toString(),
  });

  return feedback;
}

// The user's own submission history (profile page).
async function listFeedback(userId, query) {
  const opts = buildListQuery(query, {
    filterFields: { category: 'category' },
    sortMap: {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    },
  });
  opts.conditions.userId = userId;
  return paginate(Feedback, opts.conditions, opts);
}

// READ one of MY submissions. Foreign ids → same 404 (no leak).
async function getFeedback(userId, id) {
  requireObjectId(id);
  const feedback = await Feedback.findOne({ _id: id, userId }).lean();
  if (!feedback) throw new ApiError(404, 'FEEDBACK_NOT_FOUND', 'Feedback not found.');
  return feedback;
}

// UPDATE my submission — but only while it is still open. Once an
// admin resolves it, the thread is frozen (409) so the moderation
// trail stays honest.
async function updateFeedback(userId, id, { message, rating, category }) {
  requireObjectId(id);
  const feedback = await Feedback.findOne({ _id: id, userId });
  if (!feedback) throw new ApiError(404, 'FEEDBACK_NOT_FOUND', 'Feedback not found.');
  if (feedback.resolved) {
    throw new ApiError(409, 'FEEDBACK_RESOLVED', 'This feedback was resolved and can no longer be edited.');
  }
  if (message !== undefined) feedback.message = message;
  if (rating !== undefined) feedback.rating = rating;
  if (category !== undefined) feedback.category = category;
  await feedback.save();
  return feedback;
}

// DELETE my submission.
async function deleteFeedback(userId, id) {
  requireObjectId(id);
  const feedback = await Feedback.findOneAndDelete({ _id: id, userId });
  if (!feedback) throw new ApiError(404, 'FEEDBACK_NOT_FOUND', 'Feedback not found.');
  return feedback;
}

// Admin moderator delete — no user scope, any submission.
async function removeFeedback(id) {
  requireObjectId(id);
  const feedback = await Feedback.findByIdAndDelete(id);
  if (!feedback) throw new ApiError(404, 'FEEDBACK_NOT_FOUND', 'Feedback not found.');
  return feedback;
}

// Admin moderation inbox — every submission, triage-first.
async function listAllFeedback(query) {
  const opts = buildListQuery(query, {
    filterFields: { category: 'category', rating: 'rating' },
    sortMap: {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    },
  });
  // boolean filter normalised from the query string
  if (query.resolved === 'true') opts.conditions.resolved = true;
  if (query.resolved === 'false') opts.conditions.resolved = false;
  return paginate(Feedback, opts.conditions, opts);
}

// Admin resolve / reopen — flips the moderation flag.
async function resolveFeedback(id, resolved) {
  requireObjectId(id);
  const feedback = await Feedback.findByIdAndUpdate(
    id,
    { resolved },
    { new: true, runValidators: true }
  );
  if (!feedback) throw new ApiError(404, 'FEEDBACK_NOT_FOUND', 'Feedback not found.');
  return feedback;
}

module.exports = {
  createFeedback,
  listFeedback,
  getFeedback,
  updateFeedback,
  deleteFeedback,
  listAllFeedback,
  resolveFeedback,
  removeFeedback,
};