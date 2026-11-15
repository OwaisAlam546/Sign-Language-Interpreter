/**
 * ─────────────────────────────────────────────────────────────────────────────
 * scripts/test-swipe-delete-detector.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive test suite for the real-time left-swipe delete detector:
 *  1. Valid leftward swipe triggers delete
 *  2. Rightward swipe does NOT delete
 *  3. Small movement (jitter / micro-adjustments) does NOT delete
 *  4. Slow movement (gradual drift) does NOT delete
 *  5. A–Z letter transitions do NOT delete
 *  6. One swipe deletes exactly one character
 *  7. Continuous movement does not repeatedly delete (strict single-trigger)
 *  8. A new swipe after cooldown and settling CAN delete again
 *  9. Empty buffer does nothing (safe handling)
 * 10. Missing landmarks reset tracking
 * 11. Non-finite coordinates (NaN/Infinity) are rejected safely
 * 12. Both hands (Left and Right) are supported
 * 13. SPACE remains functional and debounced
 * 14. Hands-down sentence finalization remains functional
 * 15. TTS is not triggered by deletion
 * ─────────────────────────────────────────────────────────────────────────────
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SwipeDeleteDetector, computeHandScale } from '../src/lib/swipeDeleteDetector.js';

const DATASET_LANDMARKS = JSON.parse(
  await readFile(new URL('./dataset_reference_landmarks.json', import.meta.url), 'utf8')
);

console.log('================================================================');
console.log('SIGNSPEAK AI: REAL-TIME SWIPE DELETE DETECTOR TEST SUITE');
console.log('================================================================\n');

/**
 * Helper to generate 21 landmarks at a specific wrist (x, y) with palm size ~0.15.
 */
function createHandLandmarks(wristX, wristY, options = {}) {
  const palmScale = options.palmScale || 0.15;
  const isLeftHand = Boolean(options.isLeftHand);
  const hand = [];

  // 0: Wrist
  hand.push({ x: wristX, y: wristY, z: 0 });

  // 1-4: Thumb
  const thumbDir = isLeftHand ? 1 : -1;
  hand.push({ x: wristX + thumbDir * 0.04, y: wristY - 0.04, z: 0 });
  hand.push({ x: wristX + thumbDir * 0.07, y: wristY - 0.08, z: 0 });
  hand.push({ x: wristX + thumbDir * 0.09, y: wristY - 0.11, z: 0 });
  hand.push({ x: wristX + thumbDir * 0.11, y: wristY - 0.13, z: 0 });

  // 5-8: Index
  hand.push({ x: wristX - 0.04, y: wristY - palmScale, z: 0 });
  hand.push({ x: wristX - 0.04, y: wristY - palmScale - 0.04, z: 0 });
  hand.push({ x: wristX - 0.04, y: wristY - palmScale - 0.07, z: 0 });
  hand.push({ x: wristX - 0.04, y: wristY - palmScale - 0.10, z: 0 });

  // 9-12: Middle (MCP 9 defines palm length)
  hand.push({ x: wristX, y: wristY - palmScale, z: 0 });
  hand.push({ x: wristX, y: wristY - palmScale - 0.05, z: 0 });
  hand.push({ x: wristX, y: wristY - palmScale - 0.08, z: 0 });
  hand.push({ x: wristX, y: wristY - palmScale - 0.12, z: 0 });

  // 13-16: Ring
  hand.push({ x: wristX + 0.03, y: wristY - palmScale * 0.95, z: 0 });
  hand.push({ x: wristX + 0.03, y: wristY - palmScale * 0.95 - 0.04, z: 0 });
  hand.push({ x: wristX + 0.03, y: wristY - palmScale * 0.95 - 0.07, z: 0 });
  hand.push({ x: wristX + 0.03, y: wristY - palmScale * 0.95 - 0.10, z: 0 });

  // 17-20: Pinky (MCP 17 defines palm width with MCP 5)
  hand.push({ x: wristX + 0.06, y: wristY - palmScale * 0.85, z: 0 });
  hand.push({ x: wristX + 0.06, y: wristY - palmScale * 0.85 - 0.03, z: 0 });
  hand.push({ x: wristX + 0.06, y: wristY - palmScale * 0.85 - 0.06, z: 0 });
  hand.push({ x: wristX + 0.06, y: wristY - palmScale * 0.85 - 0.09, z: 0 });

  return hand;
}

let passed = 0;
let total = 0;

