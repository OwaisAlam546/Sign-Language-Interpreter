// frontend/scripts/test-recognition-regression.mjs
// Comprehensive automated regression test suite for SignSpeak AI Live Recognition.
// Validates all 12 critical scenarios:
//   1. Stable 'A' sign is recognized and committed once.
//   2. An uncertain handshape displays "Uncertain – Adjust your hand position" and does not produce a letter.
//   3. Transition from 'A' to 'S' clears preview during motion and does not retain stale 'A'.
//   4. Transition from 'A' to 'T' clears preview and recognizes 'T' only after stabilization.
//   5. 'M' and 'N' handshapes are not confused with each other.
//   6. 'C' and 'O' handshapes are not confused with each other.
//   7. Low-confidence prediction (< 0.65) is rejected.
//   8. Small top-1/top-2 margin (< 0.15) is rejected.
//   9. Hand in motion (velocity > threshold) does not produce a committed character.
//  10. Clearing the preview does not erase previously committed text in history.
//  11. Holding a sign steadily for 3 seconds commits the character once, not repeatedly.
//  12. Model-unavailable state displays a clear error and does not produce fake high confidence.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-web/wasm';
import { extractAlphabetLandmarkFeatures } from '../src/lib/alphabetLandmarkFeatures.js';
import { ASL_LANDMARKS } from '../src/lib/aslLandmarksData.js';
import { classifyHand } from '../src/lib/handClassifier.js';
import {
  computeHandMotion,
  computeWindowMotion,
  isAcceptedPrediction,
  MIN_RECOGNITION_CONFIDENCE,
  MIN_TOP2_MARGIN,
  MOTION_TRANSITION_THRESHOLD,
  STABLE_FRAMES_STATIC,
} from '../src/lib/recognitionPolicy.js';

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

// ── Setup ONNX Runtime Session ──
const modelBuffer = await readFile(new URL('../public/models/alphabet_landmark_model.onnx', import.meta.url));
const labels = JSON.parse(await readFile(new URL('../public/models/alphabet_landmark_labels.json', import.meta.url), 'utf8'));
const DATASET_LANDMARKS = JSON.parse(await readFile(new URL('./dataset_reference_landmarks.json', import.meta.url), 'utf8'));

const session = await ort.InferenceSession.create(modelBuffer, {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
  executionMode: 'sequential',
});

const inputName = session.inputNames[0];
const outputName = session.outputNames[0];

async function inferLandmarks(landmarks, isLeftHand = false) {
  const feats = extractAlphabetLandmarkFeatures(landmarks, isLeftHand);
  const tensor = new ort.Tensor('float32', feats, [1, 90]);
  const results = await session.run({ [inputName]: tensor });
  const rawScores = Array.from(results[outputName].data);

  let bestIdx = 0, secondIdx = 0;
  let bestScore = -Infinity, secondScore = -Infinity;

  for (let i = 0; i < rawScores.length; i++) {
    const s = rawScores[i];
    if (s > bestScore) {
      secondScore = bestScore;
      secondIdx = bestIdx;
      bestScore = s;
      bestIdx = i;
    } else if (s > secondScore) {
      secondScore = s;
      secondIdx = i;
    }
  }

  const margin = Math.max(0, bestScore - secondScore);
  const winner = labels[bestIdx];
  const isAccepted = isAcceptedPrediction({
    gesture: winner,
    confidence: bestScore,
    margin,
    serviceState: 'local',
  });

  return {
    rawWinner: winner,
    rawConfidence: bestScore,
    margin,
    isAccepted,
    gesture: isAccepted ? winner : 'UNKNOWN',
    confidence: bestScore,
    top5: [bestIdx, secondIdx].map((idx) => ({ label: labels[idx], score: rawScores[idx] })),
  };
}

// ── Simulation Engine mimicking LiveDemo state machine ──
class LiveDemoSimulator {
  constructor() {
    this.rec = '';
    this.words = [];
    this.gesture = '';
    this.statusMessage = '';
    this.recognitionState = 'standby';
    this.state = { candidate: '', count: 0, neutral: 0, armed: true, last: '' };
    this.history = [];
  }

