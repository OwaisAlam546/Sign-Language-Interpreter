/**
 * wordLandmarkFeatures.js — Feature extractor and temporal sequence buffer
 * for the 25-class WLASL100 sequence GRU model (wlasl100_gru_25class.onnx).
 *
 * Vector Signature per Frame: 147 Dimensions
 *   - [0..62]   : Left Hand landmarks (21 * 3 = 63)
 *   - [63..125] : Right Hand landmarks (21 * 3 = 63)
 *   - [126..127]: Hand presence masks [left_present, right_present] (2)
 *   - [128..145]: Pose anchors (6 * 3 = 18): Nose, L-Shoulder, R-Shoulder, L-Elbow, R-Elbow, Mid-Shoulder
 *   - [146]     : Pose presence mask [pose_present] (1)
 *
 * Sequence Input Shape: [batch_size, 16, 147]
 */

export const SEQUENCE_LENGTH = 16;
export const FEATURE_DIM = 147;

// Upper-body pose anchor indices in MediaPipe PoseLandmarker
const POSE_ANCHOR_INDICES = [0, 11, 12, 13, 14]; // 0: Nose, 11: L-Shoulder, 12: R-Shoulder, 13: L-Elbow, 14: R-Elbow

/**
 * Extracts a 147-dimensional normalized feature vector from a single video frame.
 *
 * @param {Array<{x: number, y: number, z: number}>|null} leftHand - 21 left hand landmarks or null
 * @param {Array<{x: number, y: number, z: number}>|null} rightHand - 21 right hand landmarks or null
 * @param {Array<{x: number, y: number, z: number, visibility?: number}>|null} poseLandmarks - 33 pose landmarks or null
 * @returns {Float32Array} 147-dimensional float vector
 */
export function extractWordFeatures(leftHand = null, rightHand = null, poseLandmarks = null) {
  const vec = new Float32Array(FEATURE_DIM);

  let posePresent = 0.0;
  let centerX = 0.5;
  let centerY = 0.5;
  let centerZ = 0.0;
  let scale = 1.0;

  // 1. Check Upper-Body Pose Anchors
  if (poseLandmarks && Array.isArray(poseLandmarks) && poseLandmarks.length >= 15) {
    const ls = poseLandmarks[11]; // Left Shoulder
    const rs = poseLandmarks[12]; // Right Shoulder

    const lsVis = ls?.visibility ?? 1.0;
    const rsVis = rs?.visibility ?? 1.0;

    if (ls && rs && lsVis > 0.35 && rsVis > 0.35) {
      posePresent = 1.0;
      centerX = (ls.x + rs.x) / 2.0;
      centerY = (ls.y + rs.y) / 2.0;
      centerZ = ((ls.z || 0) + (rs.z || 0)) / 2.0;

      const dx = rs.x - ls.x;
      const dy = rs.y - ls.y;
      scale = Math.max(Math.hypot(dx, dy), 0.15);

      // Extract 5 anchors: 0: Nose, 11: L-Shoulder, 12: R-Shoulder, 13: L-Elbow, 14: R-Elbow
      let offset = 128;
      for (const aIdx of POSE_ANCHOR_INDICES) {
        const pt = poseLandmarks[aIdx] || { x: centerX, y: centerY, z: centerZ };
        vec[offset] = (pt.x - centerX) / scale;
        vec[offset + 1] = (pt.y - centerY) / scale;
        vec[offset + 2] = ((pt.z || 0) - centerZ) / scale;
        offset += 3;
      }
      // 6th anchor: Mid-shoulder point (origin [0, 0, 0] in normalized coordinate frame)
      vec[143] = 0.0;
      vec[144] = 0.0;
      vec[145] = 0.0;
    }
  }

  // If pose is not detected, check if we have hands from which to estimate a torso center
  if (posePresent === 0.0) {
    // Exact training fallback convention:
    // center = [0.5, 0.5, 0.0], scale = 1.0, pose_pts = 0.0, pose_present = 0.0
    centerX = 0.5;
    centerY = 0.5;
    centerZ = 0.0;
    scale = 1.0;
    // pose anchors [128..145] remain zeros
  }

  vec[146] = posePresent;

  // 2. Left Hand Landmarks (21 * 3 = 63, indices [0..62])
  let leftPresent = 0.0;
  if (leftHand && Array.isArray(leftHand) && leftHand.length >= 21) {
    leftPresent = 1.0;
    for (let i = 0; i < 21; i++) {
      const pt = leftHand[i];
      vec[i * 3] = (pt.x - centerX) / scale;
      vec[i * 3 + 1] = (pt.y - centerY) / scale;
      vec[i * 3 + 2] = ((pt.z || 0) - centerZ) / scale;
    }
  }

  // 3. Right Hand Landmarks (21 * 3 = 63, indices [63..125])
  let rightPresent = 0.0;
  if (rightHand && Array.isArray(rightHand) && rightHand.length >= 21) {
    rightPresent = 1.0;
    for (let i = 0; i < 21; i++) {
      const pt = rightHand[i];
      vec[63 + i * 3] = (pt.x - centerX) / scale;
      vec[63 + i * 3 + 1] = (pt.y - centerY) / scale;
      vec[63 + i * 3 + 2] = ((pt.z || 0) - centerZ) / scale;
    }
  }

  // 4. Hand Presence Masks (indices [126, 127])
  vec[126] = leftPresent;
  vec[127] = rightPresent;

  return vec;
}

