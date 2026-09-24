// ─────────────────────────────────────────────────────────────
//  routes/ai.routes.js — AI PROXY (Phase 9)
//  The gateway's public face for the inference service. Every
//  handler is a passthrough: the AI envelope (success/data or
//  success/error) is forwarded verbatim, so the frontend has ONE
//  contract to learn — the gateway's.
//  /tts streams the WAV from FastAPI through to the browser.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ai = require('../services/ai.service');

const router = express.Router();

// GET /api/v1/ai/health — deep probe (AI up?), used by the frontend readiness gate
router.get('/health', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { ai: 'up', ...(await ai.health()).data } });
}));

// GET /api/v1/ai/model-status — engine, warmup, labels
router.get('/model-status', asyncHandler(async (req, res) => {
  res.json(await ai.modelStatus());
}));

// POST /api/v1/ai/predict — one hand → a letter
router.post('/predict', asyncHandler(async (req, res) => {
  res.json(await ai.predict(req.body.hand));
}));

// POST /api/v1/ai/predict-sequence — a frame window → letter or word
router.post('/predict-sequence', asyncHandler(async (req, res) => {
  res.json(await ai.predictSequence(req.body.frames, req.body.strategy));
}));

// POST /api/v1/ai/process-frame — MediaPipe pipeline for one frame
router.post('/process-frame', asyncHandler(async (req, res) => {
  res.json(await ai.processFrame(req.body));
}));

// POST /api/v1/ai/tts — STREAMED passthrough. The WAV never touches
// gateway memory in full: pipe FastAPI → Express → browser.
router.post('/tts', asyncHandler(async (req, res) => {
  const { stream, headers } = await ai.speechStream(req.body.text);
  res.status(200);
  if (headers['content-type']) res.set('Content-Type', headers['content-type']);
  if (headers['content-length']) res.set('Content-Length', headers['content-length']);
  stream.on('error', () => res.end());
  res.on('close', () => stream.destroy()); // browser left → stop pulling
  stream.pipe(res);
}));

module.exports = router;
