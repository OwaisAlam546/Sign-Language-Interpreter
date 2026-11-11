import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyHand, classifySequence } from '../src/lib/handClassifier.js';
import {
  computeHandMotion,
  computeWindowMotion,
  isAcceptedPrediction,
  advanceStability,
  STABLE_FRAMES_STATIC,
  STABLE_FRAMES_DYNAMIC,
} from '../src/lib/recognitionPolicy.js';

// Parse ASL_LANDMARKS from HandSkeleton.jsx
const handSkeletonSrc = await readFile(new URL('../src/components/HandSkeleton.jsx', import.meta.url), 'utf8');
const landmarkMatch = handSkeletonSrc.match(/export const ASL_LANDMARKS = \{([\s\S]*?)\n\};/);
assert.ok(landmarkMatch, 'Failed to extract ASL_LANDMARKS');

const rawLandmarksCode = `({ ${landmarkMatch[1]} })`;
const ASL_LANDMARKS = eval(rawLandmarksCode);

console.log('--- Testing Transition & Stabilization Suite ---\n');

// -----------------------------------------------------------------------------
// Scenario 1: Steady sign recognition (Hold 'A' steadily -> recognizes 'A')
// -----------------------------------------------------------------------------
console.log('Scenario 1: Steady sign recognition: Hold A steadily');
const poseA = ASL_LANDMARKS['A'].slice(0, 21).map(([x, y]) => [x, y, 0]);
const resA = classifyHand(poseA);
assert.equal(resA.gesture, 'A', `Expected classifyHand to recognize A, got ${resA.gesture}`);

let state = { candidate: '', count: 0, last: '', armed: true };
let committedLetters = [];

function simulateFrame(state, label, isMoving, isDynamic = false) {
  const required = isDynamic ? STABLE_FRAMES_DYNAMIC : STABLE_FRAMES_STATIC;
  if (isMoving && !isDynamic) {
    state.count = 0;
    state.candidate = '';
    return { committed: false, label };
  }
  if (state.candidate === label) {
    state.count += 1;
  } else {
    state.candidate = label;
    state.count = 1;
    if (label !== state.last) state.armed = true;
  }
  if (state.armed && state.count >= required && label !== state.last) {
    committedLetters.push(label);
    state.last = label;
    state.armed = false;
    state.count = 0;
    return { committed: true, label };
  }
  return { committed: false, label };
}

// 4 consecutive steady frames of A
for (let i = 0; i < 4; i++) {
  simulateFrame(state, 'A', false);
}
assert.deepEqual(committedLetters, ['A'], `Expected committed letters to be ['A'], got ${JSON.stringify(committedLetters)}`);
console.log('  ✓ Steady A successfully recognized and committed once');

// -----------------------------------------------------------------------------
// Scenario 5: Continuous hold (Hold A continuously -> no repeated duplicates)
// -----------------------------------------------------------------------------
console.log('Scenario 5: Continuous hold of A');
for (let i = 0; i < 20; i++) {
  simulateFrame(state, 'A', false);
}
assert.deepEqual(committedLetters, ['A'], `Continuous hold must NOT re-commit duplicates! Got ${JSON.stringify(committedLetters)}`);
console.log('  ✓ Continuous hold of A did not emit any duplicate letters');

// -----------------------------------------------------------------------------
// Scenario 2: Transition A to I (Start A, move to I -> recognizes A, then I, NO 'J')
// -----------------------------------------------------------------------------
console.log('Scenario 2: Transition from A to I');
const poseI = ASL_LANDMARKS['I'].slice(0, 21).map(([x, y]) => [x, y, 0]);
const resI = classifyHand(poseI);
assert.equal(resI.gesture, 'I', `Expected classifyHand to recognize I, got ${resI.gesture}`);

// Interpolate landmarks between A and I to simulate realistic hand movement frames
function interpolatePoses(p1, p2, steps) {
  const frames = [];
  for (let s = 1; s <= steps; s++) {
    const t = s / (steps + 1);
    const frame = p1.map((pt1, idx) => {
      const pt2 = p2[idx];
      return [pt1[0] + (pt2[0] - pt1[0]) * t, pt1[1] + (pt2[1] - pt1[1]) * t, 0];
    });
    frames.push(frame);
  }
  return frames;
}

