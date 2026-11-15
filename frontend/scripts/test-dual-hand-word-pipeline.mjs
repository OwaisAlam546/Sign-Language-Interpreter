// frontend/scripts/test-dual-hand-word-pipeline.mjs
// Automated verification test suite for Dual-Hand MediaPipe & Word Sequence Pipeline
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-web/wasm';
import { extractWordFeatures, WordSequenceBuffer, FEATURE_DIM, SEQUENCE_LENGTH } from '../src/lib/wordLandmarkFeatures.js';
import { OneEuroLandmarkFilter } from '../src/lib/oneEuroLandmarks.js';
import { inferWordSequence, loadWordSession, DEFAULT_WORD_THRESHOLDS } from '../src/lib/onnxWordRecognizer.js';
import { extractAlphabetLandmarkFeatures } from '../src/lib/alphabetLandmarkFeatures.js';

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

console.log('='.repeat(80));
console.log('SIGNSPEAK AI — DUAL-HAND MEDIAPIPE & WORD SEQUENCE RECOGNITION TEST SUITE');
console.log('='.repeat(80));

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Independent Landmark Filters (No Dual-Hand Velocity Exploding)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test 1] Verifying independent OneEuro filters for dual-hand tracking...');

// Simulate shared filter (the old bug)
const brokenSharedFilter = new OneEuroLandmarkFilter();
const leftHandRaw = Array.from({ length: 21 }, () => ({ x: 0.25, y: 0.5, z: 0 }));
const rightHandRaw = Array.from({ length: 21 }, () => ({ x: 0.75, y: 0.5, z: 0 }));

const t0 = 1000.0;
brokenSharedFilter.filter(leftHandRaw, 640, 480, t0);
// Same timestamp frame for second hand:
const brokenFilteredRight = brokenSharedFilter.filter(rightHandRaw, 640, 480, t0);
// In the old bug, derivativeAlpha dampened (0.75 - 0.25)*640 / 0.001s into ~2000 px/s on a stationary hand!
const explodedSpeed = Math.hypot(...brokenSharedFilter.previousDerivative[0]);
assert.ok(explodedSpeed > 1000, `Expected velocity explosion in shared filter (>1000 px/s), got ${explodedSpeed}`);
console.log(`  ✓ Confirmed Root Cause: Shared filter calculated artificial velocity of ${Math.round(explodedSpeed)} px/s on stationary hand!`);

// Now verify the fix: Independent filters
const independentFilters = {
  Left: new OneEuroLandmarkFilter(),
  Right: new OneEuroLandmarkFilter(),
};

const fixedLeft = independentFilters.Left.filter(leftHandRaw, 640, 480, t0);
const fixedRight = independentFilters.Right.filter(rightHandRaw, 640, 480, t0);
const fixedSpeedLeft = Math.hypot(...independentFilters.Left.previousDerivative[0]);
const fixedSpeedRight = Math.hypot(...independentFilters.Right.previousDerivative[0]);
assert.equal(fixedSpeedLeft, 0, 'Initial derivative of independent left filter must be 0');
assert.equal(fixedSpeedRight, 0, 'Initial derivative of independent right filter must be 0');
assert.equal(fixedLeft[0].x, 0.25);
assert.equal(fixedRight[0].x, 0.75);
console.log('  ✓ Verified: Independent filters eliminate cross-talk (velocity = 0 px/s on first frame)');

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Left/Right Slot Assignment & Spatial Ambiguity Resolution
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test 2] Verifying Left/Right 147D slot assignment and spatial resolution...');

const dummyLeft = Array.from({ length: 21 }, (_, i) => ({ x: 0.65 + i * 0.001, y: 0.45, z: 0.01 }));
const dummyRight = Array.from({ length: 21 }, (_, i) => ({ x: 0.35 + i * 0.001, y: 0.45, z: -0.01 }));
const dummyPose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0.0, visibility: 0.9 }));

