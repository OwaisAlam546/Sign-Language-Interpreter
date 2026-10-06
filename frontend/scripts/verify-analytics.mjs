import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ANALYTICS_DATA } from '../src/lib/analyticsData.js';

console.log('Testing Analytics Data Architecture...');

// 1. Metrics Integrity: strictly null / unmeasured
assert.equal(ANALYTICS_DATA.metrics.accuracy.value, null);
assert.equal(ANALYTICS_DATA.metrics.precision.value, null);
assert.equal(ANALYTICS_DATA.metrics.recall.value, null);
assert.equal(ANALYTICS_DATA.metrics.f1.value, null);
assert.equal(ANALYTICS_DATA.metrics.latency.value, null);
assert.equal(ANALYTICS_DATA.status.badge, 'Awaiting Verified Evaluation');

// 2. Dataset verified stats
assert.equal(ANALYTICS_DATA.dataset.totalSamples, 11742);
assert.equal(ANALYTICS_DATA.dataset.classesCount, 26);
assert.equal(ANALYTICS_DATA.dataset.trainSamples, null);
assert.equal(ANALYTICS_DATA.dataset.valSamples, null);
assert.equal(ANALYTICS_DATA.dataset.testSamples, null);
assert.equal(Object.keys(ANALYTICS_DATA.dataset.samplesPerClass).length, 26);
assert.equal(ANALYTICS_DATA.dataset.samplesPerClass.A, 455);
assert.equal(ANALYTICS_DATA.dataset.samplesPerClass.S, 500);

// 3. Class-wise A-Z performance
assert.equal(ANALYTICS_DATA.classPerformance.length, 26);
assert.equal(ANALYTICS_DATA.classPerformance[0].label, 'A');
assert.equal(ANALYTICS_DATA.classPerformance[25].label, 'Z');
assert.equal(ANALYTICS_DATA.classPerformance.every((c) => c.accuracy === null), true);

// 4. Confusion matrix
assert.equal(ANALYTICS_DATA.confusionMatrix.labels.length, 26);
assert.equal(ANALYTICS_DATA.confusionMatrix.data, null);

// 5. Training history
assert.equal(ANALYTICS_DATA.trainingHistory.epochs, null);
assert.equal(ANALYTICS_DATA.trainingHistory.trainAccuracy, null);
assert.equal(ANALYTICS_DATA.trainingHistory.statusMessage, 'Training history not available');

// 6. Stability and Errors
assert.equal(ANALYTICS_DATA.stability.recordedSequence, null);
assert.equal(ANALYTICS_DATA.errors.mostChallengingClasses, null);
assert.equal(ANALYTICS_DATA.errors.commonConfusions, null);

// 7. Global Sign Language Landscape
assert.equal(ANALYTICS_DATA.landscape.primaryHub.name, 'Bengaluru, India');
assert.equal(ANALYTICS_DATA.landscape.languages.length >= 8, true);

// 8. Navigation & Integration verification
const modelSrc = await readFile(new URL('../src/sections/Model.jsx', import.meta.url), 'utf8');
assert.match(modelSrc, /View Detailed Analysis/);
assert.match(modelSrc, /\/analytics/);

const routerSrc = await readFile(new URL('../src/context/RouterContext.jsx', import.meta.url), 'utf8');
assert.match(routerSrc, /\/analytics/);

const appSrc = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(appSrc, /AnalyticsPage/);
assert.match(appSrc, /isAnalyticsPage/);

const navSrc = await readFile(new URL('../src/components/Navbar.jsx', import.meta.url), 'utf8');
assert.match(navSrc, /to:\s*'\/analytics'/);

const footerSrc = await readFile(new URL('../src/sections/Footer.jsx', import.meta.url), 'utf8');
assert.match(footerSrc, /'analytics'/);

console.log('✓ All Analytics tests and integrity checks PASSED successfully!');
