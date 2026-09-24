// ─────────────────────────────────────────────────────────────
//  services/ai.service.js — PREDICTION SERVICE (Express side)
//  The typed facade over ai.client: one method per FastAPI
//  endpoint, so routes never touch axios/envelopes themselves.
//  Errors bubble up as ApiError → central error handler →
//  { success:false, error:{...} } with the AI's own code.
// ─────────────────────────────────────────────────────────────
const client = require('./ai.client');

module.exports = {
  // Liveness of the inference service itself
  health: () => client.call('get', '/health'),

  // Loaded model + warm-up info (engine, inputMode, labels, warmupMs)
  modelStatus: () => client.call('get', '/api/v1/model-status'),

  // One static frame → { gesture, confidence, type } (rule engine fallback)
  predict: (hand) => client.call('post', '/api/v1/predict', { landmarks: hand }),

  // A window of frames → LSTM prediction with threshold/unknown gates
  predictSequence: (frames, strategy = 'majority') => client.call('post', '/api/v1/predict-sequence', { frames, strategy }),

  // Phase 7: full MediaPipe hand pipeline for one frame
  processFrame: (payload) => client.call('post', '/api/v1/process-frame', payload),

  // Streaming: returns { stream, headers } — the route pipes it to the
  // browser, never buffering audio in gateway memory.
  speechStream: (text) => client.call('post', '/api/v1/text-to-speech', { text }, { stream: true }),
};
