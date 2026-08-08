// ─────────────────────────────────────────────────────────────
//  services/analytics.service.js — ANALYTICS DASHBOARD (Phase 11)
//  Chart-ready backend for the dashboard screens. One call builds
//  every series the frontend plots: prediction counts, accuracy,
//  latency, fps, most-used gestures, daily/weekly/monthly usage,
//  user statistics and model statistics.
//  Same payload shape for a user's own dashboard (scope 'user')
//  and the platform dashboard (scope 'admin') — the only
//  difference is whether every query is filtered by userId.
//  Series are zero-filled: every bucket is present, gaps are 0,
//  so charts need no client-side padding.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Translation = require('../models/translation.model');

const DAY_MS = 24 * 60 * 60 * 1000;

// UTC helpers — match $dateToString's UTC output exactly.
const ymd = (d) => d.toISOString().slice(0, 10);
const startOfUtcWeek = (d) => {
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
};
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const mid = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const p95 = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)];
};
const round2 = (n) => (n === null ? null : Math.round(n * 100) / 100);

// Zero-filled label→count series: every bucket present, gaps = 0.
const fillSeries = (map, labels) =>
  labels.map((label) => ({ label, count: map.get(label) ?? 0 }));

async function buildDashboard({ scope = 'user', userId = null } = {}) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const d30 = new Date(todayStart.getTime() - 29 * DAY_MS); // 30-day window incl. today
  const d60 = new Date(todayStart.getTime() - 59 * DAY_MS); // covers 8 ISO weeks
  const d365 = new Date(todayStart.getTime() - 364 * DAY_MS);
  // Aggregates do NOT cast $match values (queries do) — cast by hand.
  const scopeMatch = scope === 'admin' ? {} : { userId: new mongoose.Types.ObjectId(userId) };

  // Chart x-axes, oldest → newest.
  const dailyLabels = Array.from({ length: 30 }, (_, i) => ymd(new Date(todayStart.getTime() - (29 - i) * DAY_MS)));
  const weekStartNow = startOfUtcWeek(now);
  const weeklyLabels = Array.from({ length: 8 }, (_, i) => ymd(new Date(weekStartNow.getTime() - (7 - i) * 7 * DAY_MS)));
  const monthlyLabels = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });

  // Aligned Promise.all — every slot's position is fixed by name.
  const [counts, accuracy, latency, fps, gestures, dailyRaw, weeklyRaw, monthlyRaw, models, userStats] =
    await Promise.all([
      // 1. Prediction counts — period splits for the headline cards
      Promise.all([
        Translation.countDocuments(scopeMatch),
        Translation.countDocuments({ ...scopeMatch, createdAt: { $gte: todayStart } }),
        Translation.countDocuments({ ...scopeMatch, createdAt: { $gte: d30 } }),
        Translation.countDocuments({ ...scopeMatch, createdAt: { $gte: new Date(todayStart.getTime() - 6 * DAY_MS) } }),
      ]),
      // 2. Accuracy — mean confidence + share of predictions ≥ 0.8
      Translation.aggregate([
        { $match: { ...scopeMatch, confidence: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$confidence' }, high: { $sum: { $cond: [{ $gte: ['$confidence', 0.8] }, 1, 0] } }, n: { $sum: 1 } } },
      ]),
      // 3. Latency — raw values, percentiles computed in JS
      Translation.aggregate([
        { $match: { ...scopeMatch, latencyMs: { $ne: null }, createdAt: { $gte: d30 } } },
        { $project: { _id: 0, latencyMs: 1 } },
      ]),
      // 4. FPS — same treatment
      Translation.aggregate([
        { $match: { ...scopeMatch, fps: { $ne: null }, createdAt: { $gte: d30 } } },
        { $project: { _id: 0, fps: 1 } },
      ]),
      // 5. Most used gestures (named only — letters carry no gesture)
      Translation.aggregate([
        { $match: { ...scopeMatch, gesture: { $ne: '' } } },
        { $group: { _id: '$gesture', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // 6. Daily usage — per-day counts over the 30-day window
      Translation.aggregate([
        { $match: { ...scopeMatch, createdAt: { $gte: d30 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      // 7. Weekly usage — day buckets rolled into ISO weeks in JS
      Translation.aggregate([
        { $match: { ...scopeMatch, createdAt: { $gte: d60 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      // 8. Monthly usage — per-month counts over the last 12 months
      Translation.aggregate([
        { $match: { ...scopeMatch, createdAt: { $gte: d365 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      // 9. Model statistics — per-engine health card ($avg skips nulls)
      Translation.aggregate([
        { $match: scopeMatch },
        { $group: { _id: '$engine', count: { $sum: 1 }, avgConfidence: { $avg: '$confidence' }, avgLatencyMs: { $avg: '$latencyMs' }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } },
      ]),
      // 10. User statistics — scope decides which questions to ask
      scope === 'admin'
        ? Promise.all([
            User.countDocuments(),
            Translation.distinct('userId', { createdAt: { $gte: d30 } }).then((ids) => ids.length),
            User.countDocuments({ createdAt: { $gte: d30 } }),
            Translation.aggregate([
              { $group: { _id: '$userId', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 5 },
            ]),
          ])
        : Promise.resolve(null),
    ]);

  const acc = accuracy[0]; // single $group doc (empty array when no rows yet)
  const latencyValues = latency.map((r) => r.latencyMs);
  const fpsValues = fps.map((r) => r.fps);

  const dailyMap = new Map(dailyRaw.map((d) => [d._id, d.count]));
  const weeklyMap = new Map();
  for (const d of weeklyRaw) {
    const wk = ymd(startOfUtcWeek(new Date(d._id + 'T00:00:00Z')));
    weeklyMap.set(wk, (weeklyMap.get(wk) ?? 0) + d.count);
  }
  const monthlyMap = new Map(monthlyRaw.map((d) => [d._id, d.count]));

  let userStatistics;
  if (scope === 'admin') {
    const [totalUsers, activeUsers, newUsers, topRaw] = userStats;
    const topUsers = topRaw.length
      ? await User.find({ _id: { $in: topRaw.map((t) => t._id) } })
          .lean()
          .then((users) =>
            topRaw.map((t) => {
              const u = users.find((x) => String(x._id) === String(t._id));
              return { name: u ? u.name : 'deleted', count: t.count };
            })
          )
      : [];
    userStatistics = { totalUsers, activeUsers30d: activeUsers, newUsers30d: newUsers, topUsers };
  } else {
    // Own dashboard: activity comes from the daily series already fetched.
    const windowTotal = [...dailyMap.values()].reduce((a, b) => a + b, 0);
    const activeDays = dailyMap.size;
    let streak = 0; // consecutive days with activity, counting back from today
    for (let i = 0; i < 60; i += 1) {
      if (i === 0 && !(dailyMap.get(ymd(new Date(todayStart.getTime()))) > 0)) continue;
      if (dailyMap.get(ymd(new Date(todayStart.getTime() - i * DAY_MS))) > 0) streak += 1;
      else break;
    }
    userStatistics = {
      totalTranslations: counts[0],
      activeDays,
      avgPerActiveDay: activeDays ? round2(windowTotal / activeDays) : 0,
      streak,
    };
  }

  return {
    predictionCount: {
      total: counts[0],
      today: counts[1],
      last7Days: counts[3],
      last30Days: counts[2],
    },
    accuracy: {
      avgConfidence: acc ? round2(acc.avg) : null,
      highConfidenceRate: acc && acc.n ? round2(acc.high / acc.n) : null,
    },
    latency: {
      avgMs: round2(avg(latencyValues)),
      medianMs: round2(mid(latencyValues)),
      p95Ms: round2(p95(latencyValues)),
    },
    fps: { avg: round2(avg(fpsValues)), median: round2(mid(fpsValues)) },
    mostUsedGestures: gestures.map((g) => ({ gesture: g._id, count: g.count })),
    dailyUsage: fillSeries(dailyMap, dailyLabels),
    weeklyUsage: fillSeries(weeklyMap, weeklyLabels),
    monthlyUsage: fillSeries(monthlyMap, monthlyLabels),
    userStatistics,
    modelStatistics: models.map((m) => ({
      engine: m._id,
      count: m.count,
      avgConfidence: round2(m.avgConfidence ?? 0),
      avgLatencyMs: round2(m.avgLatencyMs ?? 0),
      successRate: round2((m.count - m.failed) / m.count),
    })),
  };
}

module.exports = { buildDashboard };
