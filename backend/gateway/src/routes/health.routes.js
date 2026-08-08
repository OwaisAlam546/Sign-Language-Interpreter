// ─────────────────────────────────────────────────────────────
//  routes/health.routes.js — LIVENESS + DEPENDENCY PROBES
//  GET /health        → is this gateway alive? (load balancer probe)
//  GET /health/ai     → is the AI service reachable? (honest 503 when down)
// ─────────────────────────────────────────────────────────────
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const aiService = require('../services/ai.service');
const env = require('../config/env');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

router.get(
  '/ai',
  asyncHandler(async (req, res) => {
    try {
      const health = await aiService.health();
      res.json({ success: true, data: { ai: 'up', ...health } });
    } catch {
      // No fabricated data: report the dependency as down with a clear code
      res.status(503).json({
        success: false,
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: `AI service unreachable at ${env.aiServiceUrl}`,
        },
      });
    }
  })
);

module.exports = router;
