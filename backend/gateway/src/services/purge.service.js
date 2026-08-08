// ─────────────────────────────────────────────────────────────
//  services/purge.service.js — ACCOUNT CASCADE CLEANUP
//  The one place that knows which collections a user owns.
//  Admin user-deletion and user self-deletion ("Delete my account")
//  both call it, so the orphan-free guarantee can never drift
//  between the two flows (see docs/DATABASE.md §3).
// ─────────────────────────────────────────────────────────────
const RefreshToken = require('../models/refreshToken.model');
const Translation = require('../models/translation.model');
const Feedback = require('../models/feedback.model');
const Notification = require('../models/notification.model');
const Setting = require('../models/setting.model');

// Remove every document owned by the user — in parallel.
// PredictionLogs are deliberately NOT here: they are pipeline
// telemetry keyed by nothing user-facing, and are TTL-purged (§2).
async function purgeUserData(userId) {
  await Promise.all([
    RefreshToken.deleteMany({ userId }),
    Translation.deleteMany({ userId }),
    Feedback.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    Setting.deleteMany({ userId }),
  ]);
}

module.exports = { purgeUserData };