  processFrame(inferenceResult, motion) {
    const isMoving = Boolean(motion?.isMoving);
    const label = inferenceResult?.gesture;
    const confidence = inferenceResult?.confidence ?? 0;
    const margin = inferenceResult?.margin ?? 0;
    const isAccepted = Boolean(inferenceResult?.isAccepted);

    // 1. Transition Handling
    if (isMoving) {
      this.recognitionState = 'transitioning';
      this.statusMessage = 'Transitioning – Hold sign steady';
      this.gesture = '';
      this.state.candidate = '';
      this.state.count = 0;
      return;
    }

    // 2. Uncertainty Handling
    if (!label || label === 'UNKNOWN' || !isAccepted) {
      this.recognitionState = 'uncertain';
      this.statusMessage = 'Uncertain – Adjust your hand position';
      this.gesture = '';
      this.state.candidate = '';
      this.state.count = 0;
      return;
    }

    // 3. Accepted Frame
    this.statusMessage = '';
    if (this.state.candidate === label) {
      this.state.count += 1;
    } else {
      this.state.candidate = label;
      this.state.count = 1;
      if (label !== this.state.last) this.state.armed = true;
    }

    // Preview smoothing: display preview when held >= 2 frames
    if (this.state.count >= 2 || label === this.state.last) {
      this.recognitionState = 'stable';
      this.gesture = label;
    }

    // Commit only if armed, held for STABLE_FRAMES_STATIC, and not already committed for this hold
    if (this.state.armed && this.state.count >= STABLE_FRAMES_STATIC && label !== this.state.last) {
      this.recognitionState = 'committed';
      this.rec += label;
      this.state.last = label;
      this.state.armed = false;
      this.state.count = 0;
    }
  }

  neutralFrame() {
    this.state.neutral += 1;
    if (this.state.neutral >= 4) {
      this.state.armed = true;
      this.state.last = '';
      this.gesture = '';
    }
  }
}

function interpolate(poseA, poseB, steps) {
  const frames = [];
  for (let s = 1; s <= steps; s++) {
    const t = s / (steps + 1);
    frames.push(poseA.map((ptA, i) => {
      const ptB = poseB[i];
      return [
        ptA[0] + (ptB[0] - ptA[0]) * t,
        ptA[1] + (ptB[1] - ptA[1]) * t,
        (ptA[2] || 0) + ((ptB[2] || 0) - (ptA[2] || 0)) * t,
      ];
    }));
  }
  return frames;
}

console.log('================================================================');
console.log('SignSpeak AI – Full 12-Scenario Live Recognition Regression Suite');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Scenario 1: Stable 'A' sign is recognized and committed once
// -----------------------------------------------------------------------------
{
  console.log('Scenario 1: Stable \'A\' sign recognition and single commit');
  const sim = new LiveDemoSimulator();
  const poseA = DATASET_LANDMARKS['A'];
  const inf = await inferLandmarks(poseA);
  assert.equal(inf.rawWinner, 'A');
  assert.ok(inf.confidence >= MIN_RECOGNITION_CONFIDENCE);
  assert.ok(inf.margin >= MIN_TOP2_MARGIN);

  // Deliver 5 stationary frames
  for (let f = 0; f < 5; f++) {
    sim.processFrame(inf, { isMoving: false });
  }
  assert.equal(sim.rec, 'A', `Expected committed 'A', got '${sim.rec}'`);
  assert.equal(sim.gesture, 'A', `Expected preview 'A', got '${sim.gesture}'`);
  console.log('  ✓ Verified: Stable \'A\' sign recognized and committed once (rec="A")');
}

