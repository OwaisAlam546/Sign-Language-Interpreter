import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { advanceStability, isAcceptedPrediction } from '../src/lib/recognitionPolicy.js';

const labels = (await readFile(new URL('../public/models/class_names.txt', import.meta.url), 'utf8'))
  .split(',').map((label) => label.trim().toUpperCase()).filter(Boolean);
assert.deepEqual(labels, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'local model labels must be A-Z in order');
const model = await readFile(new URL('../public/models/asl_cnn_model.onnx', import.meta.url));
assert.ok(model.length > 100_000, 'local ONNX model is missing or unexpectedly small');
const task = await readFile(new URL('../public/models/mediapipe/hand_landmarker.task', import.meta.url));
assert.ok(task.length > 100_000, 'local MediaPipe task asset is missing or unexpectedly small');
const ortWasm = await readFile(new URL('../public/models/onnxruntime/ort-wasm-simd-threaded.wasm', import.meta.url));
assert.deepEqual([...ortWasm.subarray(0, 4)], [0, 97, 115, 109], 'ONNX Runtime WASM has an invalid header');
const source = await readFile(new URL('../src/sections/LiveDemo.jsx', import.meta.url), 'utf8');
assert.match(source, /STATUS_TIMEOUT_MS/);
assert.match(source, /ONNX Static Letters/);
assert.match(source, /Retry camera/);
assert.equal(isAcceptedPrediction({ gesture: 'B', confidence: 0.9, serviceState: 'local' }), true);
assert.equal(isAcceptedPrediction({ gesture: 'HELLO', confidence: 0.99, serviceState: 'local', wordLabels: new Set(['HELLO']) }), false);
assert.equal(isAcceptedPrediction({ gesture: 'HELLO', confidence: 0.99, serviceState: 'ready', wordLabels: new Set(['HELLO']) }), true);
assert.equal(isAcceptedPrediction({ gesture: 'HELLO', confidence: 0.99, serviceState: 'ready', wordLabels: new Set(['YES']) }), false);
assert.equal(isAcceptedPrediction({ gesture: 'B', confidence: 0.6, serviceState: 'local' }), false);
let stable = { candidate: '', count: 0, last: '' };
for (let i = 0; i < 4; i += 1) stable = advanceStability(stable, 'B').state;
assert.equal(advanceStability(stable, 'B').committed, true);
console.log(`frontend smoke: ${labels.length} labels, ONNX ${model.length} bytes, MediaPipe ${task.length} bytes, ORT WASM ${ortWasm.length} bytes`);
