// ─────────────────────────────────────────────────────────────
//  services/admin.service.js — ADMIN LOGIC
//  Only reachable through routes guarded by auth + authorize('admin').
//  Deleting a user delegates to the shared purge cascade, and the
//  stats endpoint gives the report a one-call dashboard summary.
// ─────────────────────────────────────────────────────────────
const User = require('../models/user.model');
const Translation = require('../models/translation.model');
const Feedback = require('../models/feedback.model');
const Notification = require('../models/notification.model');
const PredictionLog = require('../models/predictionLog.model');
const { purgeUserData } = require('./purge.service');
const ApiError = require('../utils/ApiError');
const { buildListQuery, paginate } = require('../utils/listQuery');

// Paginated + searchable user directory (?search=, ?role=, ?sort=).
async function listUsers(query) {
  const opts = buildListQuery(query, {
    searchFields: ['name', 'email'],
    filterFields: { role: 'role' },
    sortMap: {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    },
  });
  return paginate(User, opts.conditions, opts);
}

async function getUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User does not exist.');
  return user;
}

async function setUserRole(userId, role, actingAdminId) {
  // An admin must not demote/change their own role — that is the
  // classic way to lock the system out of every admin account.
  if (userId === actingAdminId) {
    throw new ApiError(400, 'INVALID_OPERATION', 'You cannot change your own role.');
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true }
  );
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User does not exist.');
  return user;
}

async function deleteUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User does not exist.');

  await purgeUserData(userId);            // sessions, history, feedback, notifications, settings
  await User.deleteOne({ _id: userId });  // then the identity itself
  return user;
}

// One-call dashboard summary for the admin console / project report.
// Six parallel countDocuments — each one index-backed, all cheap.
async function getStats() {
  const [users, translations, predictionLogs, feedback, pendingFeedback, unreadNotifications] =
    await Promise.all([
      User.countDocuments(),
      Translation.countDocuments(),
      PredictionLog.countDocuments(),
      Feedback.countDocuments(),
      Feedback.countDocuments({ resolved: false }),
      Notification.countDocuments({ readAt: null }),
    ]);
  return { users, translations, predictionLogs, feedback, pendingFeedback, unreadNotifications };
}

// ── ANALYTICS (Phase 10) ─────────────────────────────────────
// Deeper platform view than /stats: activity over time, content mix,
// model quality, and engagement — fed by parallel aggregates that
// re-read the same collections /stats counts, so the numbers can
// never disagree with the raw tables.
async function getAnalytics() {
  const DAY = 24 * 60 * 60 * 1000;
  const today = new Date(Date.now() - DAY);
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const monthAgo = new Date(Date.now() - 30 * DAY);

  const [
    counts, activity, quality, byType, engineMix, statusCounts,
    topGestures, engagement,
  ] = await Promise.all([
    // 1. Headline counts (same shape as /stats)
    Promise.all([
      User.countDocuments(),
      Translation.countDocuments(),
      PredictionLog.countDocuments(),
      Feedback.countDocuments(),
    ]),
    // 2. Activity buckets
    Promise.all([
      Translation.countDocuments({ createdAt: { $gte: today } }),
      Translation.countDocuments({ createdAt: { $gte: monthAgo } }),
      Translation.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]),
    // 3. Model quality: confidence + latency from real rows only
    Promise.all([
      Translation.aggregate([
        { $match: { confidence: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$confidence' }, max: { $max: '$confidence' } } },
      ]),
      Translation.aggregate([
        { $match: { latencyMs: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$latencyMs' } } },
      ]),
    ]),
    // 4. Content mix
    Translation.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    Translation.aggregate([{ $group: { _id: '$engine', count: { $sum: 1 } } }]),
    Translation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    // 5. Top gestures (only named — empty gesture rows are letters)
    Translation.aggregate([
      { $match: { gesture: { $ne: '' } } },
      { $group: { _id: '$gesture', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    // 6. Engagement: distinct active users + rows carrying user speech
    Promise.all([
      Translation.distinct('userId', { createdAt: { $gte: monthAgo } }).then((ids) => ids.length),
      Translation.countDocuments({ userSpeech: { $ne: '' } }),
    ]),
  ]);

  return {
    counts: { users: counts[0], translations: counts[1], predictions: counts[2], feedback: counts[3] },
    activity: {
      today: activity[0],
      last30Days: activity[1],
      last7Days: activity[2].map((d) => ({ date: d._id, count: d.count })),
    },
    quality: {
      avgConfidence: quality[0][0]?.avg ?? null,
      maxConfidence: quality[0][0]?.max ?? null,
      avgLatencyMs: quality[1][0]?.avg ?? null,
    },
    content: {
      byType: byType.map((t) => ({ type: t._id, count: t.count })),
      byEngine: engineMix.map((e) => ({ engine: e._id, count: e.count })),
      failed: statusCounts.find((s) => s._id === 'failed')?.count ?? 0,
      topGestures: topGestures.map((g) => ({ gesture: g._id, count: g.count })),
    },
    engagement: { activeUsers: engagement[0], withUserSpeech: engagement[1] },
  };
}

module.exports = { listUsers, getUser, setUserRole, deleteUser, getStats, getAnalytics };