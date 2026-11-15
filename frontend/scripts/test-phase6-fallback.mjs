// frontend/scripts/test-phase6-fallback.mjs
// Phase 6: Rule-Based Classifier Reliability & Fallback Control Suite (Frontend)

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-web/wasm';
import { extractAlphabetLandmarkFeatures } from '../src/lib/alphabetLandmarkFeatures.js';
import { classifyHand, classifySequence } from '../src/lib/handClassifier.js';
import {
  isAcceptedPrediction,
  MIN_RECOGNITION_CONFIDENCE,
  MIN_TOP2_MARGIN,
} from '../src/lib/recognitionPolicy.js';

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

// ── Setup ONNX Runtime Session ──
const modelBuffer = await readFile(new URL('../public/models/alphabet_landmark_model.onnx', import.meta.url));
const labels = JSON.parse(await readFile(new URL('../public/models/alphabet_landmark_labels.json', import.meta.url), 'utf8'));

const session = await ort.InferenceSession.create(modelBuffer, {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
  executionMode: 'sequential',
});

const inputName = session.inputNames[0];
const outputName = session.outputNames[0];

function buildRealMpFist(thumbX, thumbY) {
  return [
    { x: 0.5, y: 0.7, z: 0.0 }, // 0 wrist
    { x: 0.46, y: 0.65, z: 0.0 }, // 1
    { x: 0.40, y: 0.60, z: 0.0 }, // 2
    { x: 0.36, y: 0.55, z: 0.0 }, // 3
    { x: thumbX, y: thumbY, z: 0.0 }, // 4 thumb tip
    // Index finger curled
    { x: 0.42, y: 0.47, z: 0.0 },
    { x: 0.42, y: 0.38, z: 0.0 },
    { x: 0.42, y: 0.44, z: 0.0 },
    { x: 0.42, y: 0.50, z: 0.0 },
    // Middle finger curled
    { x: 0.50, y: 0.45, z: 0.0 },
    { x: 0.50, y: 0.36, z: 0.0 },
    { x: 0.50, y: 0.42, z: 0.0 },
    { x: 0.50, y: 0.48, z: 0.0 },
    // Ring finger curled
    { x: 0.58, y: 0.47, z: 0.0 },
    { x: 0.58, y: 0.38, z: 0.0 },
    { x: 0.58, y: 0.44, z: 0.0 },
    { x: 0.58, y: 0.50, z: 0.0 },
    // Pinky finger curled
    { x: 0.65, y: 0.50, z: 0.0 },
    { x: 0.65, y: 0.42, z: 0.0 },
    { x: 0.65, y: 0.47, z: 0.0 },
    { x: 0.65, y: 0.52, z: 0.0 },
  ];
}

console.log('================================================================');
console.log('PHASE 6: FRONTEND RULE-BASED RELIABILITY & FALLBACK SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  [PASS] ${name}`);
  } else {
    failed += 1;
    console.log(`  [FAIL] ${name} - ${detail}`);
  }
}

// ── Test Group 1: classifyHand Robustness & Fist Rejection ──
console.log('--- Test Group 1: classifyHand Robustness & Fist Rejection ---');

// 1. Unmatched fist pose: thumb curled downward into palm center
const unmatchedFistS = buildRealMpFist(0.50, 0.70);
const resUnmatchedS = classifyHand(unmatchedFistS);
check("Unmatched fist (thumb at palm center) returns UNKNOWN (not S!)",
  resUnmatchedS.gesture === 'UNKNOWN' && resUnmatchedS.confidence < 0.55,
  `got gesture=${resUnmatchedS.gesture}, conf=${resUnmatchedS.confidence}`);

// 2. Unmatched fist pose: thumb dangling far away near wrist
const unmatchedFistA = buildRealMpFist(0.25, 0.72);
const resUnmatchedA = classifyHand(unmatchedFistA);
check("Unmatched fist (thumb dangling away) returns UNKNOWN (not A!)",
  resUnmatchedA.gesture === 'UNKNOWN' && resUnmatchedA.confidence < 0.55,
  `got gesture=${resUnmatchedA.gesture}, conf=${resUnmatchedA.confidence}`);

// 3. Textbook 'S' fist
const textbookS = buildRealMpFist(0.48, 0.47);
const resS = classifyHand(textbookS);
check("Textbook 'S' recognized as 'S'",
  resS.gesture === 'S' && resS.confidence >= 0.85,
  `got gesture=${resS.gesture}, conf=${resS.confidence}`);

// 4. Textbook 'A' fist
const textbookA = buildRealMpFist(0.38, 0.46);
const resA = classifyHand(textbookA);
check("Textbook 'A' recognized as 'A'",
  resA.gesture === 'A' && resA.confidence >= 0.90,
  `got gesture=${resA.gesture}, conf=${resA.confidence}`);

