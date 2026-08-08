// ─────────────────────────────────────────────────────────────
// lib/handClassifier.js — deterministic ASL gesture classifier
// A faithful JS twin of the backend rule engine
// (ai-service/app/utils/landmarks.py::classify): the same four PIP
// joint angles + thumb-IP angle + the same thresholds, so browser
// and server agree on a gesture for identical landmarks.
//  0° = straight finger, 45° PIP threshold, 35° thumb threshold.
//  ─────────────────────────────────────────────────────────────

const STRAIGHT = 45.0;
const THUMB_STRAIGHT = 35.0;

const vec = (a, b) => [b.x - a.x, b.y - a.y, (b.z ?? 0) - (a.z ?? 0)];
const norm = (v) => Math.hypot(v[0], v[1], v[2]);
const dist = (a, b) => norm(vec(a, b));

// Bend (degrees) at joint b of the a→b→c chain.
function angleAt(a, b, c) {
  const u = vec(a, b);
  const v = vec(b, c);
  const cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (norm(u) * norm(v) || 1e-9);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/**
 * classify({ x, y, z }[21]) → { gesture, confidence }
 * MediaPipe NormalizedLandmark objects are directly consumable.
 */
export function classifyHand(lms) {
  const fingers = [
    [5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20],
  ];
  const angles = fingers.map(([m, p, t]) => angleAt(lms[m], lms[p], lms[t]));
  const nExt = angles.filter((a) => a <= STRAIGHT).length;
  const thumb = angleAt(lms[2], lms[3], lms[4]) <= THUMB_STRAIGHT;

  // made-a-circle (O) wins first: fingertips almost touch
  if (dist(lms[4], lms[8]) < 0.28 * (dist(lms[0], lms[9]) || 1e-9)) {
    return { gesture: 'O', confidence: 0.94 };
  }
  if (!thumb && nExt === 0) return { gesture: 'A', confidence: 0.96 };
  if (!thumb && nExt === 1 && angles[0] <= STRAIGHT) return { gesture: 'D', confidence: 0.93 };
  if (!thumb && nExt === 2 && angles[0] <= STRAIGHT && angles[1] <= STRAIGHT) {
    return { gesture: 'PEACE', confidence: 0.94 };
  }
  if (!thumb && nExt === 3) return { gesture: 'THREE', confidence: 0.93 };
  if (!thumb && nExt === 4) return { gesture: 'FOUR', confidence: 0.94 };
  if (thumb && nExt === 4) return { gesture: 'B', confidence: 0.97 };
  if (thumb && nExt === 0) return { gesture: 'THUMBS_UP', confidence: 0.95 };
  if (thumb && nExt === 1 && angles[0] <= STRAIGHT) return { gesture: 'L', confidence: 0.94 };
  return { gesture: 'UNKNOWN', confidence: 0.5 };
}

/** Tight normalized bounding box {x, y, w, h} from 21 landmarks. */
export function bboxOf(lms) {
  const xs = lms.map((p) => p.x);
  const ys = lms.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}