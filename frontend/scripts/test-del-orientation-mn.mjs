// frontend/scripts/test-del-orientation-mn.mjs
// Verification suite: DEL Across Hand Orientations & M/N Classification Reliability
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-web/wasm';
import { extractAlphabetFeatures } from '../src/lib/alphabetLandmarkFeatures.js';
import { isAcceptedPrediction } from '../src/lib/recognitionPolicy.js';

console.log('================================================================');
console.log('SIGNSPEAK AI: DEL ORIENTATION & M/N RECOGNITION TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function testAssert(name, condition, extra = '') {
  totalTests++;
  if (!condition) {
    console.error(`  [FAIL] ${name} ${extra ? `(${extra})` : ''}`);
    throw new Error(`Assertion failed: ${name}`);
  }
  console.log(`  [PASS] ${name}`);
  passedTests++;
}

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

const modelPath = new URL('../public/models/alphabet_landmark_model.onnx', import.meta.url);
const labelsPath = new URL('../public/models/alphabet_landmark_labels.json', import.meta.url);
const refPath = new URL('./dataset_reference_landmarks.json', import.meta.url);

const modelBuffer = await readFile(modelPath);
const labels = JSON.parse(await readFile(labelsPath, 'utf8'));
const refLandmarks = JSON.parse(await readFile(refPath, 'utf8'));

const session = await ort.InferenceSession.create(modelBuffer, {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
  executionMode: 'sequential',
});

const inputName = session.inputNames[0];
const outputName = session.outputNames[0];

async function inferLandmarks(landmarks, isLeftHand = false) {
  const features = extractAlphabetFeatures(landmarks, isLeftHand);
  const tensor = new ort.Tensor('float32', features, [1, 90]);
  const outputs = await session.run({ [inputName]: tensor });
  const rawData = Array.from(outputs[outputName].data);

  const probabilities = rawData
    .map((score, index) => ({ label: labels[index], score: Number(score) }))
    .sort((a, b) => b.score - a.score);

  const top1 = probabilities[0];
  const top2 = probabilities[1] || { score: 0 };
  const margin = top1.score - top2.score;
  const scoreByLabel = Object.fromEntries(probabilities.map((p) => [p.label, p.score]));

  return {
    gesture: top1.label,
    confidence: top1.score,
    top2: top2.label,
    top2Conf: top2.score,
    margin,
    scores: scoreByLabel,
    top5: probabilities.slice(0, 5),
  };
}

function rotateLandmarksZ(landmarks, deg) {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const wrist = landmarks[0];
  const wx = Array.isArray(wrist) ? wrist[0] : wrist.x;
  const wy = Array.isArray(wrist) ? wrist[1] : wrist.y;
  const wz = Array.isArray(wrist) ? wrist[2] : (wrist.z || 0);

  return landmarks.map((pt) => {
    const x = Array.isArray(pt) ? pt[0] : pt.x;
    const y = Array.isArray(pt) ? pt[1] : pt.y;
    const z = Array.isArray(pt) ? pt[2] : (pt.z || 0);
    const rx = x - wx;
    const ry = y - wy;
    const rz = z - wz;
    return [
      rx * cos - ry * sin + wx,
      rx * sin + ry * cos + wy,
      rz + wz,
    ];
  });
}

// -------------------------------------------------------------
// Group 1: DEL Across Diverse Hand Orientations
// -------------------------------------------------------------
console.log('--- Test Group 1: DEL Across Diverse Hand Orientations ---');

const baseDel = refLandmarks['DEL'];
testAssert('Reference DEL landmarks present', Array.isArray(baseDel) && baseDel.length === 21);

// Test at 0° (Kaggle horizontal orientation)
const resDel0 = await inferLandmarks(baseDel);
testAssert(
  'DEL in horizontal profile (0° roll) recognized with high confidence',
  resDel0.gesture === 'DEL' && resDel0.confidence > 0.85,
  `got=${resDel0.gesture}, conf=${(resDel0.confidence * 100).toFixed(1)}%, margin=${(resDel0.margin * 100).toFixed(1)}%`
);

