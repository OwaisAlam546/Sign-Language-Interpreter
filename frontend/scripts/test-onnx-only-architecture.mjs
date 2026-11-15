// frontend/scripts/test-onnx-only-architecture.mjs
// Verification suite: ONNX-Only Architecture & Severance of Server LSTM
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-web/wasm';
import { extractAlphabetFeatures } from '../src/lib/alphabetLandmarkFeatures.js';
import { isAcceptedPrediction } from '../src/lib/recognitionPolicy.js';

console.log('================================================================');
console.log('SIGNSPEAK AI: ONNX-ONLY ARCHITECTURE VERIFICATION SUITE');
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

// -------------------------------------------------------------
// Group 1: ONNX Runtime Web (WASM) Engine & Dimensions
// -------------------------------------------------------------
console.log('--- Test Group 1: ONNX Model Dimensions & WASM Engine ---');

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

const modelPath = new URL('../public/models/alphabet_landmark_model.onnx', import.meta.url);
const labelsPath = new URL('../public/models/alphabet_landmark_labels.json', import.meta.url);
const datasetPath = new URL('./dataset_reference_landmarks.json', import.meta.url);

const modelBuffer = await readFile(modelPath);
const labels = JSON.parse(await readFile(labelsPath, 'utf8'));
const refLandmarks = JSON.parse(await readFile(datasetPath, 'utf8'));

const session = await ort.InferenceSession.create(modelBuffer, {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
  executionMode: 'sequential',
});

testAssert(
  'ONNX Runtime Web initializes session using WASM execution provider',
  Boolean(session)
);

const inputNames = session.inputNames;
testAssert(
  'Model defines single input tensor',
  inputNames.length === 1,
  `inputNames=${JSON.stringify(inputNames)}`
);

const outputNames = session.outputNames;
testAssert(
  'Model defines single output tensor',
  outputNames.length === 1,
  `outputNames=${JSON.stringify(outputNames)}`
);

testAssert(
  'Model vocabulary contains exactly 28 classes (A–Z + DEL + SPACE)',
  labels.length === 28 && labels[0] === 'A' && labels[25] === 'Z' && labels[26] === 'DEL' && labels[27] === 'SPACE',
  `count=${labels.length}`
);

// -------------------------------------------------------------
// Group 2: 90D Input Vector to 28-Class Inference Accuracy
// -------------------------------------------------------------
console.log('\n--- Test Group 2: Browser 90D Feature Inference Parity ---');

async function runOnnxInference(landmarks, isLeftHand = false) {
  const features = extractAlphabetFeatures(landmarks, isLeftHand);
  testAssert('Extracted feature tensor length is exactly 90', features.length === 90);

  const tensor = new ort.Tensor('float32', features, [1, 90]);
  const outputs = await session.run({ [inputNames[0]]: tensor });
  const outTensor = outputs[outputNames[0]];

  testAssert('Output tensor shape is [1, 28]', outTensor.dims[0] === 1 && outTensor.dims[1] === 28);

  const rawData = Array.from(outTensor.data);
  const sum = rawData.reduce((acc, val) => acc + val, 0);
  testAssert('Output probabilities are normalized softmax (~1.0)', Math.abs(sum - 1.0) < 0.05);

  const probabilities = rawData
    .map((score, index) => ({ label: labels[index], score: Number(score) }))
    .sort((a, b) => b.score - a.score);

  const top1 = probabilities[0];
  const top2 = probabilities[1] || { score: 0 };
  const margin = top1.score - top2.score;

  return {
    gesture: top1.label,
    confidence: top1.score,
    margin,
    top5: probabilities.slice(0, 5),
  };
}

const testLetters = ['A', 'B', 'C', 'L', 'O', 'Y', 'DEL', 'SPACE'];
for (const ch of testLetters) {
  const result = await runOnnxInference(refLandmarks[ch], false);
  testAssert(
    `ONNX 90D inference correctly recognizes sign '${ch}' with high confidence`,
    result.gesture === ch && result.confidence > 0.80 && result.margin > 0.30,
    `got=${result.gesture}, conf=${(result.confidence * 100).toFixed(1)}%, margin=${(result.margin * 100).toFixed(1)}%`
  );
}

