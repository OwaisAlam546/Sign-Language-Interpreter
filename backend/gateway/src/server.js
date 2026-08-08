// ─────────────────────────────────────────────────────────────
//  server.js — ENTRY POINT
//  Boot order matters: env → MongoDB → app → listen.
//  Kept separate from app.js so tests can build the app
//  without ever opening a port.
// ─────────────────────────────────────────────────────────────
const env = require('./config/env');
const logger = require('./utils/logger');
const { connectDB, disconnectDB } = require('./config/db');

async function start() {
  try {
    await connectDB();

    // app.js is required AFTER the DB is ready — models need a connection
    const app = require('./app');

    const server = app.listen(env.port, () => {
      logger.info(`SignSpeak API Gateway listening on http://localhost:${env.port} (${env.nodeEnv})`);
    });

    // Graceful shutdown: stop accepting requests, close DB, then exit.
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
