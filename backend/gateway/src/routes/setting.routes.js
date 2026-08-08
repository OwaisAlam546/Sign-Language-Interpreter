// ─────────────────────────────────────────────────────────────
//  routes/setting.routes.js — SETTINGS FEATURE
//  GET  /settings        → public system defaults (no login needed)
//  GET  /settings/me     → my preferences (login required)
//  PATCH /settings/me    → upsert one of my preferences
// ─────────────────────────────────────────────────────────────
const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const settingController = require('../controllers/setting.controller');

const router = express.Router();

// /settings is PUBLIC by design (app defaults every client needs).
router.get('/', settingController.system);

// Everything below requires a logged-in user.
router.use(auth);

const settingSchema = Joi.object({
  key: Joi.string().pattern(/^[a-zA-Z0-9._-]+$/).max(60).required(),
  value: Joi.any().required(),
});

router.get('/me', settingController.listMine);
router.patch('/me', validate(settingSchema), settingController.setMine);
router.delete('/me/:key', settingController.removeUserKey);

module.exports = router;