// -------------------------------------------------------------
// Group 3: Recognition Policy & Backend-Decoupled Acceptance
// -------------------------------------------------------------
console.log('\n--- Test Group 3: Recognition Policy & Backend Decoupling ---');

// In Phase 7, backend offline simulation must not impair recognition
const onnxAcceptedOffline = isAcceptedPrediction({
  gesture: 'B',
  confidence: 0.99,
  margin: 0.85,
  serviceState: 'local', // Browser local ONNX mode
});

testAssert(
  'ONNX recognition accepted when backend is local / offline (serviceState=local)',
  onnxAcceptedOffline === true
);

const delAccepted = isAcceptedPrediction({
  gesture: 'DEL',
  confidence: 0.95,
  margin: 0.80,
  serviceState: 'local',
});
testAssert('ONNX recognition accepted for DEL control sign', delAccepted === true);

const spaceAccepted = isAcceptedPrediction({
  gesture: 'SPACE',
  confidence: 0.95,
  margin: 0.80,
  serviceState: 'local',
});
testAssert('ONNX recognition accepted for SPACE control sign', spaceAccepted === true);

// Rejected predictions properly rejected
const lowConfRejected = isAcceptedPrediction({
  gesture: 'B',
  confidence: 0.45,
  margin: 0.10,
  serviceState: 'local',
});
testAssert('Low confidence prediction strictly rejected by policy', lowConfRejected === false);

// -------------------------------------------------------------
// Group 4: Repository Static Verification (Severance Verification)
// -------------------------------------------------------------
console.log('\n--- Test Group 4: Codebase Static Audit (Server LSTM Severance) ---');

const liveDemoCode = await readFile(new URL('../src/sections/LiveDemo.jsx', import.meta.url), 'utf8');

testAssert(
  'LiveDemo.jsx does NOT contain any fetch to /predict-sequence',
  !liveDemoCode.includes('/predict-sequence'),
  'found /predict-sequence in LiveDemo.jsx!'
);

testAssert(
  'LiveDemo.jsx does NOT contain "Server LSTM Active"',
  !liveDemoCode.includes('Server LSTM Active')
);

testAssert(
  'LiveDemo.jsx displays active model as alphabet_landmark_model.onnx',
  liveDemoCode.includes('alphabet_landmark_model.onnx')
);

testAssert(
  'LiveDemo.jsx declares ONNX Runtime Web (WASM) as the primary engine',
  liveDemoCode.includes('ONNX Runtime Web (WASM)')
);

testAssert(
  'LiveDemo.jsx includes BROWSER ONNX, MEDIAPIPE, CAMERA, and BACKEND indicators',
  liveDemoCode.includes('Browser ONNX Active') &&
  liveDemoCode.includes('MediaPipe Active') &&
  liveDemoCode.includes('Camera Live') &&
  liveDemoCode.includes('Backend Available')
);

const heroCode = await readFile(new URL('../src/sections/Hero.jsx', import.meta.url), 'utf8');
testAssert(
  'Hero.jsx does NOT advertise "Rules + LSTM"',
  !heroCode.includes('Rules + LSTM') && heroCode.includes('ONNX Runtime Web')
);

const howItWorksCode = await readFile(new URL('../src/sections/HowItWorks.jsx', import.meta.url), 'utf8');
testAssert(
  'HowItWorks.jsx reflects ONNX model in step 04 instead of server LSTM',
  !howItWorksCode.includes('BI-LSTM CLASSIFIER') && howItWorksCode.includes('ONNX model')
);

console.log(`\n================================================================`);
console.log(`ONNX ARCHITECTURE VERIFICATION: ${passedTests} passed, 0 failed (${totalTests} total)`);
console.log(`================================================================\n`);
