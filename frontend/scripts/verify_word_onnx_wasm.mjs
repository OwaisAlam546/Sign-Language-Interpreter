import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-web/wasm';

// Configure ONNX Runtime Web WASM for deterministic single-threaded execution
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

const MODEL_URL = new URL('../public/models/wlasl100_gru_25class.onnx', import.meta.url);
const LABELS_URL = new URL('../public/models/wlasl100_gru_labels.json', import.meta.url);
const SAMPLES_URL = new URL('../public/models/test_word_samples.json', import.meta.url);
const BENCHMARK_OUT = new URL('../public/models/wasm_benchmark_results.json', import.meta.url);

async function main() {
  console.log('='.repeat(80));
  console.log('SIGNSPEAK AI — PHASE 5: ONNX RUNTIME WEB (WASM) INFERENCE VERIFICATION');
  console.log('='.repeat(80));

  // 1. Load Model Buffer
  console.log('\n[1] Reading ONNX model binary and class labels...');
  const modelBuffer = await readFile(MODEL_URL);
  const labelsJson = await readFile(LABELS_URL, 'utf8');
  const classNames = JSON.parse(labelsJson);
  console.log(`  Model binary size: ${modelBuffer.length.toLocaleString()} bytes`);
  console.log(`  Total class labels: ${classNames.length}`);
  assert.equal(classNames.length, 25, 'Expected 25 class labels');

  // 2. Initialize ONNX Runtime Session (Measure Init Time)
  console.log('\n[2] Initializing ONNX Runtime Web WASM InferenceSession...');
  const initT0 = performance.now();
  const session = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
    executionMode: 'sequential',
  });
  const initDurationMs = performance.now() - initT0;
  console.log(`  Session initialized in: ${initDurationMs.toFixed(2)} ms`);
  console.log(`  Input names: ${session.inputNames}`);
  console.log(`  Output names: ${session.outputNames}`);
  assert.ok(session.inputNames.includes('sequence_input'), 'Missing sequence_input in ONNX model');

  // 3. Load Sample Test Vectors
  console.log('\n[3] Loading representative test sequences...');
  const samplesJson = await readFile(SAMPLES_URL, 'utf8');
  const samples = JSON.parse(samplesJson);
  console.log(`  Loaded ${samples.length} test samples from ${SAMPLES_URL.pathname}`);

  // 4. Run Inference on Test Samples
  console.log('\n[4] Running inference on sample test vectors...');
  const sampleResults = [];
  let correctTop1 = 0;
  let correctTop5 = 0;

  for (const s of samples) {
    const flatData = new Float32Array(s.features.flat()); // 16 * 147 = 2352
    assert.equal(flatData.length, 16 * 147);
    const tensor = new ort.Tensor('float32', flatData, [1, 16, 147]);

    const runT0 = performance.now();
    const outputMap = await session.run({ sequence_input: tensor });
    const latency = performance.now() - runT0;

    const outTensor = outputMap[session.outputNames[0]];
    const probs = Array.from(outTensor.data);

    // Compute Top-1
    let bestIdx = 0;
    let bestProb = probs[0];
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > bestProb) {
        bestProb = probs[i];
        bestIdx = i;
      }
    }

    // Compute Top-5
    const indexed = probs.map((p, i) => ({ idx: i, prob: p, gloss: classNames[i] }));
    indexed.sort((a, b) => b.prob - a.prob);
    const top5 = indexed.slice(0, 5);

    const isTop1Match = bestIdx === s.label_idx;
    const isTop5Match = top5.some((t) => t.idx === s.label_idx);
    if (isTop1Match) correctTop1++;
    if (isTop5Match) correctTop5++;

    sampleResults.push({
      video_id: s.video_id,
      true_gloss: s.gloss,
      pred_gloss: classNames[bestIdx],
      confidence: bestProb,
      is_top1: isTop1Match,
      is_top5: isTop5Match,
      latency_ms: latency,
      top5: top5.map((t) => ({ gloss: t.gloss, confidence: t.prob })),
    });

    console.log(
      `  Clip ${s.video_id} (${s.gloss}): Pred = ${classNames[bestIdx]} (${(bestProb * 100).toFixed(1)}%) | Top-5: [${top5.map((t) => t.gloss).join(', ')}] | Latency: ${latency.toFixed(2)} ms`
    );
  }

  // 5. Benchmark Latency (100 Iterations)
  console.log('\n[5] Running 100-iteration WASM latency benchmark...');
  const sampleFlat = new Float32Array(samples[0].features.flat());
  const benchmarkTensor = new ort.Tensor('float32', sampleFlat, [1, 16, 147]);
  const latencies = [];

  // Warmup 5 iterations
  for (let w = 0; w < 5; w++) {
    await session.run({ sequence_input: benchmarkTensor });
  }

  for (let i = 0; i < 100; i++) {
    const tStart = performance.now();
    await session.run({ sequence_input: benchmarkTensor });
    latencies.push(performance.now() - tStart);
  }

  latencies.sort((a, b) => a - b);
  const medianLatency = latencies[Math.floor(latencies.length / 2)];
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
  const meanLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const minLatency = latencies[0];
  const maxLatency = latencies[latencies.length - 1];

  console.log(`  Latency Benchmark Results (100 runs):`);
  console.log(`    Min:    ${minLatency.toFixed(2)} ms`);
  console.log(`    Mean:   ${meanLatency.toFixed(2)} ms`);
  console.log(`    Median: ${medianLatency.toFixed(2)} ms`);
  console.log(`    P95:    ${p95Latency.toFixed(2)} ms`);
  console.log(`    Max:    ${maxLatency.toFixed(2)} ms`);

  // 6. Test Error Handling on Invalid Shapes
  console.log('\n[6] Testing error handling on invalid input shapes...');
  let invalidShapeCaught = false;
  try {
    const invalidTensor = new ort.Tensor('float32', new Float32Array(10 * 147), [1, 10, 147]);
    await session.run({ sequence_input: invalidTensor });
  } catch (err) {
    invalidShapeCaught = true;
    console.log(`  Successfully caught invalid temporal shape [1, 10, 147]: ${err.message.slice(0, 70)}...`);
  }
  assert.ok(invalidShapeCaught, 'Failed to catch invalid temporal shape');

  let invalidFeatureDimCaught = false;
  try {
    const invalidDimTensor = new ort.Tensor('float32', new Float32Array(16 * 50), [1, 16, 50]);
    await session.run({ sequence_input: invalidDimTensor });
  } catch (err) {
    invalidFeatureDimCaught = true;
    console.log(`  Successfully caught invalid feature dimension [1, 16, 50]: ${err.message.slice(0, 70)}...`);
  }
  assert.ok(invalidFeatureDimCaught, 'Failed to catch invalid feature dimension');

  // 7. Save Benchmark Results
  const benchmarkReport = {
    timestamp: new Date().toISOString(),
    runtime_environment: 'Node.js WASM (onnxruntime-web/wasm v1.20.1)',
    model_name: 'wlasl100_gru_25class.onnx',
    model_size_bytes: modelBuffer.length,
    initialization_time_ms: initDurationMs,
    latency_metrics_ms: {
      runs: 100,
      min: minLatency,
      mean: meanLatency,
      median: medianLatency,
      p95: p95Latency,
      max: maxLatency,
    },
    error_handling_verified: true,
    sample_tests: sampleResults,
  };

  await writeFile(BENCHMARK_OUT, JSON.stringify(benchmarkReport, null, 2), 'utf8');
  console.log(`\n[7] Saved benchmark report to: ${BENCHMARK_OUT.pathname}`);
  console.log('\nWASM Inference Verification PASSED successfully!');
}

main().catch((err) => {
  console.error('\nVerification FAILED with error:', err);
  process.exit(1);
});
