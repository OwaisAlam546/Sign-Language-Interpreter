// ─────────────────────────────────────────────────────────────
//  routes/gesture.routes.js — DICTIONARY FEATURE (public)
//  GET /gestures         → list, filters: ?category= ?q=
//  GET /gestures/:label  → one gesture
// ─────────────────────────────────────────────────────────────
const express = require('express');
const gestureController = require('../controllers/gesture.controller');

const router = express.Router();

router.get('/', gestureController.list);
router.get('/:label', gestureController.getOne);

module.exports = router;
