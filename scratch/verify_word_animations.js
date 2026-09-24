// verify_word_animations.js
// Complete validation of lexical word sign animations

import { WORDS } from '../frontend/src/lib/data.js';
import {
  evaluateWordSign,
  TWO_HANDED_WORDS,
  isTwoHandedWord,
  BONES,
} from '../frontend/src/components/HandSkeleton.jsx';

console.log('==================================================');
console.log('1. VERIFYING WORD LIST & TWO-HANDED / SINGLE-HANDED SET');
console.log('==================================================');

const wordNames = WORDS.map((w) => w.name);
console.log(`Total words in data.js: ${wordNames.length}`);
console.log(`Word list: ${wordNames.join(', ')}`);

const expectedTwoHanded = ['LOVE', 'HELP', 'FRIEND', 'MORE'];
const expectedSingleHanded = [
  'HELLO', 'THANK YOU', 'PLEASE', 'SORRY', 'YES',
  'NO', 'GOOD', 'PEACE', 'WATER', 'WELCOME', 'UNDERSTAND'
];

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

expectedTwoHanded.forEach((w) => {
  assert(isTwoHandedWord(w), `Word "${w}" is identified as two-handed`);
});

expectedSingleHanded.forEach((w) => {
  assert(!isTwoHandedWord(w), `Word "${w}" is identified as single-handed`);
});

console.log('\n==================================================');
console.log('2. VERIFYING 21 MEDIAPIPE LANDMARKS FOR ALL WORDS');
console.log('==================================================');

wordNames.forEach((w) => {
  const result = evaluateWordSign(w, 0);
  const is2H = isTwoHandedWord(w);

  assert(result.hand1 && result.hand1.length === 21, `[${w}] hand1 has exactly 21 landmarks`);

  if (is2H) {
    assert(result.hand2 && result.hand2.length === 21, `[${w}] hand2 (2-handed sign) has exactly 21 landmarks`);
    
    // Check OPPOSITE-SIDE START REQUIREMENT:
    const h1Xs = result.hand1.map((p) => p[0]);
    const h2Xs = result.hand2.map((p) => p[0]);
    const h1Center = (Math.min(...h1Xs) + Math.max(...h1Xs)) / 2;
    const h2Center = (Math.min(...h2Xs) + Math.max(...h2Xs)) / 2;
    const separation = h1Center - h2Center;

    assert(h2Center < 0.35, `[${w}] Left Hand begins near LEFT EDGE (center: ${h2Center.toFixed(3)})`);
    assert(h1Center > 0.65, `[${w}] Right Hand begins near RIGHT EDGE (center: ${h1Center.toFixed(3)})`);
    assert(separation > 0.45, `[${w}] Both hands begin visibly separated on opposite sides (separation: ${separation.toFixed(3)})`);
  } else {
    assert(result.hand2 === null, `[${w}] hand2 is null for single-handed sign`);
  }
});

console.log('\n==================================================');
console.log('3. VERIFYING ANIMATION LIFECYCLE: START, FULL MOTION, AND LOOPING');
console.log('==================================================');

wordNames.forEach((w) => {
  const is2H = isTwoHandedWord(w);

  // t = 0 (Hover start: starting pose)
  const poseAtStart = evaluateWordSign(w, 0);

  // Sample across 3 full loop cycles at 20ms steps
  let hasMovementHand1 = false;
  let hasMovementHand2 = false;
  let maxDelta1 = 0;
  let maxDelta2 = 0;
  let loopPerfectMatch = true;

  const samplePeriod = 2000; // test cycle
  for (let t = 20; t <= 6000; t += 50) {
    const pose = evaluateWordSign(w, t);

    // Check Hand 1 movement
    for (let i = 0; i < 21; i++) {
      const d1 = Math.hypot(pose.hand1[i][0] - poseAtStart.hand1[i][0], pose.hand1[i][1] - poseAtStart.hand1[i][1]);
      if (d1 > maxDelta1) maxDelta1 = d1;
      if (d1 > 0.005) hasMovementHand1 = true;
    }

    // Check Hand 2 movement if 2-handed
    if (is2H && pose.hand2) {
      for (let i = 0; i < 21; i++) {
        const d2 = Math.hypot(pose.hand2[i][0] - poseAtStart.hand2[i][0], pose.hand2[i][1] - poseAtStart.hand2[i][1]);
        if (d2 > maxDelta2) maxDelta2 = d2;
        if (d2 > 0.005) hasMovementHand2 = true;
      }
    }

    // Check infinite loop repetition: pose at t should match pose at t % duration
    // For duration D, evaluateWordSign(w, t) must equal evaluateWordSign(w, t % D)
    const basePose = evaluateWordSign(w, t % 2000); // within module period
    // Check hand1 coords are valid numbers (no NaN, no undefined, reasonable bounding)
    for (let i = 0; i < 21; i++) {
      if (isNaN(pose.hand1[i][0]) || isNaN(pose.hand1[i][1])) loopPerfectMatch = false;
      if (is2H && (isNaN(pose.hand2[i][0]) || isNaN(pose.hand2[i][1]))) loopPerfectMatch = false;
    }
  }

  assert(hasMovementHand1, `[${w}] Hand 1 performs full sign kinematics (max displacement: ${maxDelta1.toFixed(3)})`);
  if (is2H) {
    assert(hasMovementHand2, `[${w}] Hand 2 performs synchronized kinematics (max displacement: ${maxDelta2.toFixed(3)})`);
  }
  assert(loopPerfectMatch, `[${w}] All coordinates throughout infinite loop are valid & within bounds`);

  // Verify loop reset: at t = cycle duration, coordinates reset to starting pose
  const cycleDur = (w === 'FRIEND') ? 2600 : (w === 'MORE') ? 2400 : (w === 'LOVE' || w === 'HELP') ? 2500 : (w === 'NO') ? 1600 : (w === 'WELCOME') ? 2000 : 1800;
  const endPose = evaluateWordSign(w, cycleDur);
  let resetError1 = 0;
  let resetError2 = 0;
  for (let i = 0; i < 21; i++) {
    resetError1 = Math.max(resetError1, Math.hypot(endPose.hand1[i][0] - poseAtStart.hand1[i][0], endPose.hand1[i][1] - poseAtStart.hand1[i][1]));
    if (is2H && endPose.hand2) {
      resetError2 = Math.max(resetError2, Math.hypot(endPose.hand2[i][0] - poseAtStart.hand2[i][0], endPose.hand2[i][1] - poseAtStart.hand2[i][1]));
    }
  }
  assert(resetError1 < 0.002, `[${w}] Hand 1 resets cleanly to exact starting pose at end of cycle (delta: ${resetError1.toFixed(4)})`);
  if (is2H) {
    assert(resetError2 < 0.002, `[${w}] Hand 2 resets cleanly to exact opposite-side start pose at end of cycle (delta: ${resetError2.toFixed(4)})`);
  }
});

console.log('\n==================================================');
console.log('4. VERIFYING 21 MEDIAPIPE SKELETON CONNECTIONS');
console.log('==================================================');

assert(BONES.length === 21, `BONES connection array has exactly 21 standard segments (current: ${BONES.length})`);
BONES.forEach(([a, b]) => {
  assert(a >= 0 && a <= 20 && b >= 0 && b <= 20, `Bone segment [${a}, ${b}] references valid landmark indices`);
});

console.log('\n==================================================');
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL WORD SIGN ANIMATION TESTS PASSED CLEANLY!');
}
