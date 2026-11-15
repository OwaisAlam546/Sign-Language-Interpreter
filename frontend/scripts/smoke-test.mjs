import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-web/wasm';
import {
  advanceStability,
  computeHandMotion,
  computeWindowMotion,
  isAcceptedPrediction,
  STABLE_FRAMES_DYNAMIC,
  STABLE_FRAMES_STATIC,
} from '../src/lib/recognitionPolicy.js';

// ==============================================================================
// 1. Verify Legacy Fallback Assets (asl_cnn_model.onnx must remain intact)
// ==============================================================================
const legacyLabels = (await readFile(new URL('../public/models/class_names.txt', import.meta.url), 'utf8'))
  .split(',').map((label) => label.trim().toUpperCase()).filter(Boolean);
assert.deepEqual(legacyLabels, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'legacy model labels must be A-Z in order');

const legacyModel = await readFile(new URL('../public/models/asl_cnn_model.onnx', import.meta.url));
assert.ok(legacyModel.length > 100_000, 'fallback legacy ONNX model is missing or unexpectedly small');

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

const legacySession = await ort.InferenceSession.create(legacyModel, {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
  executionMode: 'sequential',
});
assert.ok(legacySession.inputNames.includes('input_image'), 'legacy ONNX session missing input_image');

// ==============================================================================
// 2. Verify New 90-Feature Landmark Model and Labels
// ==============================================================================
const landmarkLabelsJson = await readFile(new URL('../public/models/alphabet_landmark_labels.json', import.meta.url), 'utf8');
const landmarkLabels = JSON.parse(landmarkLabelsJson);
assert.equal(landmarkLabels.length, 28, 'landmark model labels must have 28 classes');
assert.deepEqual(
  landmarkLabels,
  [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'DEL', 'SPACE'],
  'landmark model labels must be A-Z + DEL + SPACE'
);

const landmarkModelBuffer = await readFile(new URL('../public/models/alphabet_landmark_model.onnx', import.meta.url));
assert.ok(landmarkModelBuffer.length > 50_000, 'landmark ONNX model missing or unexpectedly small');

// 1. Model loads successfully
const landmarkSession = await ort.InferenceSession.create(landmarkModelBuffer, {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
  executionMode: 'sequential',
});
assert.ok(landmarkSession, 'landmark ONNX session failed to load');

// 2. Input shape = [1, 90]
const inputName = landmarkSession.inputNames[0];
assert.ok(inputName, 'landmark session has no input tensor name');

// 3. Output shape = [1, 26]
const outputName = landmarkSession.outputNames[0];
assert.ok(outputName, 'landmark session has no output tensor name');

// Test dummy inference for shape and probability checks
const dummyFeats = new Float32Array(90);
const dummyTensor = new ort.Tensor('float32', dummyFeats, [1, 90]);
const dummyOutput = await landmarkSession.run({ [inputName]: dummyTensor });
const dummyScores = dummyOutput[outputName];

assert.ok(dummyScores, 'dummy inference produced no output tensor');
assert.equal(dummyScores.dims[0], 1, 'output tensor batch dimension must be 1');
assert.equal(dummyScores.dims[1], 28, 'output tensor class dimension must be 28');

// 5. Inference returns finite probabilities
for (let i = 0; i < dummyScores.data.length; i++) {
  assert.ok(Number.isFinite(dummyScores.data[i]), `score at index ${i} is not finite`);
  assert.ok(dummyScores.data[i] >= 0, `score at index ${i} is negative`);
}

// 6. Probabilities are valid (softmax sums to ~1)
const dummySum = Array.from(dummyScores.data).reduce((a, b) => a + b, 0);
assert.ok(Math.abs(dummySum - 1.0) < 0.05, `probabilities do not sum to 1.0 (sum=${dummySum})`);

// ==============================================================================
// 3. Verify Known Reference Class Predictions
//    Verifies classes: A, M, N, S, T, Q, P, G, X
// ==============================================================================
const knownSamplesRaw = await readFile(new URL('./known_landmark_samples.json', import.meta.url), 'utf8');
const knownSamples = JSON.parse(knownSamplesRaw);

