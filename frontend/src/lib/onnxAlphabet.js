import * as ort from 'onnxruntime-web/wasm';

const MODEL_URL = '/models/asl_cnn_model.onnx';
const LABELS_URL = '/models/class_names.txt';
const CANVAS_SIZE = 192;
const INPUT_SIZE = 96;
const CONNECTIONS = [
  { from: 0, to: 1, color: '#808080', thickness: 3 }, { from: 0, to: 5, color: '#808080', thickness: 3 },
  { from: 0, to: 17, color: '#808080', thickness: 3 }, { from: 5, to: 9, color: '#808080', thickness: 3 },
  { from: 9, to: 13, color: '#808080', thickness: 3 }, { from: 13, to: 17, color: '#808080', thickness: 3 },
  { from: 1, to: 2, color: '#ffe5b4', thickness: 2 }, { from: 2, to: 3, color: '#ffe5b4', thickness: 2 }, { from: 3, to: 4, color: '#ffe5b4', thickness: 2 },
  { from: 5, to: 6, color: '#804080', thickness: 2 }, { from: 6, to: 7, color: '#804080', thickness: 2 }, { from: 7, to: 8, color: '#804080', thickness: 2 },
  { from: 9, to: 10, color: '#ffcc00', thickness: 2 }, { from: 10, to: 11, color: '#ffcc00', thickness: 2 }, { from: 11, to: 12, color: '#ffcc00', thickness: 2 },
  { from: 13, to: 14, color: '#30ff30', thickness: 2 }, { from: 14, to: 15, color: '#30ff30', thickness: 2 }, { from: 15, to: 16, color: '#30ff30', thickness: 2 },
  { from: 17, to: 18, color: '#1565c0', thickness: 2 }, { from: 18, to: 19, color: '#1565c0', thickness: 2 }, { from: 19, to: 20, color: '#1565c0', thickness: 2 },
];
const LANDMARKS = [
  { index: 0, color: '#ff3030' }, { index: 1, color: '#ff3030' },
  { index: 2, color: '#ffe5b4' }, { index: 3, color: '#ffe5b4' }, { index: 4, color: '#ffe5b4' },
  { index: 5, color: '#ff3030' }, { index: 6, color: '#804080' }, { index: 7, color: '#804080' }, { index: 8, color: '#804080' },
  { index: 9, color: '#ff3030' }, { index: 10, color: '#ffcc00' }, { index: 11, color: '#ffcc00' }, { index: 12, color: '#ffcc00' },
  { index: 13, color: '#ff3030' }, { index: 14, color: '#30ff30' }, { index: 15, color: '#30ff30' }, { index: 16, color: '#30ff30' },
  { index: 17, color: '#ff3030' }, { index: 18, color: '#1565c0' }, { index: 19, color: '#1565c0' }, { index: 20, color: '#1565c0' },
];

let sessionPromise;
let labelsPromise;
let renderCanvas;
let inputCanvas;

// Browsers running the dev server are commonly not cross-origin isolated.
// Disable worker proxying/threads so the local classifier works without
// SharedArrayBuffer or COOP/COEP headers.
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = {
  wasm: '/models/onnxruntime/ort-wasm-simd-threaded.wasm',
};

function loadSession() {
  sessionPromise ||= ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
    executionMode: 'sequential',
  });
  return sessionPromise;
}

function loadLabels() {
  labelsPromise ||= fetch(LABELS_URL).then((response) => response.text()).then((text) => text.split(',').map((label) => label.trim().toUpperCase()).filter(Boolean));
  return labelsPromise;
}

function normalizeLandmarks(frame, frameWidth, frameHeight) {
  // MediaPipe x and y are normalized against different frame dimensions.
  // Convert to pixel units first or a 4:3 camera silently squashes the pose.
  const points = frame.map(([x, y]) => [x * frameWidth, y * frameHeight]);
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  const extent = Math.max(maxX - minX, maxY - minY, 1e-6);
  const box = extent / 0.7;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const ox = cx - box / 2;
  const oy = cy - box / 2;
  return points.map(([x, y]) => [((x - ox) / box), ((y - oy) / box)]);
}