// 5. Unsupported hand pose (horns gesture)
const hornsPose = [
  { x: 0.5, y: 0.7, z: 0.0 }, // 0
  { x: 0.45, y: 0.65, z: 0.0 }, { x: 0.42, y: 0.60, z: 0.0 }, { x: 0.40, y: 0.55, z: 0.0 }, { x: 0.45, y: 0.52, z: 0.0 },
  { x: 0.42, y: 0.47, z: 0.0 }, { x: 0.42, y: 0.38, z: 0.0 }, { x: 0.42, y: 0.30, z: 0.0 }, { x: 0.42, y: 0.22, z: 0.0 }, // index extended
  { x: 0.50, y: 0.45, z: 0.0 }, { x: 0.50, y: 0.36, z: 0.0 }, { x: 0.50, y: 0.42, z: 0.0 }, { x: 0.50, y: 0.48, z: 0.0 }, // middle curled
  { x: 0.58, y: 0.47, z: 0.0 }, { x: 0.58, y: 0.38, z: 0.0 }, { x: 0.58, y: 0.44, z: 0.0 }, { x: 0.58, y: 0.50, z: 0.0 }, // ring curled
  { x: 0.65, y: 0.50, z: 0.0 }, { x: 0.65, y: 0.40, z: 0.0 }, { x: 0.65, y: 0.32, z: 0.0 }, { x: 0.65, y: 0.24, z: 0.0 }, // pinky extended
];
const resHorns = classifyHand(hornsPose);
check("Unsupported horns pose returns UNKNOWN",
  resHorns.gesture === 'UNKNOWN',
  `got gesture=${resHorns.gesture}`);

// 6. Degenerate landmarks (all zeros)
const zeros = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
const resZeros = classifyHand(zeros);
check("All-zeros landmarks return UNKNOWN (conf=0.0)",
  resZeros.gesture === 'UNKNOWN' && resZeros.confidence === 0.0,
  `got conf=${resZeros.confidence}`);

// 7. Collapsed palm (< 0.01)
const collapsed = Array.from({ length: 21 }, (_, i) => ({ x: 0.5 + i * 0.0001, y: 0.5 + i * 0.0001, z: 0.0 }));
const resCollapsed = classifyHand(collapsed);
check("Collapsed palm (< 0.01) returns UNKNOWN (conf=0.0)",
  resCollapsed.gesture === 'UNKNOWN' && resCollapsed.confidence === 0.0,
  `got conf=${resCollapsed.confidence}`);

// 8. Incomplete landmarks (< 21)
const incomplete = Array.from({ length: 10 }, () => ({ x: 0.5, y: 0.5, z: 0.0 }));
const resIncomplete = classifyHand(incomplete);
check("Incomplete landmarks (< 21) return UNKNOWN (conf=0.0)",
  resIncomplete.gesture === 'UNKNOWN' && resIncomplete.confidence === 0.0,
  `got conf=${resIncomplete.confidence}`);

// 9. Null or empty input
const resNull = classifyHand(null);
check("Null landmarks return UNKNOWN (conf=0.0)",
  resNull.gesture === 'UNKNOWN' && resNull.confidence === 0.0,
  `got conf=${resNull.confidence}`);

// 10. Non-finite coordinates (NaN)
const nanLms = buildRealMpFist(0.48, 0.47);
nanLms[4].x = NaN;
const resNan = classifyHand(nanLms);
check("Landmarks containing NaN return UNKNOWN (conf=0.0)",
  resNan.gesture === 'UNKNOWN' && resNan.confidence === 0.0,
  `got conf=${resNan.confidence}`);

// 11. Non-finite coordinates (Infinity)
const infLms = buildRealMpFist(0.48, 0.47);
infLms[8].y = Infinity;
const resInf = classifyHand(infLms);
check("Landmarks containing Infinity return UNKNOWN (conf=0.0)",
  resInf.gesture === 'UNKNOWN' && resInf.confidence === 0.0,
  `got conf=${resInf.confidence}`);


// ── Test Group 2: Recognition Policy isAcceptedPrediction Strictness ──
console.log('\n--- Test Group 2: Policy Validation & Non-Finite Rejection ---');

// 12. Valid prediction accepted
check("Valid single letter accepted",
  isAcceptedPrediction({ gesture: 'A', confidence: 0.90, margin: 0.30, serviceState: 'local' }) === true);

// 13. Low confidence rejected
check("Low confidence (< 0.65) rejected",
  isAcceptedPrediction({ gesture: 'A', confidence: 0.64, margin: 0.30, serviceState: 'local' }) === false);

// 14. Ambiguous margin rejected
check("Ambiguous margin (< 0.15) rejected",
  isAcceptedPrediction({ gesture: 'A', confidence: 0.90, margin: 0.14, serviceState: 'local' }) === false);

// 15. NaN confidence strictly rejected
check("NaN confidence strictly rejected",
  isAcceptedPrediction({ gesture: 'A', confidence: NaN, margin: 0.30, serviceState: 'local' }) === false);

// 16. NaN margin strictly rejected
check("NaN margin strictly rejected",
  isAcceptedPrediction({ gesture: 'A', confidence: 0.90, margin: NaN, serviceState: 'local' }) === false);

