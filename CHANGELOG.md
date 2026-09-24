# Changelog

This file records the sign-recognition work in this repository. Dates refer to
the local project date.

## 2026-08-30 — Baseline audit (before remediation)

### Recognition limitations found

- The browser live demo detected hands with MediaPipe but classified poses with
  a nine-rule geometry classifier; it did not call the server LSTM.
- The demo could therefore emit only `A`, `B`, `D`, `L`, `O`, `V`, `U`, `3`,
  and `4`, while the UI claimed alphabet and word recognition.
- Several rule labels were not valid ASL mappings, including thumbs-up being
  emitted as `U` and an open thumb being treated as `B`.
- The shipped sequence model has 27 labels (`A`–`Z` and synthetic `HELLO`),
  not the 41 classes claimed in the frontend.
- The training extractor converts each still image into twelve repeated frames.
  It cannot validate or learn motion signs (for example J/Z) or real word
  signs; no independent signer/video evaluation set is supplied in this repo.

### Live-output defects found

- A character was committed after only three render frames.
- The same character could not be entered twice in a word because a neutral
  pose did not re-arm the transcription state.
- The first MediaPipe hand was always used, so two hands could make output
  jump as detector ordering changed.
- Stale gesture/confidence values remained visible after tracking was lost.
- Canvas hand-label chips could overlap when hands were close together.
- Simulated fallback output was presented like genuine recognition.

### Claims needing correction

- The frontend contained static, unverified values for accuracy, precision,
  recall, F1, class count, samples, and word-sign training.

## 2026-08-30 — Remediation

- Replaced browser geometry-rule classification with 12-frame requests to the
  gateway's TensorFlow sequence-model endpoint. The live UI now refuses to
  create text when the model is not loaded, unavailable, or uncertain.
- Added the Vite development proxy for the gateway API.
- Raised MediaPipe detector/tracker thresholds and selected one hand by its
  continuing wrist position instead of trusting the detector's array order.
- Added confidence, temporal-stability, neutral-pose, and request-order gates.
  A sign requires four matching predictions; a repeated letter requires a
  neutral pose; only one request is active at a time.
- Removed the simulated-recognition fallback and stale prediction display.
- Changed committed output into wrapping word chips so it cannot truncate or
  visually overlap previous words.
- Added collision avoidance for hand-label chips in the canvas overlay.
- Accuracy claims remain historical/unverified until an independently held-out
  real-video, signer-separated evaluation is added; they are not used by the
  live recognition path.
- Replaced unsupported frontend performance figures and training claims with
  the actual bundled-label count and an explicit pending-evaluation status.
- Updated hero, workflow, and README copy so it describes the actual
  MediaPipe-to-server-model flow and does not present simulated recognition or
  unmeasured accuracy as a production capability.
- Made TensorFlow CPU a required AI-service dependency so the shipped Keras
  sequence model is loaded in normal deployments instead of silently falling
  back to geometry rules.
- Forwarded the sequence-voting strategy through the gateway and reject NaN,
  infinity, and non-numeric landmarks at the AI-service boundary.
