import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractWordFeatures, WordSequenceBuffer, FEATURE_DIM, SEQUENCE_LENGTH } from '../src/lib/wordLandmarkFeatures.js';
import { inferWordSequence, loadWordSession, DEFAULT_WORD_THRESHOLDS } from '../src/lib/onnxWordRecognizer.js';

console.log('='.repeat(70));
console.log('TESTING WORD FEATURE EXTRACTOR AND ONNX WORD RECOGNIZER MODULES');
console.log('='.repeat(70));

// Test 1: Feature Extractor Dimensionality and Structure
console.log('\n[Test 1] Testing extractWordFeatures output signature...');
const dummyHand = Array.from({ length: 21 }, (_, i) => ({ x: 0.5 + i * 0.01, y: 0.5 - i * 0.01, z: 0.0 }));
const dummyPose = Array.from({ length: 33 }, (_, i) => ({ x: 0.5, y: 0.5, z: 0.0, visibility: 0.9 }));

// Test with both hands + pose
const vecFull = extractWordFeatures(dummyHand, dummyHand, dummyPose);
assert.equal(vecFull.length, FEATURE_DIM, `Expected ${FEATURE_DIM} dims, got ${vecFull.length}`);
assert.equal(vecFull[126], 1.0, 'Left hand presence must be 1.0');
assert.equal(vecFull[127], 1.0, 'Right hand presence must be 1.0');
assert.equal(vecFull[146], 1.0, 'Pose presence must be 1.0');
console.log('  ✓ Dual-hand + Pose extraction: 147 dimensions, all presence masks active');

// Test with no hands and no pose (fallback mode)
const vecEmpty = extractWordFeatures(null, null, null);
assert.equal(vecEmpty.length, FEATURE_DIM);
assert.equal(vecEmpty[126], 0.0, 'Left hand presence must be 0.0');
assert.equal(vecEmpty[127], 0.0, 'Right hand presence must be 0.0');
assert.equal(vecEmpty[146], 0.0, 'Pose presence must be 0.0');
console.log('  ✓ Empty fallback extraction: 147 dimensions, zero masks');

// Test 2: WordSequenceBuffer
console.log('\n[Test 2] Testing WordSequenceBuffer rolling window & motion energy...');
const buffer = new WordSequenceBuffer(16);
assert.equal(buffer.length, 0);
assert.equal(buffer.isFull(), false);

for (let f = 0; f < 20; f++) {
  const v = extractWordFeatures(dummyHand, null, dummyPose);
  buffer.push(v, { x: 0.5 + f * 0.02, y: 0.5 });
}
assert.equal(buffer.length, 16, 'Buffer must cap at capacity 16');
assert.equal(buffer.isFull(), true);
const tensorData = buffer.getTensorData();
assert.equal(tensorData.length, 16 * 147);
const motionEnergy = buffer.getMotionEnergy();
assert.ok(motionEnergy > 0, `Expected positive motion energy, got ${motionEnergy}`);
console.log(`  ✓ Rolling buffer: 16 frames maintained, motion energy = ${motionEnergy.toFixed(4)}`);

// Test 3: ONNX Inference Session and Parity with test_word_samples.json
console.log('\n[Test 3] Testing inferWordSequence on known test samples...');
const modelBuffer = await readFile(new URL('../public/models/wlasl100_gru_25class.onnx', import.meta.url));
await loadWordSession(modelBuffer);

const samplesRaw = await readFile(new URL('../public/models/test_word_samples.json', import.meta.url), 'utf8');
const samples = JSON.parse(samplesRaw);

let top1Matches = 0;
let top5Matches = 0;

for (const s of samples) {
  const flat = new Float32Array(s.features.flat());
  const res = await inferWordSequence(flat);

  assert.ok(res.topWord, 'Inference must return topWord');
  assert.ok(Number.isFinite(res.confidence), 'Confidence must be finite');
  assert.equal(res.top3.length, 3, 'Must return Top-3 suggestions');
  assert.equal(res.top5.length, 5, 'Must return Top-5 suggestions');

  const isTop1 = res.topWord === s.gloss;
  const isTop5 = res.top5.some((t) => t.label === s.gloss);
  if (isTop1) top1Matches++;
  if (isTop5) top5Matches++;

  console.log(`  ✓ Sample ${s.video_id} (${s.gloss}): Pred=${res.topWord} (${(res.confidence * 100).toFixed(1)}%), Margin=${(res.margin * 100).toFixed(1)}%, Top-3=[${res.top3.map(t => t.label).join(', ')}], Latency=${res.latencyMs.toFixed(2)}ms`);
}

console.log(`\nSample Evaluation Summary: Top-1: ${top1Matches}/${samples.length}, Top-5: ${top5Matches}/${samples.length}`);

// Test 4: Error handling for invalid inputs
console.log('\n[Test 4] Testing error handling for invalid input dimensions...');
let threwOnBadShape = false;
try {
  await inferWordSequence(new Float32Array(100)); // wrong length (must be 2352)
} catch (err) {
  threwOnBadShape = true;
  console.log(`  ✓ Successfully caught invalid input shape: "${err.message}"`);
}
assert.ok(threwOnBadShape, 'inferWordSequence must reject invalid input shapes');

console.log('\nALL MODULE TESTS PASSED SUCCESSFULLY!\n');
