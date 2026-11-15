import { readFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-web/wasm';

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

const buf = await readFile(new URL('../public/models/wlasl100_gru_25class.onnx', import.meta.url));
const labels = JSON.parse(await readFile(new URL('../public/models/wlasl100_gru_labels.json', import.meta.url), 'utf8'));
const session = await ort.InferenceSession.create(buf);

const evalVec = async (vec, title) => {
  const res = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', vec, [1, 16, 147]) });
  const data = Array.from(res[session.outputNames[0]].data);
  const indexed = data.map((s, i) => ({ label: labels[i], s })).sort((a,b) => b.s - a.s);
  console.log(title);
  indexed.slice(0, 5).forEach(x => console.log(' ', x.label, (x.s*100).toFixed(2) + '%'));
};

// 1. Zeros
await evalVec(new Float32Array(16*147), 'ALL ZEROS:');

// 2. Static hand
const staticRight = new Float32Array(16 * 147);
for (let f=0; f<16; f++) {
  for (let k=63; k<126; k++) staticRight[f*147 + k] = 0.1;
  staticRight[f*147 + 127] = 1.0;
}
await evalVec(staticRight, '\nSTATIC RIGHT HAND:');

// 3. Static both hands
const staticBoth = new Float32Array(16 * 147);
for (let f=0; f<16; f++) {
  for (let k=0; k<63; k++) staticBoth[f*147 + k] = -0.2;
  for (let k=63; k<126; k++) staticBoth[f*147 + k] = 0.2;
  staticBoth[f*147 + 126] = 1.0;
  staticBoth[f*147 + 127] = 1.0;
}
await evalVec(staticBoth, '\nSTATIC BOTH HANDS:');

// 6. Inspect sample 12321 features
console.log('\nINSPECTING SAMPLE 12321 (COMPUTER):');
const testSamples = JSON.parse(await readFile(new URL('../public/models/test_word_samples.json', import.meta.url), 'utf8'));
const compSample = testSamples.find(s => s.video_id === '12321');
if (compSample) {
  for (let f = 0; f < 16; f++) {
    const frameVec = compSample.features[f];
    const leftPres = frameVec[126];
    const rightPres = frameVec[127];
    const posePres = frameVec[146];
    console.log(`  Frame ${f}: L_pres=${leftPres}, R_pres=${rightPres}, Pose_pres=${posePres}, L_wrist_x=${frameVec[0].toFixed(3)}, R_wrist_x=${frameVec[63].toFixed(3)}`);
  }
}