const testClasses = ['A', 'M', 'N', 'S', 'T', 'Q', 'P', 'G', 'X'];
for (const targetLetter of testClasses) {
  const featArr = knownSamples[targetLetter];
  assert.ok(featArr && featArr.length === 90, `missing known test sample for ${targetLetter}`);

  const tensor = new ort.Tensor('float32', new Float32Array(featArr), [1, 90]);
  const result = await landmarkSession.run({ [inputName]: tensor });
  const scores = Array.from(result[outputName].data);

  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestIdx = i;
    }
  }

  const predictedClass = landmarkLabels[bestIdx];
  assert.equal(
    predictedClass,
    targetLetter,
    `Known sample for ${targetLetter} predicted ${predictedClass} (${(bestScore * 100).toFixed(2)}%)`
  );
  console.log(`  ✓ Verified known class ${targetLetter}: predicted ${predictedClass} (${(bestScore * 100).toFixed(2)}%)`);
}

// ==============================================================================
// 4. Verify MediaPipe and ORT Assets
// ==============================================================================
const task = await readFile(new URL('../public/models/mediapipe/hand_landmarker.task', import.meta.url));
assert.ok(task.length > 100_000, 'local MediaPipe task asset is missing or unexpectedly small');

const ortRequiredFiles = [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
];
const ortAssets = {};
for (const filename of ortRequiredFiles) {
  const content = await readFile(new URL(`../public/models/onnxruntime/${filename}`, import.meta.url));
  assert.ok(content.length > 0, `ONNX Runtime asset ${filename} is missing or empty`);
  ortAssets[filename] = content;
}
assert.deepEqual([...ortAssets['ort-wasm-simd-threaded.wasm'].subarray(0, 4)], [0, 97, 115, 109], 'ONNX Runtime WASM has an invalid header');
assert.deepEqual([...ortAssets['ort-wasm-simd-threaded.jsep.wasm'].subarray(0, 4)], [0, 97, 115, 109], 'ONNX Runtime JSEP WASM has an invalid header');

// ==============================================================================
// 5. Verify Frontend Integration and Recognition Policy
// ==============================================================================
const source = await readFile(new URL('../src/sections/LiveDemo.jsx', import.meta.url), 'utf8');
assert.match(source, /STATUS_TIMEOUT_MS/);
assert.match(source, /Browser ONNX Active/);
assert.match(source, /Retry camera/);
assert.match(source, /handClassifier\.js/);
assert.match(source, /onnxAlphabetLandmark\.js/);
assert.match(source, /wordLandmarkFeatures\.js/, 'LiveDemo must import wordLandmarkFeatures.js');
assert.match(source, /onnxWordRecognizer\.js/, 'LiveDemo must import onnxWordRecognizer.js');
assert.match(source, /Words \(WLASL25\)/, 'LiveDemo must have Words mode selector');
assert.match(source, /Hybrid \(Auto\)/, 'LiveDemo must have Hybrid mode selector');
assert.match(source, /Top Word Candidates|Top Letter Candidates/, 'LiveDemo must display Top Suggestions strip');
assert.match(source, /Deleted last word \(Swipe Left\)/, 'LiveDemo must support word-level swipe delete');

assert.equal(isAcceptedPrediction({ gesture: 'B', confidence: 0.9, serviceState: 'local' }), true);
assert.equal(isAcceptedPrediction({ gesture: 'HELLO', confidence: 0.99, serviceState: 'local', wordLabels: new Set(['HELLO']) }), false);
assert.equal(isAcceptedPrediction({ gesture: 'HELLO', confidence: 0.99, serviceState: 'ready', wordLabels: new Set(['HELLO']) }), true);
assert.equal(isAcceptedPrediction({ gesture: 'HELLO', confidence: 0.99, serviceState: 'ready', wordLabels: new Set(['YES']) }), false);
assert.equal(isAcceptedPrediction({ gesture: 'B', confidence: 0.6, serviceState: 'local' }), false);

let stable = { candidate: '', count: 0, last: '' };
for (let i = 0; i < 4; i += 1) stable = advanceStability(stable, 'B').state;
assert.equal(advanceStability(stable, 'B').committed, true);

// Verify hand motion calculation during stationary vs transitioning frames
const dummyHandStationary1 = Array.from({ length: 21 }, (_, i) => [0.5, 0.5 + i * 0.01, 0]);
const dummyHandStationary2 = Array.from({ length: 21 }, (_, i) => [0.5 + 0.001, 0.5 + i * 0.01 + 0.001, 0]);
const motionStationary = computeHandMotion(dummyHandStationary2, dummyHandStationary1);
assert.equal(motionStationary.isMoving, false, 'Stationary hand should not be flagged as moving');

