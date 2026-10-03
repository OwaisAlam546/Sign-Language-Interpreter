# Changelog

All notable project changes are recorded here.

## Unreleased

### Word-recognition safety and scope

- Removed the synthetic open/fist `HELLO` class from `scripts/train_toy_model.py` and its model smoke tests. Re-training that script now emits only the 26 alphabet classes; synthetic motion is not treated as ASL word data.
- The live UI now accepts a multi-letter word only when the active TensorFlow sequence model reports that exact label in `/model-status` vocabulary. The local ONNX alphabet model and unlisted server outputs cannot be committed as words.
- Kept fingerspelling composition enabled: stable A–Z signs still build text, and a pause resolves matching spellings against the app's word list (otherwise the spelled text remains visible).
- No isolated-word model was downloaded or trained: this checkout contains no WLASL metadata/videos or real word-sign sequences, and outbound GitHub access was unavailable. Word-level ASL recognition remains unavailable until a real labeled dataset and compatible trained weights are supplied.

#### Rollback for this change

After committing this feature as its own commit, roll it back with `git revert <feature-commit-sha>`. This checkout already had unrelated uncommitted edits in several touched files; do not use `git restore` on whole files here, because that would also discard those earlier edits. The feature-specific changes are limited to `frontend/src/sections/LiveDemo.jsx`, `frontend/src/lib/recognitionPolicy.js`, `frontend/scripts/smoke-test.mjs`, `backend/ai-service/scripts/train_toy_model.py`, `backend/ai-service/scripts/smoke_test.py`, `backend/ai-service/README.md`, and this changelog entry.

### Recognition and model integration

- Added local ONNX Runtime Web support for the pretrained ASL alphabet model and its A–Z class labels.
- Configured local ONNX Runtime WebAssembly assets so development does not incorrectly serve the app HTML in place of the WASM runtime.
- Matched browser model inputs to the pretrained model's reference preprocessing: convert normalized landmarks into camera pixel coordinates, preserve aspect ratio, center and scale the hand to 70% of the input canvas, draw the RGB MediaPipe-style colored skeleton, and resize from 192×192 to 96×96.
- Select the named `logits` ONNX output when available and fail clearly if its score count does not match the class labels.
- Average class probabilities across the latest eight model inferences and require ten consecutive matching results at the confidence threshold before committing a letter.
- Suppress static-letter recognition while the hand is moving and clear stale prediction evidence when tracking is lost or the pose is uncertain.
- Removed the local hand-written motion shortcut that could turn movement into a guessed word. Word recognition requires a compatible trained sequence model; the local pretrained model recognizes static alphabet signs.

### Hand tracking and camera pipeline

- Configure MediaPipe for one hand, matching the alphabet model's single-hand input, with 0.5 detection, presence, and tracking confidence thresholds.
- Added a per-landmark 1-Euro filter in pixel space to reduce landmark jitter while retaining responsiveness during movement.
- Use actual camera frame dimensions for inference and overlay coordinate mapping.
- Match the overlay to the displayed `object-cover` video crop and resize the overlay canvas with the responsive camera panel.
- Use only real camera observations for temporal stability; do not pad startup history by repeating copied frames.
- Measure hand movement against elapsed time and hand size before allowing static letters to commit.
- Keep the overlay label at `HAND` until the model provides a stable prediction, rather than showing letters from a separate geometric guess.

### Reliability and experience

- Keep hand tracking visible when the alphabet model cannot load and show a clear model error state.
- Add bounded health/model-status requests, camera retry handling, and safer response parsing.
- Include a synthetic UI demo and video-file test path for checking the interface without a live webcam.
- Improve responsive layout, live translation announcements, and alignment of the camera skeleton, bounding box, and hand label.

### Verification and scope

- Frontend smoke checks and production builds pass with the bundled model and local MediaPipe/ONNX Runtime assets.
- The browser model is for static A–Z signs. Motion-based words require a trained sequence model; the upstream reference uses separate rules for dynamic J/Z.
- The pretrained model's upstream README reports 93.7% accuracy on its held-out test set and identifies N as a weak class (54% recall). Results can vary with signer, camera framing, lighting, and hand pose.
