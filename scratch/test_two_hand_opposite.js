// scratch/test_two_hand_opposite.js
const clonePts = (pts) => pts.map(([x, y]) => [x, y]);
const translatePts = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
const rotatePts = (pts, rad, cx = 0.5, cy = 0.5) => {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return pts.map(([x, y]) => [
    cx + (x - cx) * cos - (y - cy) * sin,
    cy + (x - cx) * sin + (y - cy) * cos,
  ]);
};
const scalePts = (pts, s, cx = 0.5, cy = 0.5) => {
  return pts.map(([x, y]) => [
    cx + (x - cx) * s,
    cy + (y - cy) * s,
  ]);
};

// Import ASL_LANDMARKS from HandSkeleton.jsx
import { ASL_LANDMARKS } from '../frontend/src/components/HandSkeleton.jsx';

const LETTER_21 = {};
Object.keys(ASL_LANDMARKS).forEach((k) => {
  LETTER_21[k] = ASL_LANDMARKS[k].slice(0, 21);
});

function evaluateTwoHand(key, elapsed) {
  if (key === 'LOVE') {
    const duration = 2500;
    const t = (elapsed % duration) / duration;
    let inward = 0;
    let crossAction = 0;

    if (t < 0.10) {
      inward = 0;
      crossAction = 0;
    } else if (t < 0.32) {
      const p = (t - 0.10) / 0.22;
      inward = 0.5 - 0.5 * Math.cos(p * Math.PI);
      crossAction = inward * 0.3;
    } else if (t < 0.78) {
      inward = 1.0;
      const p = (t - 0.32) / 0.46;
      crossAction = 0.3 + 0.7 * (0.5 - 0.5 * Math.cos(Math.min(1, p * 1.5) * Math.PI));
      const squeeze = Math.sin(p * Math.PI * 2) * 0.03;
      crossAction += squeeze;
    } else {
      const p = (t - 0.78) / 0.22;
      const ease = 0.5 + 0.5 * Math.cos(p * Math.PI);
      inward = ease;
      crossAction = ease;
    }

    const startX = 0.22;
    const base1 = scalePts(clonePts(LETTER_21.S), 0.84);
    const base2 = scalePts(clonePts(LETTER_21.S), 0.84);
    const mirrored2 = base2.map(([x, y]) => [1.0 - x, y]);

    const h1Dx = (1 - inward) * startX - inward * (crossAction * 0.10);
    const h1Dy = (1 - inward) * 0.04 - inward * (0.04 + crossAction * 0.04);
    const h1Rot = (1 - inward) * (-0.10) + inward * (crossAction * 0.38);
    const hand1 = rotatePts(translatePts(base1, h1Dx, h1Dy), h1Rot, 0.5, 0.7);

    const h2Dx = (1 - inward) * (-startX) + inward * (crossAction * 0.10);
    const h2Dy = (1 - inward) * 0.04 - inward * (0.04 + crossAction * 0.04);
    const h2Rot = (1 - inward) * (0.10) - inward * (crossAction * 0.38);
    const hand2 = rotatePts(translatePts(mirrored2, h2Dx, h2Dy), h2Rot, 0.5, 0.7);

    return { hand1, hand2 };
  }

  if (key === 'HELP') {
    const duration = 2500;
    const t = (elapsed % duration) / duration;
    let inward = 0;
    let liftY = 0;

    if (t < 0.10) {
      inward = 0;
      liftY = 0;
    } else if (t < 0.32) {
      const p = (t - 0.10) / 0.22;
      inward = 0.5 - 0.5 * Math.cos(p * Math.PI);
      liftY = 0;
    } else if (t < 0.76) {
      inward = 1.0;
      const p = (t - 0.32) / 0.44;
      if (p < 0.60) {
        const ease = 0.5 - 0.5 * Math.cos((p / 0.60) * Math.PI);
        liftY = -ease * 0.16;
      } else {
        liftY = -0.16;
      }
    } else {
      const p = (t - 0.76) / 0.24;
      const ease = 0.5 + 0.5 * Math.cos(p * Math.PI);
      inward = ease;
      liftY = -ease * 0.16;
    }

    const startX = 0.23;
    const base1 = scalePts(clonePts(LETTER_21.A), 0.84);
    const base2 = scalePts(clonePts(LETTER_21.B), 0.84);
    const mirrored2 = base2.map(([x, y]) => [1.0 - x, y]);

    const h1Dx = (1 - inward) * startX;
    const h1Dy = (1 - inward) * (-0.02) + inward * (liftY - 0.04);
    const hand1 = translatePts(base1, h1Dx, h1Dy);

    const h2Dx = (1 - inward) * (-startX);
    const h2Dy = (1 - inward) * 0.06 + inward * (liftY + 0.10);
    const h2Rot = 0.28 * inward + (1 - inward) * 0.08;
    const hand2 = rotatePts(translatePts(mirrored2, h2Dx, h2Dy), h2Rot, 0.5, 0.7);

    return { hand1, hand2 };
  }

  if (key === 'FRIEND') {
    const duration = 2600;
    const t = (elapsed % duration) / duration;
    let inward = 0;
    let claspX = 0, claspY = 0;

    if (t < 0.10) {
      inward = 0;
      claspX = 0; claspY = -0.02;
    } else if (t < 0.30) {
      const p = (t - 0.10) / 0.20;
      inward = 0.5 - 0.5 * Math.cos(p * Math.PI);
      claspX = 0; claspY = -0.02;
    } else if (t < 0.76) {
      inward = 1.0;
      const p = (t - 0.30) / 0.46;
      if (p < 0.35) {
        claspX = 0; claspY = -0.02;
      } else if (p < 0.65) {
        const pivotP = (p - 0.35) / 0.30;
        claspX = Math.sin(pivotP * Math.PI) * 0.06;
        claspY = -0.02 + pivotP * 0.04;
      } else {
        claspX = 0; claspY = 0.02;
      }
    } else {
      const p = (t - 0.76) / 0.24;
      const ease = 0.5 + 0.5 * Math.cos(p * Math.PI);
      inward = ease;
      claspX = 0;
      claspY = ease * 0.02 + (1 - ease) * (-0.02);
    }

    const startX = 0.23;
    const base1 = scalePts(clonePts(LETTER_21.X), 0.84);
    const base2 = scalePts(clonePts(LETTER_21.X), 0.84);
    const mirrored2 = base2.map(([x, y]) => [1.0 - x, y]);

    const h1Dx = (1 - inward) * startX + inward * (0.07 - claspX);
    const h1Dy = inward * (-0.02 + claspY);
    const hand1 = translatePts(base1, h1Dx, h1Dy);

    const h2Dx = (1 - inward) * (-startX) + inward * (-0.07 + claspX);
    const h2Dy = inward * (-0.02 - claspY);
    const hand2 = translatePts(mirrored2, h2Dx, h2Dy);

    return { hand1, hand2 };
  }

  if (key === 'MORE') {
    const duration = 2400;
    const t = (elapsed % duration) / duration;
    let inward = 0;
    let tapDist = 0.05;

    if (t < 0.10) {
      inward = 0;
      tapDist = 0.05;
    } else if (t < 0.30) {
      const p = (t - 0.10) / 0.20;
      inward = 0.5 - 0.5 * Math.cos(p * Math.PI);
      tapDist = 0.05;
    } else if (t < 0.78) {
      inward = 1.0;
      const p = (t - 0.30) / 0.48;
      if (p < 0.38) {
        const tapP = p / 0.38;
        tapDist = (1 - Math.sin(tapP * Math.PI)) * 0.05;
      } else if (p < 0.48) {
        tapDist = 0.05;
      } else if (p < 0.86) {
        const tapP = (p - 0.48) / 0.38;
        tapDist = (1 - Math.sin(tapP * Math.PI)) * 0.05;
      } else {
        tapDist = 0.05;
      }
    } else {
      const p = (t - 0.78) / 0.22;
      const ease = 0.5 + 0.5 * Math.cos(p * Math.PI);
      inward = ease;
      tapDist = 0.05;
    }

    const startX = 0.24;
    const base1 = scalePts(clonePts(LETTER_21.O), 0.84);
    const base2 = scalePts(clonePts(LETTER_21.O), 0.84);
    const mirrored2 = base2.map(([x, y]) => [1.0 - x, y]);

    const h1Dx = (1 - inward) * startX + inward * (0.06 - tapDist);
    const h1Rot = (1 - inward) * (-0.08) + inward * (-0.22);
    const hand1 = rotatePts(translatePts(base1, h1Dx, -0.04), h1Rot, 0.5, 0.7);

    const h2Dx = (1 - inward) * (-startX) + inward * (-0.06 + tapDist);
    const h2Rot = (1 - inward) * (0.08) + inward * (0.22);
    const hand2 = rotatePts(translatePts(mirrored2, h2Dx, -0.04), h2Rot, 0.5, 0.7);

    return { hand1, hand2 };
  }
}

