/**
 * onnxWordRecognizer.js — Browser-side inference engine using the 25-class
 * WLASL100 sequence GRU model (wlasl100_gru_25class.onnx).
 *
 * Sequence Input: [batch_size, 16, 147] float32 tensor
 * Output: [batch_size, 25] float32 probabilities
 */
import * as ort from 'onnxruntime-web/wasm';
import { FEATURE_DIM, SEQUENCE_LENGTH } from './wordLandmarkFeatures.js';

export const DEBUG_WORD_ONNX = false;

const MODEL_URL = '/models/wlasl100_gru_25class.onnx';
const LABELS_URL = '/models/wlasl100_gru_labels.json';

// Default recognition policy thresholds for word sequence acceptance
export const DEFAULT_WORD_THRESHOLDS = {
  MIN_WORD_CONFIDENCE: 0.72, // Minimum posterior probability for commitment
  MIN_WORD_MARGIN: 0.18,     // Minimum Top-1 vs Top-2 separation
  LOCKOUT_MS: 750,           // Alphabet engine lockout window after word commitment
  DUPLICATE_COOLDOWN_MS: 1200 // Refractory period before repeating same word
};

export const DEFAULT_WORD_LABELS = [
  'BEFORE', 'BOOK', 'CHAIR', 'COMPUTER', 'DEAF', 'DRINK', 'EAT', 'FAMILY',
  'FINE', 'FINISH', 'GO', 'HELP', 'LIKE', 'MOTHER', 'NO', 'NOW', 'SCHOOL',
  'WALK', 'WANT', 'WHAT', 'WHO', 'WOMAN', 'WORK', 'YEAR', 'YES'
];

let sessionPromise = null;
let labelsPromise = null;

// WASM configuration for single-threaded sequential execution
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
if (typeof window !== 'undefined') {
  ort.env.wasm.wasmPaths = {
    wasm: '/models/onnxruntime/ort-wasm-simd-threaded.wasm',
  };
}

/**
 * Lazily loads the ONNX runtime InferenceSession for the 25-class word model.
 *
 * @param {string|ArrayBuffer} modelSource - URL, ArrayBuffer or path to the ONNX model
 * @returns {Promise<ort.InferenceSession>}
 */
export function loadWordSession(modelSource = MODEL_URL) {
  sessionPromise ||= ort.InferenceSession.create(modelSource, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
    executionMode: 'sequential',
  });
  return sessionPromise;
}

/**
 * Loads the 25 class labels from JSON.
 *
 * @returns {Promise<string[]>}
 */
export function loadWordLabels() {
  if (labelsPromise) return labelsPromise;
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    labelsPromise = fetch(LABELS_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching word labels`);
        return res.json();
      })
      .then((list) => list.map((label) => String(label).trim().toUpperCase()).filter(Boolean))
      .catch((err) => {
        console.warn('Failed to fetch word labels, using fallback list:', err);
        return DEFAULT_WORD_LABELS;
      });
  } else {
    labelsPromise = Promise.resolve(DEFAULT_WORD_LABELS);
  }
  return labelsPromise;
}

/**
 * Evaluates a 16-frame sequence through the 25-class WLASL100 GRU model.
 *
 * @param {Float32Array|Array<number>} tensorData - 2352 floats (16 * 147)
 * @param {Object} options - Threshold options
 * @returns {Promise<{
 *   topWord: string,
 *   confidence: number,
 *   margin: number,
 *   top3: Array<{label: string, score: number}>,
 *   top5: Array<{label: string, score: number}>,
 *   isAccepted: boolean,
 *   scores: Object<string, number>,
 *   latencyMs: number
 * }>}
 */
export async function inferWordSequence(tensorData, options = {}) {
  const minConfidence = options.minConfidence ?? DEFAULT_WORD_THRESHOLDS.MIN_WORD_CONFIDENCE;
  const minMargin = options.minMargin ?? DEFAULT_WORD_THRESHOLDS.MIN_WORD_MARGIN;

  const expectedLength = SEQUENCE_LENGTH * FEATURE_DIM; // 16 * 147 = 2352
  if (!tensorData || tensorData.length !== expectedLength) {
    throw new Error(`Invalid tensor data length: expected ${expectedLength} floats (16x147), got ${tensorData?.length}`);
  }

  const startTime = performance.now();
  const [session, labels] = await Promise.all([loadWordSession(), loadWordLabels()]);

  const floatArray = tensorData instanceof Float32Array ? tensorData : new Float32Array(tensorData);
  const inputTensor = new ort.Tensor('float32', floatArray, [1, SEQUENCE_LENGTH, FEATURE_DIM]);

  const inputName = session.inputNames[0] || 'sequence_input';
  const outputName = session.outputNames[0] || 'Identity:0';

  const outputMap = await session.run({ [inputName]: inputTensor });
  const latencyMs = performance.now() - startTime;

  const outputTensor = outputMap[outputName];
  if (!outputTensor || outputTensor.data.length !== labels.length) {
    throw new Error(`Model output mismatch: expected ${labels.length} classes, received ${outputTensor?.data?.length}`);
  }

  const rawData = Array.from(outputTensor.data);
  // Verify finite values
  if (!rawData.length || rawData.some((v) => !Number.isFinite(v))) {
    return {
      topWord: 'UNKNOWN',
      confidence: 0,
      margin: 0,
      top3: [],
      top5: [],
      isAccepted: false,
      scores: {},
      latencyMs,
    };
  }

  // Softmax normalization check
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

  const best = probabilities[0];
  const second = probabilities[1] || { score: 0 };
  const margin = Math.max(0, (best?.score || 0) - (second.score || 0));

  const isAccepted = Boolean(
    best &&
    best.score >= minConfidence &&
    margin >= minMargin
  );

  const top3 = probabilities.slice(0, 3);
  const top5 = probabilities.slice(0, 5);
  const scores = Object.fromEntries(probabilities.map(({ label, score }) => [label, score]));

  if (DEBUG_WORD_ONNX) {
    const top3Str = top3.map((t) => `${t.label}: ${(t.score * 100).toFixed(1)}%`).join(' | ');
    console.log(`[Word ONNX] ${top3Str} => Winner: ${best?.label} (Margin: ${(margin * 100).toFixed(1)}%, Accepted: ${isAccepted}) [${latencyMs.toFixed(1)}ms]`);
  }

  return {
    topWord: best?.label || 'UNKNOWN',
    confidence: best?.score || 0,
    margin,
    top3,
    top5,
    isAccepted,
    scores,
    latencyMs,
  };
}