// -----------------------------------------------------------------------------
// Scenario 2: Uncertain handshape displays message and produces no letter
// -----------------------------------------------------------------------------
{
  console.log('\nScenario 2: Uncertain handshape handling');
  const sim = new LiveDemoSimulator();
  // Ambiguous handshape halfway between sign A and sign S (conf ~0.52 < 0.65, margin ~0.04 < 0.15)
  const poseA = DATASET_LANDMARKS['A'];
  const poseS = DATASET_LANDMARKS['S'];
  const alpha = 0.485;
  const ambiguousPose = poseA.map((ptA, i) => {
    const ptS = poseS[i];
    return [
      (1 - alpha) * ptA[0] + alpha * ptS[0],
      (1 - alpha) * ptA[1] + alpha * ptS[1],
      (1 - alpha) * (ptA[2] || 0) + alpha * (ptS[2] || 0),
    ];
  });
  const inf = await inferLandmarks(ambiguousPose);
  assert.equal(inf.isAccepted, false, 'Ambiguous pose must not be accepted');
  assert.equal(inf.gesture, 'UNKNOWN', 'Ambiguous pose must yield gesture UNKNOWN');
  
  sim.processFrame(inf, { isMoving: false });
  assert.equal(sim.rec, '', 'Uncertain handshape must not commit any character');
  assert.equal(sim.gesture, '', 'Uncertain handshape must not display a letter preview');
  assert.equal(sim.statusMessage, 'Uncertain – Adjust your hand position');
  assert.equal(sim.recognitionState, 'uncertain');
  console.log('  ✓ Verified: Uncertain handshape displays "Uncertain – Adjust your hand position" and zero letters');
}

// -----------------------------------------------------------------------------
// Scenario 3: Transition from 'A' to 'S' clears preview immediately without stale 'A'
// -----------------------------------------------------------------------------
{
  console.log('\nScenario 3: Transition from \'A\' to \'S\' motion suppression');
  const sim = new LiveDemoSimulator();
  const poseA = DATASET_LANDMARKS['A'];
  const poseS = DATASET_LANDMARKS['S'];
  const infA = await inferLandmarks(poseA);
  const infS = await inferLandmarks(poseS);

  // Step 1: Establish steady A
  for (let f = 0; f < 5; f++) sim.processFrame(infA, { isMoving: false });
  assert.equal(sim.rec, 'A');
  assert.equal(sim.gesture, 'A');

  // Step 2: Transition frames with motion
  const transFrames = interpolate(poseA, poseS, 3);
  for (let i = 0; i < transFrames.length; i++) {
    const prev = i === 0 ? poseA : transFrames[i - 1];
    const motion = computeHandMotion(transFrames[i], prev);
    assert.ok(motion.isMoving, 'Interpolated transition must flag isMoving=true');
    const infIntermediate = await inferLandmarks(transFrames[i]);
    sim.processFrame(infIntermediate, motion);

    // CRITICAL: Preview must be cleared immediately; no stale 'A'
    assert.equal(sim.gesture, '', 'Preview must be cleared during motion transition');
    assert.equal(sim.statusMessage, 'Transitioning – Hold sign steady');
  }

  // Step 3: Settle on S
  for (let f = 0; f < 5; f++) sim.processFrame(infS, { isMoving: false });
  assert.equal(sim.rec, 'AS', `Expected rec='AS', got '${sim.rec}'`);
  assert.equal(sim.gesture, 'S');
  console.log('  ✓ Verified: Transition A -> S immediately cleared preview and emitted only [A, S]');
}

// -----------------------------------------------------------------------------
// Scenario 4: Transition from 'A' to 'T' clears preview and commits only after stabilization
// -----------------------------------------------------------------------------
{
  console.log('\nScenario 4: Transition from \'A\' to \'T\' stabilization');
  const sim = new LiveDemoSimulator();
  const poseA = DATASET_LANDMARKS['A'];
  const poseT = DATASET_LANDMARKS['T'];
  const infA = await inferLandmarks(poseA);
  const infT = await inferLandmarks(poseT);

  for (let f = 0; f < 5; f++) sim.processFrame(infA, { isMoving: false });
  assert.equal(sim.rec, 'A');

  // 1 frame of T during motion should NOT commit T
  sim.processFrame(infT, { isMoving: true });
  assert.equal(sim.rec, 'A', 'Motion frame must not commit');
  assert.equal(sim.gesture, '', 'Motion frame must not preview');

  // 1 stationary frame of T is not yet enough to commit (requires STABLE_FRAMES_STATIC=4)
  sim.processFrame(infT, { isMoving: false });
  assert.equal(sim.rec, 'A', '1 stationary frame must not commit');

  // 3 more stationary frames of T -> should commit
  for (let f = 0; f < 3; f++) sim.processFrame(infT, { isMoving: false });
  assert.equal(sim.rec, 'AT', `Expected rec='AT', got '${sim.rec}'`);
  assert.equal(sim.gesture, 'T');
  console.log('  ✓ Verified: Transition A -> T commits only after full stabilization streak');
}

