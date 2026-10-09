/**
 * onnxAlphabetLandmark.js — Browser-side inference engine using the 90-feature
 * MediaPipe landmark ONNX model (alphabet_landmark_model.onnx).
 *
 * Direct landmark vector inference (no image rasterization, no 96x96 CNN).
 * Evaluates 21 normalized landmarks -> 90 geometric features -> 26 A-Z probabilities.
 */
import * as ort from 'onnxruntime-web/wasm';
import { extractAlphabetFeatures } from './alphabetLandmarkFeatures.js';

export const DEBUG_LOCAL_ONNX = true;

const MODEL_URL = '/models/alphabet_landmark_model.onnx';
const LABELS_URL = '/models/alphabet_landmark_labels.json';

let sessionPromise;
let labelsPromise;

// Browsers running dev servers without COOP/COEP cannot use SharedArrayBuffer.
// WASM execution with single-threaded sequential mode ensures reliable client execution.
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = {
  wasm: '/models/onnxruntime/ort-wasm-simd-threaded.wasm',
};

export function loadLandmarkSession(modelSource = MODEL_URL) {
  sessionPromise ||= ort.InferenceSession.create(modelSource, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
    executionMode: 'sequential',
  });
  return sessionPromise;
}

export function loadLandmarkLabels() {
  labelsPromise ||= fetch(LABELS_URL)
    .then((res) => res.json())
    .then((list) => list.map((label) => String(label).trim().toUpperCase()).filter(Boolean))
    .catch(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
  return labelsPromise;
}

/**
 * Runs inference on a single hand's landmarks.
 *
 * @param {Array|Float32Array} landmarks - 21 MediaPipe hand landmarks or 90D pre-extracted features
 * @returns {Promise<{gesture: string, confidence: number, margin: number, scores: Object}>}
 */
export async function inferAlphabetLandmark(landmarks, _frameWidth, _frameHeight) {
  const [session, labels] = await Promise.all([loadLandmarkSession(), loadLandmarkLabels()]);

  // If input is already a 90D Float32Array, use directly; otherwise extract 90D features
  const features = (landmarks instanceof Float32Array && landmarks.length === 90)
    ? landmarks
    : extractAlphabetFeatures(landmarks);

  const inputName = session.inputNames[0];
  const tensor = new ort.Tensor('float32', features, [1, 90]);
  const output = await session.run({ [inputName]: tensor });

  const outputName = session.outputNames[0];
  const outputTensor = output[outputName];
  if (!outputTensor || outputTensor.data.length !== labels.length) {
    throw new Error(`Landmark model output mismatch: expected ${labels.length} classes, received ${outputTensor?.data.length}`);
  }

  const rawData = Array.from(outputTensor.data);
  // Ensure normalized softmax probabilities (Keras model outputs softmax probabilities)
  const sum = rawData.reduce((acc, val) => acc + val, 0);
  const isSoftmax = Math.abs(sum - 1.0) < 0.05 && rawData.every((v) => v >= 0);

  let probabilities;
  if (isSoftmax) {
    probabilities = rawData.map((score, index) => ({ label: labels[index], score: Number(score) }))
      .sort((a, b) => b.score - a.score);
  } else {
    const maxVal = Math.max(...rawData);
    const exp = rawData.map((val) => Math.exp(val - maxVal));
    const totalExp = exp.reduce((acc, val) => acc + val, 0) || 1;
    probabilities = exp.map((expVal, index) => ({ label: labels[index], score: expVal / totalExp }))
      .sort((a, b) => b.score - a.score);
  }

  const scoreByLabel = Object.fromEntries(probabilities.map(({ label, score }) => [label, score]));
  const best = probabilities[0];
  const second = probabilities[1] || { score: 0 };

  if (DEBUG_LOCAL_ONNX) {
    const top5 = probabilities.slice(0, 5);
    const top5Lines = top5.map((item) => `${item.label} ${(item.score * 100).toFixed(1)}%`).join('\n');
    console.log(`TOP 5 RAW MODEL (90D LANDMARK):\n${top5Lines}\nRaw winner: ${best?.label || 'NONE'} (${((best?.score || 0) * 100).toFixed(1)}%)`);
  }

  return {
    gesture: best?.score >= 0.5 ? best.label : 'UNKNOWN',
    confidence: best?.score || 0,
    margin: (best?.score || 0) - (second.score || 0),
    scores: scoreByLabel,
    rawWinner: best?.label,
    rawConfidence: best?.score || 0,
    top5: probabilities.slice(0, 5),
  };
}

export const inferAlphabet = inferAlphabetLandmark;
