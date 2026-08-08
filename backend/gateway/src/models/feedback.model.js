// ─────────────────────────────────────────────────────────────
//  models/feedback.model.js — USER FEEDBACK (Collection: feedback)
//  Ratings + messages so the report can say "we listened to real
//  users during testing". Feedback links back to the translation
//  that triggered it (translationId) and carries a category so the
//  admin panel can filter UX vs accuracy complaints.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional link to the exact translation the feedback is about.
    translationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TranslationHistory',
      default: null,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 500,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    category: {
      type: String,
      enum: ['accuracy', 'speed', 'language', 'ui', 'other'],
      default: 'other',
    },
    resolved: {
      type: Boolean,
      default: false, // admin triage flag
    },
  },
  { timestamps: true }
);

// "My feedback, newest first" — the user profile page.
feedbackSchema.index({ userId: 1, createdAt: -1 });
// Admin triage: all feedback of a category, unmoderated first.
feedbackSchema.index({ category: 1, resolved: 1, createdAt: -1 });
// Join: jump from a translation to its feedback in one lookup.
feedbackSchema.index({ translationId: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema, 'feedback');