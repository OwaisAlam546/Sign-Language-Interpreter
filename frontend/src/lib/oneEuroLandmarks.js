// Per-landmark 1-euro filter matching the reference translator's live pipeline.
// Filtering in pixel space is important: x and y are normalized against
// different camera dimensions, so filtering normalized coordinates distorts motion.
const MIN_CUTOFF = 0.8;
const BETA = 0.02;
const D_CUTOFF = 1.0;
const MIN_DT = 1e-3;
const MAX_DT = 1.0;

const alpha = (cutoff, dt) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

export class OneEuroLandmarkFilter {
  constructor() {
    this.reset();
  }

  reset() {
    this.previous = null;
    this.previousDerivative = null;
    this.previousTime = null;
  }

  filter(landmarks, width, height, timestampMs) {
    if (!Array.isArray(landmarks) || landmarks.length !== 21 || !width || !height) return landmarks;
    const current = landmarks.map(({ x, y }) => [x * width, y * height]);
    const timestamp = timestampMs / 1000;
    if (!this.previous) {
      this.previous = current.map((point) => [...point]);
      this.previousDerivative = current.map(() => [0, 0]);
      this.previousTime = timestamp;
      return landmarks;
    }

    const dt = Math.min(MAX_DT, Math.max(MIN_DT, timestamp - this.previousTime));
    const derivativeAlpha = alpha(D_CUTOFF, dt);
    const filtered = current.map((point, index) => {
      const previous = this.previous[index];
      const oldDerivative = this.previousDerivative[index];
      const derivative = point.map((value, axis) => (value - previous[axis]) / dt);
      const smoothDerivative = derivative.map((value, axis) => derivativeAlpha * value + (1 - derivativeAlpha) * oldDerivative[axis]);
      const speed = Math.hypot(...smoothDerivative);
      const valueAlpha = alpha(MIN_CUTOFF + BETA * speed, dt);
      const smoothPoint = point.map((value, axis) => valueAlpha * value + (1 - valueAlpha) * previous[axis]);
      this.previousDerivative[index] = smoothDerivative;
      return smoothPoint;
    });

    this.previous = filtered;
    this.previousTime = timestamp;
    return landmarks.map((landmark, index) => ({
      ...landmark,
      x: filtered[index][0] / width,
      y: filtered[index][1] / height,
    }));
  }
}
