export const MIN_RECOGNITION_CONFIDENCE = 0.65;
export const MIN_TOP2_MARGIN = 0.15;
export const MOTION_TRANSITION_THRESHOLD = 0.075;
export const MOTION_SETTLED_THRESHOLD = 0.045;
export const STABLE_FRAMES_STATIC = 4;
export const STABLE_FRAMES_DYNAMIC = 2;

export function isAcceptedPrediction({
  gesture,
  confidence,
  margin = 1.0,
  displayed = true,
  serviceState = 'local',
  wordLabels = new Set(),
}) {
  if (serviceState === 'error' || serviceState === 'idle' || serviceState === 'checking') {
    return false;
  }
  const label = typeof gesture === 'string' ? gesture.trim().toUpperCase() : '';
  if (
    !/^[A-Z]+$/.test(label) ||
    label === 'UNKNOWN' ||
    label === 'NONE' ||
    displayed === false ||
    Number(confidence) < MIN_RECOGNITION_CONFIDENCE ||
    Number(margin) < MIN_TOP2_MARGIN
  ) {
    return false;
  }
  if (label.length === 1) return true;
  return wordLabels.has(label) && serviceState === 'ready';
}

export function advanceStability(state, label, required = 5) {
  const next = { ...state };
  if (next.candidate === label) next.count += 1;
  else { next.candidate = label; next.count = 1; }
  return { state: next, committed: next.count >= required && next.last !== label };
}

/**
 * Computes normalized hand motion between consecutive frames:
 * - wristMotion: translation of the wrist landmark (0) relative to palm size
 * - fingerMotion: average displacement of 5 fingertips (4, 8, 12, 16, 20)
 *   relative to the wrist, normalized by palm size.
 * Captures internal hand articulation / sign reconfiguration during transitions.
 */
export function computeHandMotion(currFrame, prevFrame) {
  if (!currFrame || !prevFrame || currFrame.length < 21 || prevFrame.length < 21) {
    return { fingerMotion: 0, wristMotion: 0, isMoving: false };
  }
  const getX = (p) => (Array.isArray(p) ? p[0] : p.x);
  const getY = (p) => (Array.isArray(p) ? p[1] : p.y);

  const palm = Math.max(
    Math.hypot(getX(currFrame[9]) - getX(currFrame[0]), getY(currFrame[9]) - getY(currFrame[0])),
    0.04
  );

  const wristMotion = Math.hypot(
    getX(currFrame[0]) - getX(prevFrame[0]),
    getY(currFrame[0]) - getY(prevFrame[0])
  ) / palm;

  const tips = [4, 8, 12, 16, 20];
  let totalTipDelta = 0;
  for (const idx of tips) {
    const curRelX = getX(currFrame[idx]) - getX(currFrame[0]);
    const curRelY = getY(currFrame[idx]) - getY(currFrame[0]);
    const prevRelX = getX(prevFrame[idx]) - getX(prevFrame[0]);
    const prevRelY = getY(prevFrame[idx]) - getY(prevFrame[0]);
    totalTipDelta += Math.hypot(curRelX - prevRelX, curRelY - prevRelY);
  }
  const fingerMotion = totalTipDelta / (tips.length * palm);
  const isMoving = fingerMotion > MOTION_TRANSITION_THRESHOLD || (fingerMotion > MOTION_SETTLED_THRESHOLD && wristMotion > 0.09);

  return { fingerMotion, wristMotion, isMoving };
}

/**
 * Computes average motion across recent frames in the window.
 */
export function computeWindowMotion(frames) {
  if (!frames || frames.length < 2) {
    return { fingerMotion: 0, wristMotion: 0, isMoving: false };
  }
  const len = frames.length;
  const m1 = computeHandMotion(frames[len - 1], frames[len - 2]);
  if (len < 3) return m1;
  const m2 = computeHandMotion(frames[len - 2], frames[len - 3]);
  const fingerMotion = Math.max(m1.fingerMotion, (m1.fingerMotion + m2.fingerMotion) * 0.5);
  const wristMotion = Math.max(m1.wristMotion, (m1.wristMotion + m2.wristMotion) * 0.5);
  const isMoving = fingerMotion > MOTION_TRANSITION_THRESHOLD || (fingerMotion > MOTION_SETTLED_THRESHOLD && wristMotion > 0.09);
  return { fingerMotion, wristMotion, isMoving };
}