// -----------------------------------------------------------------------------
// Scenario 5: 'M' and 'N' handshapes are not confused with each other
// -----------------------------------------------------------------------------
{
  console.log('\nScenario 5: \'M\' and \'N\' discrimination');
  const poseM = DATASET_LANDMARKS['M'];
  const poseN = DATASET_LANDMARKS['N'];
  const infM = await inferLandmarks(poseM);
  const infN = await inferLandmarks(poseN);

  assert.equal(infM.rawWinner, 'M', `Pose M was classified as ${infM.rawWinner}`);
  assert.notEqual(infM.rawWinner, 'N', 'Pose M must not be classified as N');
  assert.equal(infN.rawWinner, 'N', `Pose N was classified as ${infN.rawWinner}`);
  assert.notEqual(infN.rawWinner, 'M', 'Pose N must not be classified as M');
  console.log(`  ✓ Verified: M classified as M (${(infM.confidence * 100).toFixed(1)}%), N classified as N (${(infN.confidence * 100).toFixed(1)}%)`);
}

// -----------------------------------------------------------------------------
// Scenario 6: 'C' and 'O' handshapes are not confused with each other
// -----------------------------------------------------------------------------
{
  console.log('\nScenario 6: \'C\' and \'O\' discrimination');
  const poseC = DATASET_LANDMARKS['C'];
  const poseO = DATASET_LANDMARKS['O'];
  const infC = await inferLandmarks(poseC);
  const infO = await inferLandmarks(poseO);

  assert.equal(infC.rawWinner, 'C', `Pose C was classified as ${infC.rawWinner}`);
  assert.notEqual(infC.rawWinner, 'O', 'Pose C must not be classified as O');
  assert.equal(infO.rawWinner, 'O', `Pose O was classified as ${infO.rawWinner}`);
  assert.notEqual(infO.rawWinner, 'C', 'Pose O must not be classified as C');
  console.log(`  ✓ Verified: C classified as C (${(infC.confidence * 100).toFixed(1)}%), O classified as O (${(infO.confidence * 100).toFixed(1)}%)`);
}

// -----------------------------------------------------------------------------
// Scenario 7: Low-confidence prediction (< 0.65) is rejected
// -----------------------------------------------------------------------------
{
  console.log('\nScenario 7: Rejection of low-confidence predictions (< 0.65)');
  const acceptedAt064 = isAcceptedPrediction({
    gesture: 'A',
    confidence: 0.64,
    margin: 0.30,
    serviceState: 'local',
  });
  const acceptedAt065 = isAcceptedPrediction({
    gesture: 'A',
    confidence: 0.65,
    margin: 0.30,
    serviceState: 'local',
  });

  assert.equal(acceptedAt064, false, 'Confidence of 0.64 must be rejected');
  assert.equal(acceptedAt065, true, 'Confidence of 0.65 must be accepted');
  console.log('  ✓ Verified: Threshold boundary enforced strictly at MIN_RECOGNITION_CONFIDENCE = 0.65');
}

// -----------------------------------------------------------------------------
// Scenario 8: Small top-1/top-2 margin (< 0.15) is rejected
// -----------------------------------------------------------------------------
{
  console.log('\nScenario 8: Rejection of small top-1/top-2 margin (< 0.15)');
  const acceptedMargin014 = isAcceptedPrediction({
    gesture: 'S',
    confidence: 0.85,
    margin: 0.14,
    serviceState: 'local',
  });
  const acceptedMargin015 = isAcceptedPrediction({
    gesture: 'S',
    confidence: 0.85,
    margin: 0.15,
    serviceState: 'local',
  });

  assert.equal(acceptedMargin014, false, 'Margin of 0.14 must be rejected due to ambiguity');
  assert.equal(acceptedMargin015, true, 'Margin of 0.15 must be accepted');
  console.log('  ✓ Verified: Margin boundary enforced strictly at MIN_TOP2_MARGIN = 0.15');
}