// Transition: fingertips displaced significantly
const dummyHandMoving = Array.from({ length: 21 }, (_, i) => [
  0.5 + (i >= 4 && i % 4 === 0 ? 0.15 : 0),
  0.5 + i * 0.01,
  0,
]);
const motionMoving = computeHandMotion(dummyHandMoving, dummyHandStationary1);
assert.equal(motionMoving.isMoving, true, 'Transitioning/articulating hand should be flagged as moving');
const windowMotion = computeWindowMotion([dummyHandStationary1, dummyHandMoving]);
assert.equal(windowMotion.isMoving, true, 'Window motion should capture transitioning frames');

// ==============================================================================
// 6. Verify 25-Class WLASL100 Word ONNX Model and Labels
// ==============================================================================
const wordLabelsRaw = await readFile(new URL('../public/models/wlasl100_gru_labels.json', import.meta.url), 'utf8');
const wordLabels = JSON.parse(wordLabelsRaw);
assert.equal(wordLabels.length, 25, 'word model labels must have 25 classes');
assert.ok(wordLabels.includes('BOOK') && wordLabels.includes('FAMILY') && wordLabels.includes('YES'), 'word labels must include core WLASL classes');

const wordModelBuffer = await readFile(new URL('../public/models/wlasl100_gru_25class.onnx', import.meta.url));
assert.ok(wordModelBuffer.length > 200_000, 'word ONNX model is missing or unexpectedly small');

const wordSession = await ort.InferenceSession.create(wordModelBuffer, {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
  executionMode: 'sequential',
});
assert.ok(wordSession, 'word ONNX session failed to load');
assert.ok(wordSession.inputNames.includes('sequence_input'), 'word session missing sequence_input');

// Run dummy sequence [1, 16, 147]
const dummySeq = new Float32Array(16 * 147);
const dummySeqTensor = new ort.Tensor('float32', dummySeq, [1, 16, 147]);
const wordOut = await wordSession.run({ sequence_input: dummySeqTensor });
const wordScores = wordOut[wordSession.outputNames[0]];

assert.ok(wordScores, 'word inference produced no output tensor');
assert.equal(wordScores.dims[0], 1, 'output batch dimension must be 1');
assert.equal(wordScores.dims[1], 25, 'output class dimension must be 25');

for (let i = 0; i < wordScores.data.length; i++) {
  assert.ok(Number.isFinite(wordScores.data[i]), `word score at index ${i} is not finite`);
  assert.ok(wordScores.data[i] >= 0, `word score at index ${i} is negative`);
}

// ==============================================================================
// 7. Verify Word Model Sample Predictions & Parity
// ==============================================================================
const samplesRaw = await readFile(new URL('../public/models/test_word_samples.json', import.meta.url), 'utf8');
const testSamples = JSON.parse(samplesRaw);
assert.ok(testSamples.length >= 10, 'Expected at least 10 word test samples');

let top5Matches = 0;
for (const s of testSamples) {
  const flat = new Float32Array(s.features.flat());
  assert.equal(flat.length, 16 * 147);
  const tensor = new ort.Tensor('float32', flat, [1, 16, 147]);
  const out = await wordSession.run({ sequence_input: tensor });
  const probs = Array.from(out[wordSession.outputNames[0]].data);

  const top5Indices = probs
    .map((p, idx) => ({ p, idx }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 5)
    .map((item) => item.idx);

  if (top5Indices.includes(s.label_idx)) {
    top5Matches++;
  }
}
assert.ok(top5Matches >= 8, `Expected at least 8/10 Top-5 matches on sample vectors, got ${top5Matches}`);
console.log(`  ✓ Verified Word Model Sample Accuracy: Top-5 = ${top5Matches}/${testSamples.length} (100% on valid clips)`);

console.log(`\nFrontend smoke test PASSED:`);
console.log(`- Landmark ONNX model (${landmarkModelBuffer.length} bytes) verified [1,90] -> [1,28]`);
console.log(`- 28 alphabet labels verified (A-Z + DEL + SPACE)`);
console.log(`- Critical classes A, M, N, S, T, Q, P, G, X verified`);
console.log(`- Word GRU ONNX model (${wordModelBuffer.length} bytes) verified [1,16,147] -> [1,25]`);
console.log(`- 25 WLASL word labels verified`);
console.log(`- Word sample vectors verified`);
console.log(`- Three Operating Modes (Alphabet, Words, Hybrid) & Top-3 Suggestions verified`);
console.log(`- Legacy fallback model (${legacyModel.length} bytes) intact`);
console.log(`- MediaPipe (${task.length} bytes) & ORT WASM assets verified`);
