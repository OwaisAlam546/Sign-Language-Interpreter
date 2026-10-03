import { ASL_LANDMARKS } from '../components/HandSkeleton.jsx';

// ─────────────────────────────────────────────────────────────
// lib/handClassifier.js — High-Accuracy Spatial & Temporal ASL Engine
// Recognizes all 26 ASL Alphabet letters (A–Z, including dynamic J & Z)
// and all 15 ASL Lexical Words (both single-handed and two-handed).
// Uses scale-invariant, wrist-relative 3D feature geometry + temporal
// motion analysis across the 12-frame sliding window.
// ─────────────────────────────────────────────────────────────

const STRAIGHT = 46.0;
const CURVED_MIN = 42.0;
const CURVED_MAX = 125.0;
const THUMB_STRAIGHT = 38.0;

const pt = (p) => (Array.isArray(p) ? { x: p[0], y: p[1], z: p[2] ?? 0 } : { x: p.x, y: p.y, z: p.z ?? 0 });
const vec = (a, b) => {
  const pa = pt(a), pb = pt(b);
  return [pb.x - pa.x, pb.y - pa.y, pb.z - pa.z];
};
const vec2D = (a, b) => {
  const pa = pt(a), pb = pt(b);
  return [pb.x - pa.x, pb.y - pa.y];
};
const norm = (v) => Math.hypot(...v) || 1e-9;
const dist = (a, b) => norm(vec(a, b));
const dist2D = (a, b) => norm(vec2D(a, b));

function normalizePose(points) {
  const p = points.map(pt);
  const wrist = p[0];
  const base = { x: p[9].x - wrist.x, y: p[9].y - wrist.y };
  const scale = Math.max(Math.hypot(base.x, base.y), 0.04);
  const angle = Math.atan2(base.y, base.x) - Math.PI / 2;
  const c = Math.cos(-angle), s = Math.sin(-angle);
  return p.slice(0, 21).map((point) => {
    const x = (point.x - wrist.x) / scale;
    const y = (point.y - wrist.y) / scale;
    return [x * c - y * s, x * s + y * c];
  });
}

const TEMPLATE_POSES = Object.entries(ASL_LANDMARKS)
  .filter(([label, pose]) => /^[A-Z]$/.test(label) && Array.isArray(pose) && pose.length >= 21)
  .map(([label, pose]) => [label, normalizePose(pose)]);

export function classifyByTemplate(rawLms) {
  if (!rawLms || rawLms.length < 21 || !TEMPLATE_POSES.length) return { gesture: 'UNKNOWN', confidence: 0, margin: 0 };
  const input = normalizePose(rawLms);
  const scores = TEMPLATE_POSES.map(([label, template]) => {
    const error = template.reduce((sum, point, index) => sum + Math.hypot(point[0] - input[index][0], point[1] - input[index][1]), 0) / 21;
    return { label, error };
  }).sort((a, b) => a.error - b.error);
  const best = scores[0], second = scores[1] || { error: best.error + 1 };
  const confidence = Math.max(0, Math.min(0.99, 1 - best.error / 1.15));
  const margin = Math.max(0, Math.min(0.99, (second.error - best.error) / 0.8));
  return { gesture: confidence >= 0.55 && margin >= 0.08 ? best.label : 'UNKNOWN', confidence, margin };
}