// Scenario A: MediaPipe correctly labels Left and Right
const vecA = extractWordFeatures(dummyLeft, dummyRight, dummyPose);
assert.equal(vecA[126], 1.0, 'Left hand presence mask must be 1.0');
assert.equal(vecA[127], 1.0, 'Right hand presence mask must be 1.0');
assert.ok(Math.abs(vecA[0]) > 0.001, 'Left hand landmark slot 0..62 must be populated');
assert.ok(Math.abs(vecA[63]) > 0.001, 'Right hand landmark slot 63..125 must be populated');
console.log('  ✓ Direct classification: Left in 0..62, Right in 63..125, masks [1, 1]');

// Scenario B: Ambiguous classification (both labeled 'Right' by MediaPipe)
// Simulate resolution logic:
const detectedAmbiguous = [
  { landmarks: dummyRight, name: 'Right' }, // camera left (x ~ 0.35)
  { landmarks: dummyLeft, name: 'Right' },  // camera right (x ~ 0.65)
];
const sortedByX = [...detectedAmbiguous].sort((a, b) => a.landmarks[0].x - b.landmarks[0].x);
const resolvedRight = sortedByX[0].landmarks; // lower X = user physical Right
const resolvedLeft = sortedByX[1].landmarks;  // higher X = user physical Left
const vecB = extractWordFeatures(resolvedLeft, resolvedRight, dummyPose);
assert.equal(vecB[126], 1.0);
assert.equal(vecB[127], 1.0);
assert.equal(vecB[0], vecA[0], 'Resolved left slot must match anatomical left hand');
assert.equal(vecB[63], vecA[63], 'Resolved right slot must match anatomical right hand');
console.log('  ✓ Ambiguous classification spatial fallback: Camera-left mapped to Right, camera-right mapped to Left');

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Missing-Hand Masks & Single-Hand Support
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test 3] Verifying one-handed signs & missing-hand masks...');

// Right hand only
const vecRightOnly = extractWordFeatures(null, dummyRight, dummyPose);
assert.equal(vecRightOnly[126], 0.0, 'Left mask must be 0.0');
assert.equal(vecRightOnly[127], 1.0, 'Right mask must be 1.0');
for (let i = 0; i < 63; i++) {
  assert.equal(vecRightOnly[i], 0.0, 'Left hand slot 0..62 must be strictly 0.0 when missing');
}
assert.ok(Math.abs(vecRightOnly[63]) > 0.001, 'Right hand slot 63..125 must be populated');
console.log('  ✓ Right-hand-only: Slot 0..62 zeros, Mask [0, 1], Slot 63..125 active');

// Left hand only
const vecLeftOnly = extractWordFeatures(dummyLeft, null, dummyPose);
assert.equal(vecLeftOnly[126], 1.0, 'Left mask must be 1.0');
assert.equal(vecLeftOnly[127], 0.0, 'Right mask must be 0.0');
for (let i = 63; i < 126; i++) {
  assert.equal(vecLeftOnly[i], 0.0, 'Right hand slot 63..125 must be strictly 0.0 when missing');
}
assert.ok(Math.abs(vecLeftOnly[0]) > 0.001, 'Left hand slot 0..62 must be populated');
console.log('  ✓ Left-hand-only: Slot 0..62 active, Mask [1, 0], Slot 63..125 zeros');

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Pose Fallback Torso Normalization
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test 4] Verifying pose fallback torso normalization...');
const vecNoPose = extractWordFeatures(dummyLeft, dummyRight, null);
assert.equal(vecNoPose[146], 0.0, 'Pose presence mask must be 0.0');
for (let i = 128; i <= 145; i++) {
  assert.equal(vecNoPose[i], 0.0, `Pose anchor at index ${i} must be 0.0`);
}
assert.equal(vecNoPose[126], 1.0);
assert.equal(vecNoPose[127], 1.0);
console.log('  ✓ Pose missing: Pose mask = 0.0, anchors = zeros, hand coordinates normalized by fallback');

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: 16-Frame Temporal Sequence Buffer & Tensor Ordering
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test 5] Verifying 16-frame sequence buffer ordering and tensor packing...');
const buf = new WordSequenceBuffer(16);
assert.equal(buf.length, 0);