// Test across angles towards natural upright fingerspelling (+30°, +45°, +60°, +75°, +90°)
for (const angle of [30, 45, 60, 75, 90]) {
  const rotated = rotateLandmarksZ(baseDel, angle);
  const res = await inferLandmarks(rotated);
  testAssert(
    `DEL tilted +${angle}° (towards natural upright) recognized as DEL`,
    res.gesture === 'DEL' && res.confidence > 0.80,
    `got=${res.gesture}, conf=${(res.confidence * 100).toFixed(1)}%, margin=${(res.margin * 100).toFixed(1)}%`
  );
}

// -------------------------------------------------------------
// Group 2: M vs N Classification and Confusion Resistance
// -------------------------------------------------------------
console.log('\n--- Test Group 2: M and N Classification Reliability ---');

const baseM = refLandmarks['M'];
const baseN = refLandmarks['N'];

testAssert('Reference M landmarks present', Array.isArray(baseM) && baseM.length === 21);
testAssert('Reference N landmarks present', Array.isArray(baseN) && baseN.length === 21);

const resM = await inferLandmarks(baseM);
testAssert(
  'Gesture M correctly recognized as M',
  resM.gesture === 'M' && resM.confidence > 0.85,
  `got=${resM.gesture}, conf=${(resM.confidence * 100).toFixed(1)}%, margin=${(resM.margin * 100).toFixed(1)}%`
);
testAssert(
  'Gesture M has low N confusion probability (< 15%)',
  (resM.scores['N'] || 0) < 0.15,
  `N prob=${((resM.scores['N'] || 0) * 100).toFixed(1)}%`
);

const resN = await inferLandmarks(baseN);
testAssert(
  'Gesture N correctly recognized as N',
  resN.gesture === 'N' && resN.confidence > 0.85,
  `got=${resN.gesture}, conf=${(resN.confidence * 100).toFixed(1)}%, margin=${(resN.margin * 100).toFixed(1)}%`
);
testAssert(
  'Gesture N has low M confusion probability (< 15%)',
  (resN.scores['M'] || 0) < 0.15,
  `M prob=${((resN.scores['M'] || 0) * 100).toFixed(1)}%`
);

// -------------------------------------------------------------
// Group 3: Recognition Policy & Stability for DEL and N
// -------------------------------------------------------------
console.log('\n--- Test Group 3: Policy Acceptance & Debounce Integrity ---');

testAssert(
  'High-confidence DEL is accepted by policy',
  isAcceptedPrediction({ gesture: 'DEL', confidence: 0.95, margin: 0.80, serviceState: 'local' }) === true
);

testAssert(
  'High-confidence N is accepted by policy',
  isAcceptedPrediction({ gesture: 'N', confidence: 0.95, margin: 0.80, serviceState: 'local' }) === true
);

testAssert(
  'Low confidence DEL (< 0.65) is rejected by policy',
  isAcceptedPrediction({ gesture: 'DEL', confidence: 0.55, margin: 0.40, serviceState: 'local' }) === false
);

testAssert(
  'Ambiguous N margin (< 0.15) is rejected by policy',
  isAcceptedPrediction({ gesture: 'N', confidence: 0.80, margin: 0.10, serviceState: 'local' }) === false
);

// -------------------------------------------------------------
// Group 4: SPACE and Alphabet Regression
// -------------------------------------------------------------
console.log('\n--- Test Group 4: SPACE & A–Z Regression Checks ---');

const baseSpace = refLandmarks['SPACE'];
const resSpace = await inferLandmarks(baseSpace);
testAssert(
  'SPACE sign recognized with high confidence',
  resSpace.gesture === 'SPACE' && resSpace.confidence > 0.85,
  `got=${resSpace.gesture}, conf=${(resSpace.confidence * 100).toFixed(1)}%`
);

for (const ch of ['A', 'B', 'C', 'L', 'O', 'Y', 'S', 'T']) {
  const res = await inferLandmarks(refLandmarks[ch]);
  testAssert(
    `Letter '${ch}' recognized with high confidence`,
    res.gesture === ch && res.confidence > 0.80,
    `got=${res.gesture}, conf=${(res.confidence * 100).toFixed(1)}%`
  );
}

console.log(`\n================================================================`);
console.log(`DEL ORIENTATION & M/N TEST SUITE: ${passedTests} passed, 0 failed (${totalTests} total)`);
console.log(`================================================================\n`);