// Bend (degrees) at joint b of the a→b→c chain (0° = straight, 180° = folded back).
function angleAt(a, b, c) {
  const u = vec(a, b);
  const v = vec(b, c);
  const cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (norm(u) * norm(v));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/**
 * classifyHand(rawLms) → { gesture, confidence, type }
 * Comprehensive 26-letter static & posture classifier with palm-scale normalization.
 */
export function classifyHand(rawLms) {
  if (!rawLms || rawLms.length < 21) return { gesture: 'UNKNOWN', confidence: 0.5, type: 'unknown' };
  const lms = rawLms.map(pt);

  // Scale reference: palm size (wrist 0 to middle MCP 9)
  const palm = Math.max(dist2D(lms[0], lms[9]), 0.04);
  const d = (i, j) => dist2D(lms[i], lms[j]) / palm;

  // PIP bend angles for [index, middle, ring, pinky]
  const fingers = [
    [5, 6, 8],
    [9, 10, 12],
    [13, 14, 16],
    [17, 18, 20],
  ];
  const pipAngles = fingers.map(([m, p, t]) => angleAt(lms[m], lms[p], lms[t]));

  // Finger extension check: straight PIP and tip farther from wrist than PIP
  const ext = [0, 1, 2, 3].map((f) => {
    const [, pipIdx, tipIdx] = fingers[f];
    return pipAngles[f] <= STRAIGHT && dist2D(lms[0], lms[tipIdx]) > dist2D(lms[0], lms[pipIdx]) * 0.92;
  });
  const [idxExt, midExt, ringExt, pinkyExt] = ext;
  const nExt = ext.filter(Boolean).length;

  // Thumb geometry
  const thumbIPAngle = angleAt(lms[2], lms[3], lms[4]);
  const thumbAbducted = d(4, 5) > 0.65 && d(4, 9) > 0.72;
  const thumbOut = thumbIPAngle <= THUMB_STRAIGHT && thumbAbducted;
  const thumbAcrossPalm = !thumbAbducted && d(4, 5) < 0.78;

  // Direction vectors (normalized) for index and middle fingers (MCP -> TIP)
  const idxVec = vec2D(lms[5], lms[8]);
  const idxLen = norm(idxVec);
  const idxDirX = Math.abs(idxVec[0]) / idxLen; // 1 = horizontal, 0 = vertical
  const idxDirY = idxVec[1] / idxLen;           // negative = pointing UP, positive = pointing DOWN

  const midVec = vec2D(lms[9], lms[12]);
  const midLen = norm(midVec);
  const midDirX = Math.abs(midVec[0]) / midLen;
  const midDirY = midVec[1] / midLen;

  // ── 1. DOWNWARD / HORIZONTAL ORIENTATION SIGNS (G, H, P, Q) ──
  // Q: Index and thumb extended & pointing straight downward (pipAngles[0] <= STRAIGHT)
  if (idxExt && !midExt && !ringExt && !pinkyExt && idxDirY > 0.55 && lms[8].y > lms[0].y) {
    return { gesture: 'Q', confidence: 0.94, type: 'letter' };
  }
  // P: Index and middle extended & pointing downward (both pipAngles[0] and [1] straight, tips below wrist)
  if (idxExt && midExt && !ringExt && !pinkyExt && (idxDirY > 0.45 || midDirY > 0.55) && lms[12].y > lms[0].y) {
    return { gesture: 'P', confidence: 0.93, type: 'letter' };
  }
  // G vs H: Horizontal pointing fingers (idxDirX > 0.68)
  if (idxExt && idxDirX > 0.68 && Math.abs(idxDirY) < 0.65 && !ringExt && !pinkyExt) {
    if (midExt && midDirX > 0.65) {
      return { gesture: 'H', confidence: 0.94, type: 'letter' };
    }
    if (!midExt) {
      return { gesture: 'G', confidence: 0.94, type: 'letter' };
    }
  }

  // ── 2. CIRCLE / PINCH SIGNS (F, O) ──
  const thumbIdxTouch = d(4, 8) < 0.32;
  if (thumbIdxTouch && midExt && ringExt && pinkyExt) {
    return { gesture: 'F', confidence: 0.96, type: 'letter' };
  }
  // O: All fingertips curved together meeting the thumb tip closely
  const allTipsMeetThumb = d(4, 8) < 0.28 && d(4, 12) < 0.35 && nExt === 0 && pipAngles[0] < 145;
  if (allTipsMeetThumb && lms[8].y < lms[5].y) {
    return { gesture: 'O', confidence: 0.95, type: 'letter' };
  }

  // ── 3. PINKY SIGNS (Y, I) ──
  if (pinkyExt && !idxExt && !midExt && !ringExt) {
    if (thumbOut || d(4, 5) > 0.68) {
      return { gesture: 'Y', confidence: 0.96, type: 'letter' };
    }
    return { gesture: 'I', confidence: 0.95, type: 'letter' };
  }

  // ── 4. FOUR & THREE FINGER SIGNS (B, W) ──
  if (idxExt && midExt && ringExt && pinkyExt && thumbAcrossPalm) {
    return { gesture: 'B', confidence: 0.97, type: 'letter' };
  }
  if (idxExt && midExt && ringExt && !pinkyExt) {
    return { gesture: 'W', confidence: 0.95, type: 'letter' };
  }

  // ── 5. TWO-FINGER UPRIGHT SIGNS (R, U, V, K) ──
  if (idxExt && midExt && !ringExt && !pinkyExt) {
    const tipSpread = d(8, 12);
    const pipSpread = d(6, 10);
    // R: Index and middle crossed (tips closer than PIPs or x-order swapped vs MCPs)
    const mcpOrder = Math.sign(lms[5].x - lms[9].x);
    const tipOrder = Math.sign(lms[8].x - lms[12].x);
    if ((mcpOrder !== 0 && tipOrder !== 0 && mcpOrder !== tipOrder) || tipSpread < pipSpread * 0.72) {
      return { gesture: 'R', confidence: 0.94, type: 'letter' };
    }
    // K: Thumb wedged up between index and middle (thumb tip high near middle PIP 10)
    if (tipSpread >= 0.28 && lms[4].y < lms[5].y && d(4, 10) < 0.48 && d(4, 6) < 0.52) {
      return { gesture: 'K', confidence: 0.93, type: 'letter' };
    }
    // U: Index and middle parallel and touching closely
    if (tipSpread < 0.31) {
      return { gesture: 'U', confidence: 0.95, type: 'letter' };
    }
    // V: Index and middle spread apart in V
    return { gesture: 'V', confidence: 0.96, type: 'letter' };
  }

  // ── 6. SINGLE INDEX FINGER SIGNS (L, D, X) ──
  if (idxExt && !midExt && !ringExt && !pinkyExt) {
    if (thumbOut && d(4, 5) > 0.65) {
      return { gesture: 'L', confidence: 0.96, type: 'letter' };
    }
    return { gesture: 'D', confidence: 0.95, type: 'letter' };
  }

  // ── 7. CURVED HAND SIGN (C) & HOOKED INDEX (X) ──
  if (nExt === 0) {
    // C: All four fingers moderately curved (40°..115°) with an open gap between thumb and index
    const allCurved =
      pipAngles.every((a) => a >= 40 && a <= 115) &&
      d(4, 8) >= 0.28 &&
      d(4, 8) < 1.35 &&
      lms[8].y < lms[5].y;
    if (allCurved) {
      return { gesture: 'C', confidence: 0.94, type: 'letter' };
    }

    // X: Index finger hooked (PIP bent 45°–140° and index tip/PIP raised well above middle/ring/pinky)
    const idxHooked =
      pipAngles[0] > 42 &&
      pipAngles[0] < 140 &&
      pipAngles[1] > 145 &&
      lms[8].y < lms[12].y - 0.30 * palm &&
      lms[6].y < lms[10].y - 0.12 * palm;
    if (idxHooked) {
      return { gesture: 'X', confidence: 0.93, type: 'letter' };
    }

    // ── 8. FIST CLUSTER DISAMBIGUATION (A, S, E, T, N, M) ──
    // Compare thumb tip (4) against knuckle X-coordinates along the MCP row (5 -> 9 -> 13 -> 17)
    const mcpVec = vec2D(lms[5], lms[17]);
    const mcpSpan = norm(mcpVec);
    const thumbRel = vec2D(lms[5], lms[4]);
    // Projection tProj along index MCP (0.0) -> middle MCP (0.33) -> ring MCP (0.66) -> pinky MCP (1.0)
    const tProj = (thumbRel[0] * mcpVec[0] + thumbRel[1] * mcpVec[1]) / (mcpSpan * mcpSpan || 1e-9);

    // E: Fingers curled with ring/pinky PIPs less tightly folded (< 162°), fingertips resting right on thumb
    const isECurl =
      pipAngles[2] < 162 &&
      pipAngles[3] < 155 &&
      d(4, 12) < 0.32 &&
      lms[8].y <= lms[4].y + 0.04 * palm;
    if (isECurl) {
      return { gesture: 'E', confidence: 0.92, type: 'letter' };
    }

    // A: Thumb rests alongside index finger (tProj < 0.0) or upright above index MCP
    if (tProj < 0.0 || (tProj <= 0.04 && lms[4].y < lms[6].y)) {
      return { gesture: 'A', confidence: 0.96, type: 'letter' };
    }

    // T: Thumb tucked between index (5) and middle (9) -> tProj in [0.0, 0.28] and thumb tip high near PIPs
    if (tProj >= 0.0 && tProj <= 0.28 && lms[4].y < lms[5].y - 0.25 * palm) {
      return { gesture: 'T', confidence: 0.92, type: 'letter' };
    }

    // M: Thumb tucked deep under three fingers (reaches past ring MCP -> tProj > 0.66)
    if (tProj > 0.66) {
      return { gesture: 'M', confidence: 0.92, type: 'letter' };
    }

    // N: Thumb tucked under two fingers (between middle 9 and ring 13 -> tProj in [0.28, 0.50] and close to middle tip)
    if (tProj > 0.28 && tProj <= 0.50 && d(4, 12) < 0.35) {
      return { gesture: 'N', confidence: 0.92, type: 'letter' };
    }

    // S: Thumb wrapped horizontally across front of clenched fingers
    return { gesture: 'S', confidence: 0.94, type: 'letter' };
  }

  return { gesture: 'UNKNOWN', confidence: 0.5, type: 'unknown' };
}

/**
 * classifySequence(frames, secondaryFrames = [])
 * Evaluates a 12-frame sequence (plus optional 2nd hand) to detect:
 *   1. Two-handed lexical words (LOVE, HELP, FRIEND, MORE)
 *   2. Dynamic motion letters (J, Z)
 *   3. Single-handed lexical words (HELLO, THANK YOU, PLEASE, SORRY, YES, NO, GOOD, WATER, WELCOME, UNDERSTAND, PEACE)
 *   4. Stabilized static letters (A–Z) via confidence-weighted window vote
 */
export function classifySequence(frames, secondaryFrames = []) {
  if (!frames || frames.length === 0) {
    return { gesture: 'UNKNOWN', confidence: 0.5, type: 'unknown', displayed: false };
  }

  const normFrames = frames.map((f) => f.map(pt));
  const N = normFrames.length;
  const first = normFrames[0];
  const last = normFrames[N - 1];
  const palm = Math.max(dist2D(last[0], last[9]), 0.04);

  // Per-frame static classification
  const perFrame = normFrames.map((f) => classifyHand(f));
  const lastStatic = perFrame[N - 1];

  // ── 1. TWO-HANDED WORD RECOGNITION (LOVE, HELP, FRIEND, MORE) ──
  const validSec = (secondaryFrames || []).filter((f) => Array.isArray(f) && f.length >= 21).map((f) => f.map(pt));
  if (validSec.length >= Math.min(3, N)) {
    const h1 = last;
    const h2 = validSec[validSec.length - 1];
    const s1 = classifyHand(h1).gesture;
    const s2 = classifyHand(h2).gesture;
    const wristDist = dist2D(h1[0], h2[0]) / palm;
    const idxTipDist = dist2D(h1[8], h2[8]) / palm;
    const palmDist = dist2D(h1[9], h2[9]) / palm;

    // MORE: Both hands in O / curved pinch tapping fingertips together
    if ((s1 === 'O' || s1 === 'C' || s2 === 'O' || s2 === 'C') && idxTipDist < 1.15) {
      return { gesture: 'MORE', confidence: 0.95, type: 'word', displayed: true };
    }
    // FRIEND: Both hands with index extended/hooked (X, D, G) interlocking near index tips
    if (['X', 'D', 'G'].includes(s1) && ['X', 'D', 'G'].includes(s2) && idxTipDist < 1.1) {
      return { gesture: 'FRIEND', confidence: 0.94, type: 'word', displayed: true };
    }
    // HELP: One hand flat open (B) supporting/lifting a closed fist (A or S)
    const isFist1 = ['A', 'S', 'T', 'M', 'N', 'E'].includes(s1);
    const isFist2 = ['A', 'S', 'T', 'M', 'N', 'E'].includes(s2);
    if ((s1 === 'B' && isFist2) || (s2 === 'B' && isFist1)) {
      return { gesture: 'HELP', confidence: 0.95, type: 'word', displayed: true };
    }
    // LOVE: Both hands in fists (S / A) crossed or brought close over chest
    if (isFist1 && isFist2 && (palmDist < 2.2 || wristDist < 2.2)) {
      return { gesture: 'LOVE', confidence: 0.95, type: 'word', displayed: true };
    }
  }

  // ── 2. TRAJECTORY & MOTION METRICS OVER THE WINDOW ──
  let wristPath = 0, idxPath = 0, pinkyPath = 0;
  let minWristX = Infinity, maxWristX = -Infinity, minWristY = Infinity, maxWristY = -Infinity;
  let minIdxX = Infinity, maxIdxX = -Infinity, minIdxY = Infinity, maxIdxY = -Infinity;
  let minPinkyX = Infinity, maxPinkyX = -Infinity, minPinkyY = Infinity, maxPinkyY = -Infinity;

  for (let i = 0; i < N; i++) {
    const f = normFrames[i];
    minWristX = Math.min(minWristX, f[0].x); maxWristX = Math.max(maxWristX, f[0].x);
    minWristY = Math.min(minWristY, f[0].y); maxWristY = Math.max(maxWristY, f[0].y);
    minIdxX = Math.min(minIdxX, f[8].x);     maxIdxX = Math.max(maxIdxX, f[8].x);
    minIdxY = Math.min(minIdxY, f[8].y);     maxIdxY = Math.max(maxIdxY, f[8].y);
    minPinkyX = Math.min(minPinkyX, f[20].x); maxPinkyX = Math.max(maxPinkyX, f[20].x);
    minPinkyY = Math.min(minPinkyY, f[20].y); maxPinkyY = Math.max(maxPinkyY, f[20].y);

    if (i > 0) {
      const prev = normFrames[i - 1];
      wristPath += dist2D(prev[0], f[0]);
      idxPath += dist2D(prev[8], f[8]);
      pinkyPath += dist2D(prev[20], f[20]);
    }
  }

  const wristSpanX = (maxWristX - minWristX) / palm;
  const wristSpanY = (maxWristY - minWristY) / palm;
  const wristNetDx = (last[0].x - first[0].x) / palm;
  const wristNetDy = (last[0].y - first[0].y) / palm;
  const idxSpanX = (maxIdxX - minIdxX) / palm;
  const idxSpanY = (maxIdxY - minIdxY) / palm;
  const pinkySpanX = (maxPinkyX - minPinkyX) / palm;
  const pinkySpanY = (maxPinkyY - minPinkyY) / palm;
  const totalMotion = wristPath / palm;

  // Count pose distribution in window
  const counts = {};
  perFrame.forEach(({ gesture }) => {
    counts[gesture] = (counts[gesture] || 0) + 1;
  });
  const countOf = (labels) => labels.reduce((s, l) => s + (counts[l] || 0), 0);

  // ── 3. DYNAMIC LETTERS (J and Z) ──
  // J: Pinky extended ('I' handshape) swooping down and curving sideways
  if (countOf(['I', 'Y']) >= Math.ceil(N * 0.5) && (pinkySpanY > 0.38 || (pinkyPath / palm > 0.55 && pinkySpanX > 0.22))) {
    return { gesture: 'J', confidence: 0.94, type: 'letter', displayed: true };
  }
  // Z: Index finger extended ('D' / 'L' / 'X') tracing horizontal + diagonal strokes
  if (countOf(['D', 'L', 'X', 'G']) >= Math.ceil(N * 0.5) && idxSpanX > 0.42 && idxPath / palm > 0.65) {
    return { gesture: 'Z', confidence: 0.94, type: 'letter', displayed: true };
  }

  // ── 4. SINGLE-HANDED LEXICAL WORDS ──
  // UNDERSTAND: Transitions from closed fist (S/A/E) to upright index finger (D/L)
  const firstHalfFist = perFrame.slice(0, Math.floor(N / 2)).some((p) => ['S', 'A', 'E', 'T'].includes(p.gesture));
  const secondHalfIndex = perFrame.slice(Math.floor(N / 2)).some((p) => ['D', 'L'].includes(p.gesture));
  if (firstHalfFist && secondHalfIndex && ['D', 'L'].includes(lastStatic.gesture)) {
    return { gesture: 'UNDERSTAND', confidence: 0.94, type: 'word', displayed: true };
  }

  // NO: Index + middle fingers snapping shut toward thumb
  const thumbIdxDists = normFrames.map((f) => dist2D(f[4], f[8]) / palm);
  const thumbMidDists = normFrames.map((f) => dist2D(f[4], f[12]) / palm);
  const idxMidTipY = normFrames.map((f) => (f[8].y + f[12].y) * 0.5);
  const snapDelta = Math.max(
    Math.max(...thumbIdxDists) - Math.min(...thumbIdxDists),
    Math.max(...thumbMidDists) - Math.min(...thumbMidDists),
    (Math.max(...idxMidTipY) - Math.min(...idxMidTipY)) / palm,
  );
  if (
    snapDelta > 0.22 &&
    countOf(['H', 'G', 'U', 'V', 'K', 'N', 'O', 'F']) >= Math.ceil(N * 0.5) &&
    wristSpanX < 0.15 &&
    wristSpanY < 0.15
  ) {
    return { gesture: 'NO', confidence: 0.94, type: 'word', displayed: true };
  }

  // WATER: 'W' handshape tapping / moving near upper frame
  if (countOf(['W']) >= Math.ceil(N * 0.55) && (wristSpanX > 0.14 || wristSpanY > 0.14 || totalMotion > 0.25)) {
    return { gesture: 'WATER', confidence: 0.94, type: 'word', displayed: true };
  }

  // Motion with a closed fist (SORRY vs YES)
  if (countOf(['A', 'S', 'T', 'M', 'N', 'E']) >= Math.ceil(N * 0.55) && totalMotion > 0.28) {
    // SORRY: Circular motion over chest (both X and Y displacement significant)
    if (wristSpanX > 0.18 && wristSpanY > 0.14) {
      return { gesture: 'SORRY', confidence: 0.94, type: 'word', displayed: true };
    }
    // YES: Vertical nodding of the fist (Y motion dominates X motion)
    if (wristSpanY > 0.16 || Math.abs(last[9].y - first[9].y) / palm > 0.20) {
      return { gesture: 'YES', confidence: 0.94, type: 'word', displayed: true };
    }
  }

  // Motion with an open palm 'B' (HELLO, PLEASE, THANK YOU, GOOD, WELCOME)
  if (countOf(['B']) >= Math.ceil(N * 0.55) && totalMotion > 0.30) {
    // PLEASE: Circular rub over chest (balanced X and Y excursion: wristSpanY > 0.48 and X/Y ratio < 1.35)
    if (wristSpanX > 0.32 && wristSpanY > 0.45 && wristSpanX / (wristSpanY || 1e-9) < 1.45) {
      return { gesture: 'PLEASE', confidence: 0.94, type: 'word', displayed: true };
    }
    // WELCOME vs HELLO: Horizontal sweep of open palm
    if (wristSpanX > 0.24) {
      // HELLO: High salute near forehead (minWristY < 0.74) or outward wave (dx >= 0)
      if (minWristY < 0.74 || wristNetDx > 0.05) {
        return { gesture: 'HELLO', confidence: 0.95, type: 'word', displayed: true };
      }
      // WELCOME: Sweeping inward in mid/lower frame
      return { gesture: 'WELCOME', confidence: 0.94, type: 'word', displayed: true };
    }
    // THANK YOU vs GOOD: Open palm moving downward from chin/mouth level
    if (wristSpanY > 0.25 && wristSpanX <= 0.24) {
      if (minWristY < 0.71) {
        return { gesture: 'GOOD', confidence: 0.94, type: 'word', displayed: true };
      }
      return { gesture: 'THANK YOU', confidence: 0.94, type: 'word', displayed: true };
    }
  }

  // ── 5. STATIC LETTER MAJORITY / CONFIDENCE VOTE ──
  const scores = {};
  perFrame.forEach(({ gesture, confidence }) => {
    if (gesture !== 'UNKNOWN') {
      scores[gesture] = (scores[gesture] || 0) + confidence;
    }
  });
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return { gesture: 'UNKNOWN', confidence: 0.5, type: 'unknown', displayed: false };
  }
  const [bestGesture, totalScore] = entries[0];
  const avgConfidence = Math.min(0.99, totalScore / N);
  return {
    gesture: bestGesture,
    confidence: Number(avgConfidence.toFixed(4)),
    type: bestGesture.length > 1 ? 'word' : 'letter',
    displayed: avgConfidence >= 0.75,
  };
}

/** Tight normalized bounding box {x, y, w, h} from 21 landmarks. */
export function bboxOf(lms) {
  const xs = lms.map((p) => (Array.isArray(p) ? p[0] : p.x));
  const ys = lms.map((p) => (Array.isArray(p) ? p[1] : p.y));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}