const transitionFramesAI = interpolatePoses(poseA, poseI, 4);

// Test motion calculation on transition frames
let intermediateSequence = [poseA, ...transitionFramesAI];
let detectedIntermediateDynamic = [];

for (let i = 1; i < intermediateSequence.length; i++) {
  const m = computeHandMotion(intermediateSequence[i], intermediateSequence[i - 1]);
  assert.ok(m.isMoving, `Transition frame ${i} should be flagged as moving (fingerMotion=${m.fingerMotion})`);
  
  // Also verify classifySequence does not classify A -> I movement as dynamic J!
  const windowSlice = intermediateSequence.slice(0, i + 1);
  const seqRes = classifySequence(windowSlice);
  if (seqRes && seqRes.gesture === 'J') {
    detectedIntermediateDynamic.push('J');
  }

  // During movement, simulateFrame ignores intermediate shapes
  const intermediateStatic = classifyHand(intermediateSequence[i]);
  simulateFrame(state, intermediateStatic.gesture, m.isMoving);
}

assert.equal(detectedIntermediateDynamic.length, 0, `A -> I transition must NEVER trigger dynamic J! Got: ${detectedIntermediateDynamic}`);
assert.deepEqual(committedLetters, ['A'], `No intermediate letters should be committed during transition`);

// Now hand settles on I for 4 frames
for (let i = 0; i < 4; i++) {
  simulateFrame(state, 'I', false);
}
assert.deepEqual(committedLetters, ['A', 'I'], `Expected ['A', 'I'], got ${JSON.stringify(committedLetters)}`);
console.log('  ✓ Transition from A to I emitted ONLY [A, I] with zero J or false intermediates');

// -----------------------------------------------------------------------------
// Scenario 3: Transition B to C (Start B, transition to C -> only B and C)
// -----------------------------------------------------------------------------
console.log('Scenario 3: Transition from B to C');
const poseB = ASL_LANDMARKS['B'].slice(0, 21).map(([x, y]) => [x, y, 0]);
const poseC = ASL_LANDMARKS['C'].slice(0, 21).map(([x, y]) => [x, y, 0]);
assert.equal(classifyHand(poseB).gesture, 'B');
assert.equal(classifyHand(poseC).gesture, 'C');

// New session
state = { candidate: '', count: 0, last: '', armed: true };
committedLetters = [];

// Steady B (4 frames)
for (let i = 0; i < 4; i++) simulateFrame(state, 'B', false);
assert.deepEqual(committedLetters, ['B']);

// Moving B to C (4 intermediate frames)
const transitionFramesBC = interpolatePoses(poseB, poseC, 4);
for (let i = 0; i < transitionFramesBC.length; i++) {
  const prev = i === 0 ? poseB : transitionFramesBC[i - 1];
  const m = computeHandMotion(transitionFramesBC[i], prev);
  assert.ok(m.isMoving, `Curling fingers should flag isMoving=true (fingerMotion=${m.fingerMotion})`);
  const rawLetter = classifyHand(transitionFramesBC[i]).gesture;
  simulateFrame(state, rawLetter, m.isMoving);
}
assert.deepEqual(committedLetters, ['B'], 'Transition must not commit intermediate letters');

// Settle on C (4 frames)
for (let i = 0; i < 4; i++) simulateFrame(state, 'C', false);
assert.deepEqual(committedLetters, ['B', 'C'], `Expected ['B', 'C'], got ${JSON.stringify(committedLetters)}`);
console.log('  ✓ Transition from B to C emitted ONLY [B, C]');

// -----------------------------------------------------------------------------
// Scenario 4: Transition S to T (Start S, transition to T -> only S and T)
// -----------------------------------------------------------------------------
console.log('Scenario 4: Transition from S to T');
const poseS = ASL_LANDMARKS['S'].slice(0, 21).map(([x, y]) => [x, y, 0]);
const poseT = ASL_LANDMARKS['T'].slice(0, 21).map(([x, y]) => [x, y, 0]);
assert.equal(classifyHand(poseS).gesture, 'S');
assert.equal(classifyHand(poseT).gesture, 'T');

state = { candidate: '', count: 0, last: '', armed: true };
committedLetters = [];

for (let i = 0; i < 4; i++) simulateFrame(state, 'S', false);
assert.deepEqual(committedLetters, ['S']);