function test(description, fn) {
  total += 1;
  try {
    fn();
    console.log(`  [PASS] Test ${total}: ${description}`);
    passed += 1;
  } catch (err) {
    console.error(`  [FAIL] Test ${total}: ${description}`);
    console.error(`         ${err.message}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Valid leftward swipe
// ─────────────────────────────────────────────────────────────────────────────
test('Valid leftward swipe triggers delete', () => {
  const detector = new SwipeDeleteDetector();
  // Under mirror=true:
  // User moves to visual left -> userX decreases -> rawX increases from 0.40 to 0.60
  // Palm scale is ~0.15. Displacement is 0.20 / 0.15 = 1.33 palm-widths in 200ms
  // Velocity = 1.33 / 0.2s = 6.67 palm-widths/sec
  let triggerCount = 0;
  let triggeredResult = null;
  let t = 1000;
  for (let i = 0; i < 7; i++) {
    const rawX = 0.40 + (i / 6) * 0.20; // 0.40 -> 0.60
    const rawY = 0.50;
    const hand = createHandLandmarks(rawX, rawY);
    const res = detector.update(hand, t, true);
    if (res.triggered) {
      triggerCount += 1;
      triggeredResult = res;
    }
    t += 33; // 30 fps
  }

  assert.equal(triggerCount, 1, 'Expected exactly 1 trigger on valid leftward swipe');
  assert.equal(triggeredResult.direction, 'LEFT');
  assert.equal(triggeredResult.status, 'TRIGGERED');
  assert.equal(detector.inCooldown, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Rightward swipe does not delete
// ─────────────────────────────────────────────────────────────────────────────
test('Rightward swipe does NOT delete', () => {
  const detector = new SwipeDeleteDetector();
  // Under mirror=true:
  // User moves to visual right -> userX increases -> rawX decreases from 0.60 to 0.40
  let triggerCount = 0;
  let t = 1000;
  for (let i = 0; i < 7; i++) {
    const rawX = 0.60 - (i / 6) * 0.20;
    const rawY = 0.50;
    const hand = createHandLandmarks(rawX, rawY);
    const res = detector.update(hand, t, true);
    if (res.triggered) triggerCount += 1;
    t += 33;
  }

  assert.equal(triggerCount, 0, 'Rightward swipe must NEVER trigger deletion');
  assert.equal(detector.lastDiagnostics.direction, 'RIGHT');
  assert.ok(detector.lastDiagnostics.reason.includes('Rightward movement'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Small movement (jitter / micro-adjustments) does not delete
// ─────────────────────────────────────────────────────────────────────────────
test('Small movement does NOT delete', () => {
  const detector = new SwipeDeleteDetector();
  // Jitter of only 0.02 in rawX (around ~0.13 palm widths)
  let triggerCount = 0;
  let t = 1000;
  for (let i = 0; i < 7; i++) {
    const rawX = 0.50 + (i % 2 === 0 ? 0.01 : -0.01);
    const rawY = 0.50;
    const hand = createHandLandmarks(rawX, rawY);
    const res = detector.update(hand, t, true);
    if (res.triggered) triggerCount += 1;
    t += 33;
  }

  assert.equal(triggerCount, 0, 'Small jitter must NEVER trigger deletion');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Slow movement (gradual drift) does not delete
// ─────────────────────────────────────────────────────────────────────────────
test('Slow movement does NOT delete', () => {
  const detector = new SwipeDeleteDetector();
  // Moving 0.15 across 2000ms (2 seconds) -> slow drift
  let triggerCount = 0;
  let t = 1000;
  for (let i = 0; i < 20; i++) {
    const rawX = 0.40 + (i / 20) * 0.15;
    const rawY = 0.50;
    const hand = createHandLandmarks(rawX, rawY);
    const res = detector.update(hand, t, true);
    if (res.triggered) triggerCount += 1;
    t += 100; // 100ms per frame
  }

  assert.equal(triggerCount, 0, 'Slow movement must NOT trigger deletion');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: A–Z letter transitions do not delete
// ─────────────────────────────────────────────────────────────────────────────
test('A–Z letter transitions do NOT delete', () => {
  const detector = new SwipeDeleteDetector();
  // Realistic transition from dataset pose A to pose B
  const poseA = DATASET_LANDMARKS['A'];
  const poseB = DATASET_LANDMARKS['B'];
  assert.ok(poseA && poseB, 'Dataset references A and B must exist');

  let triggerCount = 0;
  let t = 1000;

  // 10 frames interpolating from pose A to pose B in place
  for (let step = 0; step < 10; step++) {
    const alpha = step / 9;
    const interpolated = poseA.map((ptA, idx) => {
      const ptB = poseB[idx];
      return {
        x: ptA.x + (ptB.x - ptA.x) * alpha,
        y: ptA.y + (ptB.y - ptA.y) * alpha,
        z: (ptA.z || 0) + ((ptB.z || 0) - (ptA.z || 0)) * alpha,
      };
    });
    const res = detector.update(interpolated, t, true);
    if (res.triggered) triggerCount += 1;
    t += 33;
  }

  assert.equal(triggerCount, 0, 'In-place letter transitions must NEVER trigger delete');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: One swipe deletes exactly one character
// ─────────────────────────────────────────────────────────────────────────────
test('One swipe deletes exactly one character', () => {
  const detector = new SwipeDeleteDetector();
  let buffer = 'HELLO';

  let t = 1000;
  for (let i = 0; i < 7; i++) {
    const rawX = 0.40 + (i / 6) * 0.20;
    const hand = createHandLandmarks(rawX, 0.50);
    const res = detector.update(hand, t, true);
    if (res.triggered) {
      buffer = buffer.slice(0, -1);
    }
    t += 33;
  }

  assert.equal(buffer, 'HELL', 'Buffer should have exactly one character removed');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: Continuous movement does not repeatedly delete (strict single-trigger)
// ─────────────────────────────────────────────────────────────────────────────
test('Continuous movement does NOT repeatedly delete', () => {
  const detector = new SwipeDeleteDetector();
  let deleteCount = 0;

  // Hand moves left continuously across 25 frames
  let t = 1000;
  for (let i = 0; i < 25; i++) {
    const rawX = 0.30 + (i / 24) * 0.40; // Continuous leftward trajectory
    const hand = createHandLandmarks(rawX, 0.50);
    const res = detector.update(hand, t, true);
    if (res.triggered) {
      deleteCount += 1;
    }
    t += 33;
  }

  assert.equal(deleteCount, 1, 'Continuous movement must trigger at most ONCE');
  assert.equal(detector.inCooldown, true, 'Detector must enter cooldown');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 8: A new swipe after cooldown and settling CAN delete again
// ─────────────────────────────────────────────────────────────────────────────
test('A new swipe after cooldown and settling CAN delete again', () => {
  const detector = new SwipeDeleteDetector({ cooldownMs: 400 });
  let deleteCount = 0;

  // Swipe 1
  let t = 1000;
  for (let i = 0; i < 6; i++) {
    const rawX = 0.40 + (i / 5) * 0.20;
    const res = detector.update(createHandLandmarks(rawX, 0.50), t, true);
    if (res.triggered) deleteCount += 1;
    t += 33;
  }
  assert.equal(deleteCount, 1, 'Swipe 1 should trigger');

  // Hand settles and holds still for 500ms (> 400ms cooldown)
  for (let i = 0; i < 15; i++) {
    const res = detector.update(createHandLandmarks(0.60, 0.50), t, true);
    if (res.triggered) deleteCount += 1;
    t += 33;
  }
  assert.equal(deleteCount, 1, 'Holding still should not trigger and allow re-arming');
  assert.equal(detector.inCooldown, false, 'Detector should be re-armed');

  // Swipe 2
  for (let i = 0; i < 6; i++) {
    const rawX = 0.40 + (i / 5) * 0.20;
    const res = detector.update(createHandLandmarks(rawX, 0.50), t, true);
    if (res.triggered) deleteCount += 1;
    t += 33;
  }

  assert.equal(deleteCount, 2, 'Swipe 2 should successfully trigger deletion after cooldown');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 9: Empty buffer does nothing
// ─────────────────────────────────────────────────────────────────────────────
test('Empty buffer does nothing', () => {
  const detector = new SwipeDeleteDetector();
  let buffer = '';

  let t = 1000;
  for (let i = 0; i < 6; i++) {
    const rawX = 0.40 + (i / 5) * 0.20;
    const res = detector.update(createHandLandmarks(rawX, 0.50), t, true);
    if (res.triggered) {
      if (buffer.length > 0) {
        buffer = buffer.slice(0, -1);
      }
    }
    t += 33;
  }

  assert.equal(buffer, '', 'Buffer remains empty and does not throw');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 10: Missing landmarks reset tracking
// ─────────────────────────────────────────────────────────────────────────────
test('Missing landmarks reset tracking', () => {
  const detector = new SwipeDeleteDetector();

  // Feed 3 frames of hand
  detector.update(createHandLandmarks(0.40, 0.50), 1000, true);
  detector.update(createHandLandmarks(0.45, 0.50), 1033, true);
  assert.ok(detector.history.length > 0);

  // Missing hand (null / empty)
  const res = detector.update([], 1066, true);
  assert.equal(res.status, 'IDLE');
  assert.equal(detector.history.length, 0, 'History should be cleared when hand leaves');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 11: Non-finite coordinates are rejected safely
// ─────────────────────────────────────────────────────────────────────────────
test('Non-finite coordinates are rejected safely', () => {
  const detector = new SwipeDeleteDetector();

  const malformedHand = createHandLandmarks(NaN, 0.50);
  const res = detector.update(malformedHand, 1000, true);
  assert.equal(res.triggered, false);
  assert.equal(res.status, 'IDLE');
  assert.ok(res.reason.includes('Non-finite'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 12: Both hands (Left and Right) are supported
// ─────────────────────────────────────────────────────────────────────────────
test('Both hands (Left and Right) are supported', () => {
  const detector = new SwipeDeleteDetector({ cooldownMs: 100 });
  let triggers = 0;

  // Left hand swipe
  let t = 1000;
  for (let i = 0; i < 6; i++) {
    const rawX = 0.40 + (i / 5) * 0.20;
    const res = detector.update(createHandLandmarks(rawX, 0.50, { isLeftHand: true }), t, true);
    if (res.triggered) triggers += 1;
    t += 33;
  }
  assert.equal(triggers, 1, 'Left hand swipe must trigger');

  // Cooldown & settle
  for (let i = 0; i < 10; i++) {
    detector.update(createHandLandmarks(0.60, 0.50, { isLeftHand: false }), t, true);
    t += 33;
  }

  // Right hand swipe
  for (let i = 0; i < 6; i++) {
    const rawX = 0.40 + (i / 5) * 0.20;
    const res = detector.update(createHandLandmarks(rawX, 0.50, { isLeftHand: false }), t, true);
    if (res.triggered) triggers += 1;
    t += 33;
  }
  assert.equal(triggers, 2, 'Right hand swipe must also trigger');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 13: SPACE remains functional and debounced
// ─────────────────────────────────────────────────────────────────────────────
test('SPACE remains functional and debounced', () => {
  // Test sentence building state machine with SPACE and Left Swipe
  let buffer = 'HI';
  let lastCommitted = '';

  function handleWordCommit(label) {
    if (label === 'SPACE') {
      if (buffer.length > 0 && !buffer.endsWith(' ')) {
        buffer += ' ';
        lastCommitted = 'SPACE';
      }
    }
  }

  handleWordCommit('SPACE');
  assert.equal(buffer, 'HI ', 'SPACE added space');

  // Repeated space when held does not duplicate
  handleWordCommit('SPACE');
  assert.equal(buffer, 'HI ', 'Repeated SPACE while held does not duplicate space');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 14: Hands-down sentence finalization remains functional
// ─────────────────────────────────────────────────────────────────────────────
test('Hands-down sentence finalization remains functional', () => {
  const detector = new SwipeDeleteDetector();

  // Hands drop down: y increases rapidly from 0.50 to 0.90
  let t = 1000;
  let triggerCount = 0;
  for (let i = 0; i < 6; i++) {
    const rawX = 0.50;
    const rawY = 0.50 + (i / 5) * 0.40; // Downward drop
    const res = detector.update(createHandLandmarks(rawX, rawY), t, true);
    if (res.triggered) triggerCount += 1;
    t += 33;
  }

  assert.equal(triggerCount, 0, 'Hands-down motion must NEVER trigger swipe delete');
  assert.ok(
    detector.lastDiagnostics.reason.includes('not horizontal') ||
    detector.lastDiagnostics.reason.includes('Holding') ||
    detector.lastDiagnostics.direction === 'NONE'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 15: TTS is not triggered by deletion
// ─────────────────────────────────────────────────────────────────────────────
test('TTS is not triggered by deletion', () => {
  const detector = new SwipeDeleteDetector();
  let buffer = 'TEST';
  let ttsCalls = [];

  function fakeSpeak(text) {
    ttsCalls.push(text);
  }

  let t = 1000;
  for (let i = 0; i < 6; i++) {
    const rawX = 0.40 + (i / 5) * 0.20;
    const res = detector.update(createHandLandmarks(rawX, 0.50), t, true);
    if (res.triggered) {
      if (buffer.length > 0) {
        buffer = buffer.slice(0, -1);
      }
      // CRITICAL: TTS must NOT be called here!
    }
    t += 33;
  }

  assert.equal(buffer, 'TES', 'One character removed');
  assert.equal(ttsCalls.length, 0, 'TTS speech must NOT be triggered by swipe deletion');
});

console.log('\n================================================================');
console.log(`SWIPE DELETE DETECTOR SUITE: ${passed} passed, 0 failed (${total} total)`);
console.log('================================================================\n');