function scaled(value) { return Math.max(2, Math.round(value * CANVAS_SIZE / 160)); }

function makeInput(frame, frameWidth, frameHeight) {
  renderCanvas ||= document.createElement('canvas');
  inputCanvas ||= document.createElement('canvas');
  renderCanvas.width = renderCanvas.height = CANVAS_SIZE;
  inputCanvas.width = inputCanvas.height = INPUT_SIZE;
  const render = renderCanvas.getContext('2d', { willReadFrequently: true });
  render.fillStyle = '#000';
  render.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const points = normalizeLandmarks(frame, frameWidth, frameHeight).map(([x, y]) => [Math.round(x * CANVAS_SIZE), Math.round(y * CANVAS_SIZE)]);
  render.lineCap = 'round';
  render.lineJoin = 'round';
  CONNECTIONS.forEach(({ from, to, color, thickness }) => {
    render.beginPath();
    render.moveTo(points[from][0], points[from][1]);
    render.lineTo(points[to][0], points[to][1]);
    render.strokeStyle = color;
    render.lineWidth = scaled(thickness);
    render.stroke();
  });
  LANDMARKS.forEach(({ index, color }) => {
    const [x, y] = points[index];
    const radius = scaled(3.5);
    render.beginPath();
    render.arc(x, y, radius, 0, Math.PI * 2);
    render.fillStyle = color;
    render.fill();
  });
  const input = inputCanvas.getContext('2d', { willReadFrequently: true });
  input.imageSmoothingEnabled = true;
  input.imageSmoothingQuality = 'high';
  input.drawImage(renderCanvas, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const pixels = input.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const tensor = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let i = 0, j = 0; i < pixels.length; i += 4) {
    tensor[j++] = pixels[i];
    tensor[j++] = pixels[i + 1];
    tensor[j++] = pixels[i + 2];
  }
  return new ort.Tensor('float32', tensor, [1, INPUT_SIZE, INPUT_SIZE, 3]);
}

export async function inferAlphabet(frame, frameWidth = 640, frameHeight = 480) {
  const [session, labels] = await Promise.all([loadSession(), loadLabels()]);
  const inputName = session.inputNames[0];
  const output = await session.run({ [inputName]: makeInput(frame, frameWidth, frameHeight) });
  // The official model exports named logits plus optional visualization taps.
  // Select logits explicitly; relying on output order can classify an activation
  // tensor as if it were the 26 alphabet scores.
  const logitsName = session.outputNames.find((name) => name.toLowerCase() === 'logits') || session.outputNames[0];
  const logits = output[logitsName];
  if (!logits || logits.data.length !== labels.length) {
    throw new Error(`Alphabet model output/label mismatch (${logits?.data.length ?? 0} scores, ${labels.length} labels)`);
  }
  const scores = logits.data;
  const ranked = Array.from(scores, (score, index) => ({ label: labels[index], score: Number(score) }))
    .sort((a, b) => b.score - a.score);
  const max = Math.max(...ranked.map(({ score }) => score));
  const exp = ranked.map(({ label, score }) => ({ label, score: Math.exp(score - max) }));
  const total = exp.reduce((sum, item) => sum + item.score, 0) || 1;
  const probabilities = exp.map((item) => ({ label: item.label, score: item.score / total }));
  const scoreByLabel = Object.fromEntries(probabilities.map(({ label, score }) => [label, score]));
  const best = probabilities[0];
  const second = probabilities[1] || { score: 0 };
  return {
    gesture: best?.score >= 0.5 ? best.label : 'UNKNOWN',
    confidence: best?.score || 0,
    margin: (best?.score || 0) - second.score,
    scores: scoreByLabel,
  };
}