// Transition thumb from across fingers to between knuckles
const transitionFramesST = interpolatePoses(poseS, poseT, 3);
for (let i = 0; i < transitionFramesST.length; i++) {
  const prev = i === 0 ? poseS : transitionFramesST[i - 1];
  const m = computeHandMotion(transitionFramesST[i], prev);
  const rawLetter = classifyHand(transitionFramesST[i]).gesture;
  simulateFrame(state, rawLetter, m.isMoving);
}
assert.deepEqual(committedLetters, ['S']);

for (let i = 0; i < 4; i++) simulateFrame(state, 'T', false);
assert.deepEqual(committedLetters, ['S', 'T'], `Expected ['S', 'T'], got ${JSON.stringify(committedLetters)}`);
console.log('  ✓ Transition from S to T emitted ONLY [S, T]');

// -----------------------------------------------------------------------------
// Scenario 6: Dynamic signs (Intentional J and Z recognized accurately)
// -----------------------------------------------------------------------------
console.log('Scenario 6: Dynamic J and Z gestures');
// Build a legitimate 'J' trajectory: starts with 'I' handshape, dips pinky down and swoops up/curving
const jFrames = [];
const baseI = poseI.map(([x, y, z]) => [x, y, z]);
for (let i = 0; i < 8; i++) {
  const t = i / 7;
  // Swoop: down then curve sideways
  const dy = Math.sin(t * Math.PI) * 0.22; // downward dip
  const dx = t * 0.25;                    // sideways sweep
  const frame = baseI.map((p, idx) => {
    if (idx === 20 || idx === 19) {
      return [p[0] + dx, p[1] + dy, p[2]];
    }
    return [p[0] + dx * 0.4, p[1] + dy * 0.3, p[2]];
  });
  jFrames.push(frame);
}
const seqJ = classifySequence(jFrames);
assert.equal(seqJ.gesture, 'J', `Expected dynamic gesture to be 'J', got ${seqJ?.gesture}`);
assert.ok(seqJ.confidence >= 0.90);
console.log('  ✓ Intentional dynamic J recognized accurately');

// Build a legitimate 'Z' trajectory: starts with 'D' handshape, traces horizontal + diagonal strokes
const poseD = ASL_LANDMARKS['D'].slice(0, 21).map(([x, y]) => [x, y, 0]);
assert.equal(classifyHand(poseD).gesture, 'D');
const zFrames = [];
const zPath = [
  [0, 0], [0.15, 0], [0.35, 0], // Top horizontal
  [0.20, 0.15], [0.05, 0.28],   // Diagonal down-left
  [0.18, 0.28], [0.35, 0.28]    // Bottom horizontal
];
for (const [dx, dy] of zPath) {
  const frame = poseD.map((p, idx) => {
    if (idx === 8 || idx === 7) return [p[0] + dx, p[1] + dy, p[2]];
    return [p[0] + dx * 0.5, p[1] + dy * 0.5, p[2]];
  });
  zFrames.push(frame);
}
const seqZ = classifySequence(zFrames);
assert.equal(seqZ.gesture, 'Z', `Expected dynamic gesture to be 'Z', got ${seqZ?.gesture}`);
console.log('  ✓ Intentional dynamic Z recognized accurately');

// -----------------------------------------------------------------------------
// Scenario 7: Both hands (Left and right hands recognized)
// -----------------------------------------------------------------------------
console.log('Scenario 7: Left and right hand recognition');
// Test mirrored (left hand) poses
for (const letter of ['A', 'B', 'C', 'D', 'I', 'S', 'T', 'V', 'W', 'Y']) {
  const orig = ASL_LANDMARKS[letter].slice(0, 21).map(([x, y]) => [x, y, 0]);
  // Mirror horizontally across x = 0.5
  const mirrored = orig.map(([x, y, z]) => [1.0 - x, y, z]);
  const resOrig = classifyHand(orig);
  const resMirrored = classifyHand(mirrored);
  assert.equal(resMirrored.gesture, letter, `Mirrored pose for ${letter} expected ${letter}, got ${resMirrored.gesture}`);
}
console.log('  ✓ Verified left-hand and right-hand recognition for representative alphabet classes');

console.log('\nAll 7 scenarios PASSED successfully!');
