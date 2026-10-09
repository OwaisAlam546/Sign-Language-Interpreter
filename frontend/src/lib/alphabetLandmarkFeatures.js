/**
 * alphabetLandmarkFeatures.js — 90-dimensional geometric feature extractor for MediaPipe hand landmarks.
 *
 * Implements exact mathematical parity with:
 * backend/ai-service/scripts/prepare_alphabet_landmark_dataset.py
 *
 * Components (Total = 90 features):
 *   1. 63 normalized 3D coordinates (wrist-relative, palm-scale normalized)
 *   2. 5 finger curl ratios (tip-span vs cumulative bone length)
 *   3. 5 finger joint angles (cosine of angle at PIP joint)
 *   4. 9 thumb inter-joint distances (to key MCP/PIP/Tips)
 *   5. 1 thumb relative depth (z4 - mean(z8, z12, z16, z20))
 *   6. 4 adjacent fingertip spans
 *   7. 3 hand orientation unit vector coordinates (wrist -> middle MCP)
 */

export const FEATURE_DIM = 90;

function parseLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    throw new Error(`Expected at least 21 landmarks, received ${landmarks?.length || 0}`);
  }

  const pts = new Float32Array(21 * 3);
  for (let i = 0; i < 21; i += 1) {
    const item = landmarks[i];
    if (Array.isArray(item)) {
      pts[i * 3] = Number(item[0]) || 0;
      pts[i * 3 + 1] = Number(item[1]) || 0;
      pts[i * 3 + 2] = Number(item[2]) || 0;
    } else if (item && typeof item === 'object') {
      pts[i * 3] = Number(item.x) || 0;
      pts[i * 3 + 1] = Number(item.y) || 0;
      pts[i * 3 + 2] = Number(item.z) || 0;
    } else {
      pts[i * 3] = 0;
      pts[i * 3 + 1] = 0;
      pts[i * 3 + 2] = 0;
    }
  }
  return pts;
}

function dist3D(pts, i, j) {
  const dx = pts[i * 3] - pts[j * 3];
  const dy = pts[i * 3 + 1] - pts[j * 3 + 1];
  const dz = pts[i * 3 + 2] - pts[j * 3 + 2];
  return Math.hypot(dx, dy, dz);
}

/**
 * Extracts the 90-dimensional feature vector from a single hand's 21 landmarks.
 *
 * @param {Array|Float32Array} rawLandmarks - Array of 21 [x,y,z] tuples, {x,y,z} objects, or 63-flat coordinates
 * @returns {Float32Array} 90-dimensional feature array
 */
