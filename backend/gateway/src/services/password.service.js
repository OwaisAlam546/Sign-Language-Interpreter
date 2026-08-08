// ─────────────────────────────────────────────────────────────
//  services/password.service.js — PASSWORD HASHING
//  All hashing/compare logic in one place (bcrypt, cost 12).
//  The User model's pre-save hook and change-password flow both
//  go through here — no service can hash "its own way".
// ─────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12; // OWASP recommendation: ≥ 10

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, comparePassword };