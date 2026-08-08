// ─────────────────────────────────────────────────────────────
//  seed/admin.seed.js — DEFAULT ADMIN ACCOUNT
//  Idempotent upsert of an admin login so the admin panel / role
//  features are usable immediately.
//    login:    admin@signspeak.ai
//    password: Admin123456
//  CHANGE the password after first login, and never ship this
//  account in production.
//  Run: npm run seed   (or import seedAdmin for tests)
// ─────────────────────────────────────────────────────────────
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/user.model');
const logger = require('../utils/logger');

const ADMIN = {
  name: 'SignSpeak Admin',
  email: 'admin@signspeak.ai',
  password: 'Admin123456',
  role: 'admin',
  isEmailVerified: true,
};

async function seedAdmin() {
  // Upsert by unique email; never overwrite a manually-configured admin
  const existing = await User.findOne({ email: ADMIN.email });
  if (existing) return 'exists';
  await User.create(ADMIN);
  return 'created';
}

async function main() {
  // In production the default admin is created ONLY on explicit request
  // (SEED_ADMIN=true in .env) — never boot with a known default password.
  const env = require('../config/env');
  if (env.isProd && process.env.SEED_ADMIN !== 'true') {
    logger.warn('Prod: skipping default admin seed. Set SEED_ADMIN=true to create admin@signspeak.ai.');
    return;
  }
  await connectDB();
  const result = await seedAdmin();
  logger.info(`Admin seeded (${result}) — admin@signspeak.ai / ${ADMIN.password}`);
  await disconnectDB();
}

// Run directly via `npm run seed`, or import for tests/verify
if (require.main === module) {
  main().catch((err) => {
    logger.error('Admin seed failed', err);
    process.exit(1);
  });
}

module.exports = { seedAdmin, ADMIN };