/**
 * Rolling temporal ring buffer that maintains the last 16 frames of 147-dimensional features.
 */
export class WordSequenceBuffer {
  constructor(capacity = SEQUENCE_LENGTH) {
    this.capacity = capacity;
    this.frames = []; // Array of Float32Array(147)
    this.wristHistory = []; // Track wrist coordinates for motion energy
  }

  /**
   * Pushes a new frame vector into the buffer.
   *
   * @param {Float32Array} frameVector - 147-dimensional float array
   * @param {{x: number, y: number}|null} primaryWrist - optional wrist coordinate for motion tracking
   */
  push(frameVector, primaryWrist = null) {
    if (frameVector.length !== FEATURE_DIM) {
      throw new Error(`Invalid frame vector length: expected ${FEATURE_DIM}, got ${frameVector.length}`);
    }

    this.frames.push(frameVector);
    if (this.frames.length > this.capacity) {
      this.frames.shift();
    }

    if (primaryWrist) {
      this.wristHistory.push({ x: primaryWrist.x, y: primaryWrist.y, time: performance.now() });
      if (this.wristHistory.length > this.capacity) {
        this.wristHistory.shift();
      }
    }
  }

  /**
   * Whether the buffer has accumulated the full 16 frames.
   */
  isFull() {
    return this.frames.length >= this.capacity;
  }

  /**
   * Returns current buffered frame count.
   */
  get length() {
    return this.frames.length;
  }

  /**
   * Clears the buffer.
   */
  reset() {
    this.frames = [];
    this.wristHistory = [];
  }

  /**
   * Returns a contiguous Float32Array of shape [16 * 147] = 2352 floats.
   * If fewer than 16 frames are buffered, tiles/pads the earliest frame forward.
   *
   * @returns {Float32Array}
   */
  getTensorData() {
    const out = new Float32Array(this.capacity * FEATURE_DIM);
    const count = this.frames.length;

    if (count === 0) return out;

    if (count >= this.capacity) {
      // Buffer is full: copy directly
      for (let i = 0; i < this.capacity; i++) {
        out.set(this.frames[i], i * FEATURE_DIM);
      }
    } else {
      // Pad by repeating available frames or first frame
      const firstFrame = this.frames[0];
      const padCount = this.capacity - count;
      for (let i = 0; i < padCount; i++) {
        out.set(firstFrame, i * FEATURE_DIM);
      }
      for (let i = 0; i < count; i++) {
        out.set(this.frames[i], (padCount + i) * FEATURE_DIM);
      }
    }

    return out;
  }

  /**
   * Calculates overall motion energy across the current temporal window.
   * Used for Hybrid mode arbitration: low motion energy -> Alphabet, dynamic motion -> Word.
   *
   * @returns {number} Motion energy scalar (average inter-frame displacement)
   */
  getMotionEnergy() {
    if (this.wristHistory.length < 3) return 0;

    let totalDisplacement = 0;
    for (let i = 1; i < this.wristHistory.length; i++) {
      const prev = this.wristHistory[i - 1];
      const curr = this.wristHistory[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      totalDisplacement += Math.hypot(dx, dy);
    }

    return totalDisplacement / (this.wristHistory.length - 1);
  }

  /**
   * Returns how many frames in the current buffer have at least one hand present.
   * Frame vector index 126 is left_present, 127 is right_present.
   *
   * @returns {number} Count of frames with hand presence (0..16)
   */
  getValidHandFramesCount() {
    let count = 0;
    for (const frame of this.frames) {
      if (frame[126] > 0.5 || frame[127] > 0.5) {
        count++;
      }
    }
    return count;
  }

  /**
   * Returns true if both hands have been detected together in at least 3 frames of the buffer.
   *
   * @returns {boolean}
   */
  hasTwoHands() {
    let bothCount = 0;
    for (const frame of this.frames) {
      if (frame[126] > 0.5 && frame[127] > 0.5) {
        bothCount++;
      }
    }
    return bothCount >= 3;
  }
}