const words = ['LOVE', 'HELP', 'FRIEND', 'MORE'];
console.log('Testing Two-Hand Signs with Opposite-Side Start Requirement...');

words.forEach((w) => {
  console.log(`\nEvaluating: ${w}`);
  const start = evaluateTwoHand(w, 0);

  // Check landmark counts
  if (start.hand1.length !== 21 || start.hand2.length !== 21) {
    throw new Error(`${w}: Hand landmark count is not 21!`);
  }

  // Calculate bounding boxes at t = 0
  const h1Xs = start.hand1.map((p) => p[0]);
  const h2Xs = start.hand2.map((p) => p[0]);
  const h1Center = (Math.min(...h1Xs) + Math.max(...h1Xs)) / 2;
  const h2Center = (Math.min(...h2Xs) + Math.max(...h2Xs)) / 2;

  console.log(`  t = 0 (Starting State):`);
  console.log(`    Left Hand (Hand 2) Center X: ${h2Center.toFixed(3)}, Bounds: [${Math.min(...h2Xs).toFixed(3)}, ${Math.max(...h2Xs).toFixed(3)}]`);
  console.log(`    Right Hand (Hand 1) Center X: ${h1Center.toFixed(3)}, Bounds: [${Math.min(...h1Xs).toFixed(3)}, ${Math.max(...h1Xs).toFixed(3)}]`);

  if (h2Center >= 0.35) throw new Error(`${w}: Left hand is not on left side! Center: ${h2Center}`);
  if (h1Center <= 0.65) throw new Error(`${w}: Right hand is not on right side! Center: ${h1Center}`);

  const separation = h1Center - h2Center;
  console.log(`    Separation: ${separation.toFixed(3)} (Clearly separated near opposite edges)`);

  // Test full loop trajectory
  const duration = w === 'FRIEND' ? 2600 : w === 'MORE' ? 2400 : 2500;
  for (let t = 0; t <= duration * 2; t += 50) {
    const res = evaluateTwoHand(w, t);
    for (let i = 0; i < 21; i++) {
      if (isNaN(res.hand1[i][0]) || isNaN(res.hand1[i][1]) || isNaN(res.hand2[i][0]) || isNaN(res.hand2[i][1])) {
        throw new Error(`${w} at t=${t}: NaN encountered!`);
      }
      // Check viewBox bounds: [0, 1] with margin
      if (res.hand1[i][0] < 0 || res.hand1[i][0] > 1.05 || res.hand2[i][0] < -0.05 || res.hand2[i][0] > 1.0) {
        throw new Error(`${w} at t=${t}: Out of bounds! Pt ${i}: ${res.hand1[i]}, ${res.hand2[i]}`);
      }
    }
  }

  // Test loop match: t = duration vs t = 0
  const end = evaluateTwoHand(w, duration);
  for (let i = 0; i < 21; i++) {
    const d1 = Math.hypot(end.hand1[i][0] - start.hand1[i][0], end.hand1[i][1] - start.hand1[i][1]);
    const d2 = Math.hypot(end.hand2[i][0] - start.hand2[i][0], end.hand2[i][1] - start.hand2[i][1]);
    if (d1 > 0.001 || d2 > 0.001) {
      throw new Error(`${w}: Cycle does not loop perfectly to starting state! d1=${d1}, d2=${d2}`);
    }
  }
  console.log(`  ✓ Perfect reset to opposite-side start: loop delta < 0.001`);
  console.log(`  ✓ All coordinates inside viewport throughout cycle`);
});

console.log('\nALL TWO-HAND OPPOSITE-SIDE START CHECKS PASSED!');
