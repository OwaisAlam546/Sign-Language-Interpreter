// ─────────────────────────────────────────────────────────────
//  services/user.service.js — PROFILE BUSINESS LOGIC
//  Includes change-password, which revokes every session: if the
//  device is lost/stolen, the old tokens stop working instantly.
// ─────────────────────────────────────────────────────────────
const User = require('../models/user.model');
const tokenService = require('./token.service');
const { purgeUserData } = require('./purge.service');
const ApiError = require('../utils/ApiError');

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User does not exist.');
  return user;
}

async function updateProfile(userId, { name, avatarUrl }) {
  // Build the update object explicitly — undefined fields must not overwrite
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true, // return the updated document
    runValidators: true, // enforce schema rules on update too
  });
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User does not exist.');
  return user;
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User does not exist.');

  const currentOk = await user.comparePassword(currentPassword);
  if (!currentOk) throw new ApiError(401, 'WRONG_PASSWORD', 'Current password is incorrect.');

  user.password = newPassword; // pre-save hook re-hashes
  await user.save();
  await tokenService.revokeAllUserSessions(userId); // log out every other session
  return user;
}

// DELETE my own account ("Delete my account", GDPR-style).
// Shares the same cascade as the admin flow — one purge util, two
// callers — so no code path can forget a collection.
async function deleteAccount(userId) {
  await purgeUserData(userId); // sessions die here → all tokens invalid
  const user = await User.findByIdAndDelete(userId);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User does not exist.');
  return user;
}

module.exports = { getProfile, updateProfile, changePassword, deleteAccount };