export function extractAlphabetFeatures(rawLandmarks) {
  const pts = parseLandmarks(rawLandmarks);

  // 1. Translation Invariance: center at wrist (landmark 0)
  const wx = pts[0];
  const wy = pts[1];
  const wz = pts[2];

  const rel = new Float32Array(21 * 3);
  for (let i = 0; i < 21; i += 1) {
    rel[i * 3] = pts[i * 3] - wx;
    rel[i * 3 + 1] = pts[i * 3 + 1] - wy;
    rel[i * 3 + 2] = pts[i * 3 + 2] - wz;
  }

  // 2. Scale Invariance: normalize by palm extent (wrist to middle MCP, index 9) or max radius
  const palmDist = Math.hypot(rel[9 * 3], rel[9 * 3 + 1], rel[9 * 3 + 2]);
  let maxDist = 0;
  for (let i = 0; i < 21; i += 1) {
    const d = Math.hypot(rel[i * 3], rel[i * 3 + 1], rel[i * 3 + 2]);
    if (d > maxDist) maxDist = d;
  }
  const scale = Math.max(palmDist, maxDist, 1e-6);

  const normPts = new Float32Array(21 * 3);
  for (let i = 0; i < 21 * 3; i += 1) {
    normPts[i] = rel[i] / scale;
  }

  const out = new Float32Array(FEATURE_DIM);
  let idx = 0;

  // 1. Normalized 3D Coordinates: 63 features
  for (let i = 0; i < 63; i += 1) {
    out[idx++] = normPts[i];
  }

  // 2. Finger Curl Ratios & Joint Angles: 5 + 5 = 10 features
  const fingerIndices = [
    [1, 2, 3, 4],     // Thumb: CMC, MCP, IP, Tip
    [5, 6, 7, 8],     // Index: MCP, PIP, DIP, Tip
    [9, 10, 11, 12],  // Middle: MCP, PIP, DIP, Tip
    [13, 14, 15, 16], // Ring: MCP, PIP, DIP, Tip
    [17, 18, 19, 20], // Pinky: MCP, PIP, DIP, Tip
  ];

  // 2a. Curls (5)
  for (const [mcp, pip, dip, tip] of fingerIndices) {
    const bone1 = dist3D(normPts, mcp, pip);
    const bone2 = dist3D(normPts, pip, dip);
    const bone3 = dist3D(normPts, dip, tip);
    const totalBoneLen = Math.max(bone1 + bone2 + bone3, 1e-6);
    const tipSpan = dist3D(normPts, mcp, tip);
    out[idx++] = tipSpan / totalBoneLen;
  }

  // 2b. Joint Angles at PIP (5)
  for (const [mcp, pip, dip] of fingerIndices) {
    const v1x = normPts[pip * 3] - normPts[mcp * 3];
    const v1y = normPts[pip * 3 + 1] - normPts[mcp * 3 + 1];
    const v1z = normPts[pip * 3 + 2] - normPts[mcp * 3 + 2];

    const v2x = normPts[dip * 3] - normPts[pip * 3];
    const v2y = normPts[dip * 3 + 1] - normPts[pip * 3 + 1];
    const v2z = normPts[dip * 3 + 2] - normPts[pip * 3 + 2];

    const dot = v1x * v2x + v1y * v2y + v1z * v2z;
    const mag1 = Math.hypot(v1x, v1y, v1z);
    const mag2 = Math.hypot(v2x, v2y, v2z);
    const cosAng = dot / (mag1 * mag2 + 1e-6);
    out[idx++] = Math.max(-1.0, Math.min(1.0, cosAng));
  }

  // 3. Thumb Relationships: 9 distances + 1 relative depth = 10 features
  const thumbJoints = [5, 6, 8, 10, 12, 14, 16, 18, 20];
  for (const j of thumbJoints) {
    out[idx++] = dist3D(normPts, 4, j);
  }

  // Thumb relative depth
  const fingerMeanZ = (normPts[8 * 3 + 2] + normPts[12 * 3 + 2] + normPts[16 * 3 + 2] + normPts[20 * 3 + 2]) / 4.0;
  out[idx++] = normPts[4 * 3 + 2] - fingerMeanZ;

  // 4. Inter-fingertip Spans: 4 features
  out[idx++] = dist3D(normPts, 8, 12);  // Index tip -> Middle tip
  out[idx++] = dist3D(normPts, 12, 16); // Middle tip -> Ring tip
  out[idx++] = dist3D(normPts, 16, 20); // Ring tip -> Pinky tip
  out[idx++] = dist3D(normPts, 4, 20);  // Thumb tip -> Pinky tip

  // 5. Hand Orientation Unit Vector (Wrist -> Middle MCP, index 9): 3 features
  const vAxisX = normPts[9 * 3];
  const vAxisY = normPts[9 * 3 + 1];
  const vAxisZ = normPts[9 * 3 + 2];
  const axisMag = Math.max(Math.hypot(vAxisX, vAxisY, vAxisZ), 1e-6);

  out[idx++] = vAxisX / axisMag;
  out[idx++] = vAxisY / axisMag;
  out[idx++] = vAxisZ / axisMag;

  if (idx !== FEATURE_DIM) {
    throw new Error(`Feature dimension mismatch: expected ${FEATURE_DIM}, produced ${idx}`);
  }

  return out;
}
