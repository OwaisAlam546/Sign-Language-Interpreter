// ─────────────────────────────────────────────────────────────
//  routes/notification.routes.js — NOTIFICATIONS FEATURE
//  GET    /notifications             → my inbox (paginated, filter read)
//  GET    /notifications/unread-count → unread badge number
//  PATCH  /notifications/:id/read    → open one notification
//  PATCH  /notifications/read-all    → mark every unread as read
//  All routes are scoped to the logged-in user.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notification.controller');

const router = express.Router();

router.use(auth);

router.get('/unread-count', notificationController.unreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.get('/', notificationController.list);
router.get('/:id', notificationController.getOne);     // after the literals,
router.delete('/:id', notificationController.remove);  // so "unread-count" can't be read as an id

module.exports = router;