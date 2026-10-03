export const MIN_RECOGNITION_CONFIDENCE = 0.78;

export function isAcceptedPrediction({ gesture, confidence, displayed = true, serviceState = 'local', wordLabels = new Set() }) {
  const label = typeof gesture === 'string' ? gesture.trim().toUpperCase() : '';
  if (!/^[A-Z]+$/.test(label) || displayed === false || Number(confidence) < MIN_RECOGNITION_CONFIDENCE) return false;
  if (label.length === 1) return true;
  return wordLabels.has(label) && serviceState === 'ready';
}

export function advanceStability(state, label, required = 5) {
  const next = { ...state };
  if (next.candidate === label) next.count += 1;
  else { next.candidate = label; next.count = 1; }
  return { state: next, committed: next.count >= required && next.last !== label };
}
