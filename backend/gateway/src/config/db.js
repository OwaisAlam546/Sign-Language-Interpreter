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