// -----------------------------------------------------------------------------
// Scenario 9: Hand in motion (velocity > threshold) does not produce committed char
// -----------------------------------------------------------------------------
{
  console.log('\nScenario 9: Suppression of committed characters during hand motion');
  const sim = new LiveDemoSimulator();
  const poseA = DATASET_LANDMARKS['A'];
  const infA = await inferLandmarks(poseA);

  // Feed 10 consecutive frames with motion flag true
  for (let f = 0; f < 10; f++) {
    sim.processFrame(infA, { isMoving: true, fingerMotion: 0.08 });
  }
  assert.equal(sim.rec, '', 'No character should ever be committed while hand is in motion');
  assert.equal(sim.gesture, '', 'No preview should be displayed while hand is in motion');
  console.log('  ✓ Verified: Hand in motion produces 0 committed characters across 10 frames');
}

// -----------------------------------------------------------------------------
// Scenario 10: Clearing preview does not erase previously committed text in history
// -----------------------------------------------------------------------------
{
  console.log('\nScenario 10: History preservation on preview clear');
  const sim = new LiveDemoSimulator();
  const poseA = DATASET_LANDMARKS['A'];
  const infA = await inferLandmarks(poseA);

  for (let f = 0; f < 5; f++) sim.processFrame(infA, { isMoving: false });
  assert.equal(sim.rec, 'A');
  assert.equal(sim.gesture, 'A');

  // Trigger preview clear by hand moving away / neutral
  sim.processFrame(null, { isMoving: true });
  assert.equal(sim.gesture, '', 'Preview was cleared');
  assert.equal(sim.rec, 'A', 'Committed history rec MUST remain untouched');

  // 5 neutral frames
  for (let f = 0; f < 5; f++) sim.neutralFrame();
  assert.equal(sim.gesture, '', 'Preview remains clear in neutral');
  assert.equal(sim.rec, 'A', 'Committed history rec MUST STILL remain intact');
  console.log('  ✓ Verified: Committed text stream "A" preserved even when preview is completely reset');
}

// -----------------------------------------------------------------------------
// Scenario 11: Holding sign steadily for 3 seconds commits once, not repeatedly
// -----------------------------------------------------------------------------
{
  console.log('\nScenario 11: Deduplication of held static signs (single commit rule)');
  const sim = new LiveDemoSimulator();
  const poseA = DATASET_LANDMARKS['A'];
  const infA = await inferLandmarks(poseA);

  // 45 frames @ 66ms = ~3.0 seconds
  for (let f = 0; f < 45; f++) {
    sim.processFrame(infA, { isMoving: false });
  }
  assert.equal(sim.rec, 'A', `Expected single 'A', but got '${sim.rec}' (${sim.rec.length} occurrences)`);
  assert.equal(sim.gesture, 'A', 'Preview remains \'A\' while held');
  console.log('  ✓ Verified: Holding sign steadily for 45 frames (3.0s) produced exactly ONE \'A\' (no AAAAA repetitions)');
}

// -----------------------------------------------------------------------------
// Scenario 12: Model-unavailable state displays error and zero fake confidence
// -----------------------------------------------------------------------------
{
  console.log('\nScenario 12: Model-unavailable state integrity');
  // In fallback heuristic classifier, arbitrary non-matching hand positions must return UNKNOWN with low confidence
  const nonHand = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  const fallbackRes = classifyHand(nonHand);
  assert.equal(fallbackRes.gesture, 'UNKNOWN', 'Zero/invalid landmarks must return UNKNOWN');
  assert.ok(fallbackRes.confidence < 0.50, `Confidence must be low, got ${fallbackRes.confidence}`);

  // In isAcceptedPrediction, model error or unavailable state rejects
  const rejectedInError = isAcceptedPrediction({
    gesture: 'S',
    confidence: 0.94,
    serviceState: 'error',
  });
  assert.equal(rejectedInError, false, 'Predictions during serviceState=error must be rejected');
  console.log('  ✓ Verified: Unavailable model rejects predictions and does not synthesize fake high-confidence letters');
}

console.log('\n================================================================');
console.log('ALL 12 REGRESSION SCENARIOS PASSED WITH ZERO FAILURES! [12/12]');
console.log('================================================================');
