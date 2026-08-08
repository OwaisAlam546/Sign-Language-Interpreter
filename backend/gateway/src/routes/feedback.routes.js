// ─────────────────────────────────────────────────────────────
//  routes/feedback.routes.js — FEEDBACK FEATURE
//  POST   /feedback       → submit a rating + message (logged-in)
//  GET    /feedback       → my submissions (?category=&page=&limit=)
//  GET    /feedback/:id   → read one of mine
//  PATCH  /feedback/:id   → edit mine (409 once admin resolves it)
//  DELETE /feedback/:id   → delete mine
// ─────────────────────────────────────────────────────────────
const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const feedbackController = require('../controllers/feedback.controller');

const router = express.Router();

const FEEDBACK_CATEGORIES = ['accuracy', 'speed', 'language', 'ui', 'other'];

const createSchema = Joi.object({
  message: Joi.string().trim().max(1000).required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  category: Joi.string().valid(...FEEDBACK_CATEGORIES),
  translationId: Joi.string().hex().length(24),
});

const updateSchema = Joi.object({
  message: Joi.string().trim().max(1000),
  rating: Joi.number().integer().min(1).max(5),
  category: Joi.string().valid(...FEEDBACK_CATEGORIES),
});

router.use(auth); // feedback is only meaningful from a real account

router.post('/', validate(createSchema), feedbackController.create);
router.get('/', feedbackController.list);
router.get('/:id', feedbackController.getOne);
router.patch('/:id', validate(updateSchema), feedbackController.update);
router.delete('/:id', feedbackController.remove);

module.exports = router;