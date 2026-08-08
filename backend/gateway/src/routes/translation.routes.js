// ─────────────────────────────────────────────────────────────
//  routes/translation.routes.js — TRANSLATION HISTORY FEATURE
//  POST   /translations            → save a completed translation
//  GET    /translations            → paginated history (?search=&type=...)
//  GET    /translations/stats      → dashboard aggregates
//  GET    /translations/:id        → read one record
//  PATCH  /translations/:id        → edit it (whitelisted fields)
//  DELETE /translations/:id        → delete one record
//  DELETE /translations            → clear all of my history
//  NOTE: /stats is registered before /:id so Express never treats
//  the literal "stats" as an id.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const translationController = require('../controllers/translation.controller');
const { TRANSLATION_TYPES } = require('../constants');

const router = express.Router();

const createSchema = Joi.object({
  type: Joi.string().valid(...TRANSLATION_TYPES).required(),
  text: Joi.string().trim().max(500).required(),
  prediction: Joi.string().trim().max(200),
  userSpeech: Joi.string().trim().max(2000),
  gesture: Joi.string().trim().max(100),
  confidence: Joi.number().min(0).max(1),
  fps: Joi.number().min(0),
  latencyMs: Joi.number().min(0),
  engine: Joi.string().valid('mediapipe', 'lstm'),
  status: Joi.string().valid('completed', 'failed'),
  inputMode: Joi.string().valid('webcam', 'upload', 'audio'),
  errorMessage: Joi.string().trim().max(500),
  audioUrl: Joi.string().uri(),
});

// PATCH may send any subset — every field optional.
const updateSchema = Joi.object({
  text: Joi.string().trim().max(500),
  prediction: Joi.string().trim().max(200),
  gesture: Joi.string().trim().max(100),
  userSpeech: Joi.string().trim().max(2000),
  confidence: Joi.number().min(0).max(1),
  engine: Joi.string().valid('mediapipe', 'lstm'),
  status: Joi.string().valid('completed', 'failed'),
  inputMode: Joi.string().valid('webcam', 'upload', 'audio'),
});

router.use(auth);

router.post('/', validate(createSchema), translationController.create);
router.get('/', translationController.list);
router.get('/stats', translationController.stats); // literal BEFORE :id
router.get('/export', translationController.exportHistory); // literal BEFORE :id
router.get('/:id', translationController.getOne);
router.patch('/:id', validate(updateSchema), translationController.update);
router.delete('/:id', translationController.remove);
router.delete('/', translationController.clear);

module.exports = router;