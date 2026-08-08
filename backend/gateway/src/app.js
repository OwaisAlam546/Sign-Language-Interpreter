// ─────────────────────────────────────────────────────────────
//  app.js — EXPRESS FACTORY
//  Builds the whole middleware + routing stack. Exported without
//  listening so supertest/verify scripts can test it directly.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const helmet = require('helmet'); // security headers
const morgan = require('morgan'); // HTTP request logging
const cookieParser = require('cookie-parser'); // read refresh-token cookie

const env = require('./config/env');
const corsMiddleware = require('./middleware/cors');
const rateLimiter = require('./middleware/rateLimiter');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by'); // don't advertise the framework
if (env.isProd) app.set('trust proxy', 1); // correct client IPs behind a load balancer

// ── Global middleware ────────────────────────────────────────
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '2mb' })); // REST payloads are small; frames go via WS
app.use(cookieParser());
app.use(morgan(env.isProd ? 'combined' : 'dev', { skip: () => env.isTest }));
app.use(rateLimiter.api);

// ── Routes ───────────────────────────────────────────────────
app.get('/', (req, res) =>
  res.json({ service: 'SignSpeak AI — API Gateway', version: '1.0.0', api: '/api/v1' })
);
app.use('/health', routes.health); // load-balancer probe (unversioned)
app.use('/api/v1', routes.api); // all features

// ── Error handling (must be LAST) ────────────────────────────
app.use(notFound); // unknown route → structured 404
app.use(errorHandler); // every thrown error becomes a JSON response

module.exports = app;