// 17. Infinity confidence strictly rejected
check("Infinity confidence strictly rejected",
  isAcceptedPrediction({ gesture: 'A', confidence: Infinity, margin: 0.30, serviceState: 'local' }) === false);

// 18. Confidence > 1.0 strictly rejected
check("Confidence > 1.0 strictly rejected",
  isAcceptedPrediction({ gesture: 'A', confidence: 1.5, margin: 0.30, serviceState: 'local' }) === false);

// 19. Margin > 1.0 strictly rejected
check("Margin > 1.0 strictly rejected",
  isAcceptedPrediction({ gesture: 'A', confidence: 0.90, margin: 1.5, serviceState: 'local' }) === false);

// 20. Negative confidence rejected
check("Negative confidence rejected",
  isAcceptedPrediction({ gesture: 'A', confidence: -0.5, margin: 0.30, serviceState: 'local' }) === false);

// 21. Gesture UNKNOWN rejected
check("Gesture UNKNOWN rejected",
  isAcceptedPrediction({ gesture: 'UNKNOWN', confidence: 0.99, margin: 0.90, serviceState: 'local' }) === false);

// 22. Gesture NONE rejected
check("Gesture NONE rejected",
  isAcceptedPrediction({ gesture: 'NONE', confidence: 0.99, margin: 0.90, serviceState: 'local' }) === false);

// 23. Service state error rejected
check("Service state 'error' rejected",
  isAcceptedPrediction({ gesture: 'A', confidence: 0.99, margin: 0.90, serviceState: 'error' }) === false);


// ── Test Group 3: ONNX vs Rule Fallback Separation & Attribution ──
console.log('\n--- Test Group 3: ONNX & Fallback Separation ---');

// 24. Simulated LiveDemo dispatch logic
function simulateRecognitionDispatch({ onnxThrows, onnxScore, onnxMargin, onnxWinner, handLms }) {
  let result = null;
  let onnxResult = null;

  if (!onnxThrows) {
    // Normal ONNX execution
    const isAccepted = isAcceptedPrediction({
      gesture: onnxWinner,
      confidence: onnxScore,
      margin: onnxMargin,
      serviceState: 'local',
    });
    onnxResult = {
      gesture: isAccepted ? onnxWinner : 'UNKNOWN',
      confidence: onnxScore,
      margin: onnxMargin,
      isAccepted,
      rawWinner: onnxWinner,
      source: 'onnx-90d',
    };
    result = onnxResult;
  } else {
    // ONNX threw an exception -> fallback to classifyHand
    const staticResult = classifyHand(handLms);
    const fallbackAccepted = staticResult && staticResult.gesture !== 'UNKNOWN' && isAcceptedPrediction({
      gesture: staticResult.gesture,
      confidence: staticResult.confidence,
      margin: 0.5,
      serviceState: 'local',
    });
    result = {
      gesture: fallbackAccepted ? staticResult.gesture : 'UNKNOWN',
      confidence: staticResult.confidence,
      margin: 0.5,
      rawWinner: staticResult.gesture,
      isAccepted: fallbackAccepted,
      source: 'rule-fallback',
    };
  }
  return result;
}

// 25. ONNX successful with clear winner -> attributes onnx-90d
const outNormal = simulateRecognitionDispatch({
  onnxThrows: false,
  onnxScore: 0.95,
  onnxMargin: 0.50,
  onnxWinner: 'B',
  handLms: textbookA,
});
check("Normal ONNX output attributes source='onnx-90d'",
  outNormal.source === 'onnx-90d' && outNormal.gesture === 'B' && outNormal.isAccepted === true);

// 26. ONNX low confidence -> returns UNKNOWN, does NOT call rule fallback!
const outLowConf = simulateRecognitionDispatch({
  onnxThrows: false,
  onnxScore: 0.40,
  onnxMargin: 0.05,
  onnxWinner: 'A',
  handLms: textbookA, // hand is textbook A, but ONNX rejected it
});
check("Rejected ONNX result returns UNKNOWN and does NOT trigger rule fallback",
  outLowConf.source === 'onnx-90d' && outLowConf.gesture === 'UNKNOWN' && outLowConf.isAccepted === false);

// 27. ONNX throws exception -> invokes rule fallback with source='rule-fallback'
const outFallback = simulateRecognitionDispatch({
  onnxThrows: true,
  handLms: textbookA,
});
check("ONNX exception invokes rule fallback attributing source='rule-fallback'",
  outFallback.source === 'rule-fallback' && outFallback.gesture === 'A' && outFallback.isAccepted === true);

// 28. ONNX throws exception on unmatched hand -> rule fallback returns UNKNOWN
const outFallbackUnmatched = simulateRecognitionDispatch({
  onnxThrows: true,
  handLms: unmatchedFistS,
});
check("ONNX exception on unmatched hand leaves fallback rejected (UNKNOWN)",
  outFallbackUnmatched.source === 'rule-fallback' && outFallbackUnmatched.gesture === 'UNKNOWN' && outFallbackUnmatched.isAccepted === false);

console.log('\n================================================================');
console.log(`PHASE 6 FRONTEND RESULTS: ${passed} passed, ${failed} failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
