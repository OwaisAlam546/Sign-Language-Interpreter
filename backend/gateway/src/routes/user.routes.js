// ─────────────────────────────────────────────────────────────
//  routes/user.routes.js — PROFILE FEATURE
//  Every route here requires a logged-in user (auth middleware).
// ─────────────────────────────────────────────────────────────
const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const userController = require('../controllers/user.controller');

const router = express.Router();

const updateSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  avatarUrl: Joi.string().uri(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(72)
    .pattern(/(?=.*[A-Za-z])/, 'must contain a letter')
    .pattern(/(?=.*\d)/, 'must contain a number')
    .required(),
});

router.use(auth); // protect the whole feature in one line

router.get('/me', userController.getMe);
router.patch('/me', validate(updateSchema), userController.updateMe);
router.delete('/me', userController.deleteAccount);
router.patch('/change-password', validate(changePasswordSchema), userController.changePassword);

module.exports = router;
