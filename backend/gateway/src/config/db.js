// ─────────────────────────────────────────────────────────────
//  config/db.js — MONGODB CONNECTION
//  Uses MONGO_URI from env. When it's empty (typical dev demo),
//  lazily boots an in-memory MongoDB via mongodb-memory-server so
//  the project runs with ZERO database setup.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const env = require('./env');

async function connectDB() {
  let uri = env.mongoUri;

  if (!uri) {
    // Production MUST never silently boot an in-memory store — it also
    // can't: mongodb-memory-server is a devDependency (Docker installs
    // --omit=dev). Fail fast with the same clarity env.js gives secrets.
    if (env.isProd) {
      throw new Error(
        'MONGO_URI is required in production — set it in .env (see deploy/.env.production)'
      );
    }
    logger.warn('MONGO_URI not set — starting in-memory MongoDB (dev fallback). Set MONGO_URI in .env for a real database.');
    // Lazy require: this package is never loaded in production (devDependency)
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongo = await MongoMemoryServer.create();
    uri = mongo.getUri();
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  logger.info(`MongoDB connected: ${uri.split('?')[0]}`);
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