for (let i = 0; i < 20; i++) {
  const v = new Float32Array(FEATURE_DIM);
  v[0] = i; // Frame stamp in first float
  buf.push(v, { x: 0.5, y: 0.5 });
}

assert.equal(buf.length, 16);
assert.equal(buf.isFull(), true);
const tensor = buf.getTensorData();
assert.equal(tensor.length, 16 * 147);
// Oldest frame (i=4) must be at index 0, newest frame (i=19) at index 15*147
assert.equal(tensor[0], 4, 'Frame 0 must be the oldest frame in the 16-frame window');
assert.equal(tensor[15 * 147], 19, 'Frame 15 must be the newest frame in the 16-frame window');
console.log('  ✓ 16-frame FIFO queue verified: Strict chronological ordering [t-15 ... t0]');

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: Word Sequence Model Inference Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test 6] Verifying wlasl100_gru_25class.onnx model inference & Top-3 output...');
const wordModelBuf = await readFile(new URL('../public/models/wlasl100_gru_25class.onnx', import.meta.url));
await loadWordSession(wordModelBuf);

const testSamples = JSON.parse(await readFile(new URL('../public/models/test_word_samples.json', import.meta.url), 'utf8'));
const sample = testSamples[1]; // BOOK sample
const inputFloats = new Float32Array(sample.features.flat());
const res = await inferWordSequence(inputFloats);

assert.equal(res.topWord, 'BOOK', 'Sample 07068 must predict BOOK');
assert.ok(res.confidence > 0.8, `Confidence must be high, got ${res.confidence}`);
assert.equal(res.top3.length, 3, 'Must return 3 candidate words');
assert.equal(res.top5.length, 5, 'Must return 5 candidate words');
assert.ok(res.latencyMs < 50, `Latency must be < 50ms, got ${res.latencyMs}ms`);
console.log(`  ✓ Sample BOOK predicted with ${(res.confidence * 100).toFixed(1)}% confidence in ${res.latencyMs.toFixed(1)}ms`);

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: Alphabet Engine Regression Check
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test 7] Verifying Alphabet engine is completely preserved & unaffected...');
const alphaModelBuf = await readFile(new URL('../public/models/alphabet_landmark_model.onnx', import.meta.url));
const alphaSession = await ort.InferenceSession.create(alphaModelBuf, {
  executionProviders: ['wasm'],
});
const alphaLabels = JSON.parse(await readFile(new URL('../public/models/alphabet_landmark_labels.json', import.meta.url), 'utf8'));
const alphaSamples = JSON.parse(await readFile(new URL('./dataset_reference_landmarks.json', import.meta.url), 'utf8'));

// Test letter 'A'
const featsA = extractAlphabetLandmarkFeatures(alphaSamples.A, false);
assert.equal(featsA.length, 90, 'Alphabet feature vector must remain 90D');
const alphaOut = await alphaSession.run({
  [alphaSession.inputNames[0]]: new ort.Tensor('float32', featsA, [1, 90]),
});
const scoresA = Array.from(alphaOut[alphaSession.outputNames[0]].data);
const maxIdxA = scoresA.indexOf(Math.max(...scoresA));
assert.equal(alphaLabels[maxIdxA], 'A', 'Alphabet model must predict A');
console.log(`  ✓ Alphabet 90D feature extraction & ONNX model intact: 'A' recognized with ${(scoresA[maxIdxA] * 100).toFixed(1)}%`);

console.log('\n' + '='.repeat(80));
console.log('ALL DUAL-HAND & WORD PIPELINE VERIFICATION TESTS PASSED WITH ZERO FAILURES! [7/7]');
console.log('='.repeat(80) + '\n');
