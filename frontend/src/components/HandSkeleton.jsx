// MediaPipe-style 21-landmark hand skeleton visualization with authentic ASL lexical word signs.
// Features:
// 1. Letters A–Z: Authentic individual 21-point ASL handshapes + dynamic J & Z trajectories.
// 2. Lexical ASL Words: Continuous single-hand & two-handed lexical ASL signs (NO letter-by-letter fingerspelling).
//    - Two-handed signs (LOVE, HELP, FRIEND, MORE) render two synchronized 21-landmark HandSkeletons inside the card.
//    - Single-handed signs (HELLO, THANK YOU, PLEASE, SORRY, YES, NO, GOOD, PEACE, WATER, WELCOME, UNDERSTAND) render 1 HandSkeleton.
//    - Every hover resets cleanly to the starting pose ($t = 0$), completes the sign, resets, and loops infinitely while hovered.
//    - Zero duplicate requestAnimationFrame loops: Two-handed signs share one unified frame loop.
import { useEffect, useRef } from 'react';

// MediaPipe standard 21-landmark connection topology (21 bone segments)
export const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb (4)
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index (4)
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle (4)
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring (4)
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky (4)
  [0, 17],                              // Palm base: wrist to pinky MCP (1)
];

// Bones with palm heel for 22-point alphabet letter handshapes
const BONES_HEEL = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [17, 21],                             // Pinky MCP to palm heel
  [21, 0],                              // Palm heel to wrist
];

// Relaxed neutral open hand (21 landmarks)
export const OPEN_LANDMARKS = [
  [0.50, 0.84],   // 0: Wrist
  [0.37, 0.74],   // 1: Thumb CMC
  [0.26, 0.66],   // 2: Thumb MCP
  [0.19, 0.55],   // 3: Thumb IP
  [0.16, 0.44],   // 4: Thumb TIP
  [0.52, 0.60],   // 5: Index MCP
  [0.54, 0.44],   // 6: Index PIP
  [0.55, 0.31],   // 7: Index DIP
  [0.56, 0.20],   // 8: Index TIP
  [0.62, 0.585],  // 9: Middle MCP
  [0.64, 0.41],   // 10: Middle PIP
  [0.65, 0.28],   // 11: Middle DIP
  [0.66, 0.17],   // 12: Middle TIP
  [0.72, 0.60],   // 13: Ring MCP
  [0.74, 0.44],   // 14: Ring PIP
  [0.75, 0.32],   // 15: Ring DIP
  [0.76, 0.22],   // 16: Ring TIP
  [0.82, 0.64],   // 17: Pinky MCP
  [0.84, 0.52],   // 18: Pinky PIP
  [0.85, 0.42],   // 19: Pinky DIP
  [0.86, 0.32],   // 20: Pinky TIP
  [0.78, 0.835],  // 21: Palm heel (optional)
];

// Canonical coordinates for ASL Alphabet Letters A through Z
export const ASL_LANDMARKS = {
  // A: Closed fist, thumb upright along radial side of index
  A: [
    [0.50, 0.84],
    [0.38, 0.74], [0.33, 0.63], [0.34, 0.50], [0.36, 0.39],
    [0.50, 0.60], [0.49, 0.49], [0.51, 0.56], [0.51, 0.63],
    [0.61, 0.59], [0.61, 0.48], [0.62, 0.56], [0.62, 0.64],
    [0.71, 0.60], [0.71, 0.50], [0.71, 0.57], [0.70, 0.65],
    [0.81, 0.63], [0.81, 0.55], [0.80, 0.62], [0.78, 0.69],
    [0.78, 0.835],
  ],

  // B: Four upright fingers together, thumb folded flat across lower palm
  B: [
    [0.50, 0.84],
    [0.37, 0.74], [0.36, 0.67], [0.45, 0.67], [0.55, 0.67],
    [0.46, 0.60], [0.47, 0.44], [0.48, 0.31], [0.48, 0.18],
    [0.54, 0.59], [0.54, 0.43], [0.54, 0.29], [0.54, 0.16],
    [0.62, 0.60], [0.61, 0.44], [0.60, 0.30], [0.60, 0.17],
    [0.70, 0.63], [0.68, 0.49], [0.67, 0.37], [0.66, 0.25],
    [0.78, 0.835],
  ],

  // C: All fingers and thumb curved in an open "C" profile
  C: [
    [0.50, 0.84],
    [0.37, 0.74], [0.26, 0.67], [0.25, 0.57], [0.33, 0.50],
    [0.52, 0.60], [0.51, 0.45], [0.42, 0.38], [0.35, 0.40],
    [0.61, 0.59], [0.60, 0.44], [0.50, 0.37], [0.42, 0.38],
    [0.70, 0.60], [0.69, 0.46], [0.59, 0.38], [0.51, 0.39],
    [0.79, 0.63], [0.77, 0.51], [0.68, 0.43], [0.60, 0.43],
    [0.78, 0.835],
  ],

  // D: Index straight UP; middle, ring, pinky tips touch thumb tip
  D: [
    [0.50, 0.84],
    [0.37, 0.74], [0.33, 0.64], [0.39, 0.54], [0.49, 0.50],
    [0.52, 0.60], [0.52, 0.44], [0.52, 0.30], [0.52, 0.16],
    [0.62, 0.59], [0.64, 0.46], [0.57, 0.47], [0.49, 0.50],
    [0.72, 0.60], [0.73, 0.50], [0.65, 0.52], [0.56, 0.54],
    [0.81, 0.63], [0.81, 0.56], [0.74, 0.61], [0.66, 0.63],
    [0.78, 0.835],
  ],

  // E: Four fingers curled down resting on bent thumb
  E: [
    [0.50, 0.84],
    [0.37, 0.74], [0.34, 0.66], [0.45, 0.62], [0.58, 0.60],
    [0.48, 0.60], [0.46, 0.48], [0.47, 0.53], [0.47, 0.59],
    [0.58, 0.59], [0.56, 0.47], [0.56, 0.52], [0.53, 0.58],
    [0.68, 0.60], [0.66, 0.49], [0.64, 0.53], [0.61, 0.59],
    [0.78, 0.63], [0.76, 0.53], [0.74, 0.58], [0.69, 0.62],
    [0.78, 0.835],
  ],

  // F: Index and thumb tips touching in circle; middle, ring, pinky extended UP
  F: [
    [0.50, 0.84],
    [0.37, 0.74], [0.33, 0.63], [0.38, 0.54], [0.46, 0.48],
    [0.52, 0.60], [0.50, 0.47], [0.45, 0.45], [0.46, 0.48],
    [0.63, 0.59], [0.64, 0.42], [0.65, 0.28], [0.66, 0.16],
    [0.73, 0.60], [0.76, 0.44], [0.78, 0.31], [0.80, 0.19],
    [0.82, 0.63], [0.86, 0.49], [0.89, 0.37], [0.91, 0.26],
    [0.78, 0.835],
  ],

  // G: Side profile: Index points horizontally left; thumb parallel
  G: [
    [0.62, 0.84],
    [0.54, 0.72], [0.43, 0.65], [0.32, 0.63], [0.22, 0.63],
    [0.54, 0.53], [0.42, 0.51], [0.31, 0.50], [0.20, 0.49],
    [0.61, 0.54], [0.55, 0.57], [0.56, 0.62], [0.60, 0.63],
    [0.68, 0.56], [0.64, 0.60], [0.65, 0.64], [0.68, 0.65],
    [0.75, 0.59], [0.72, 0.63], [0.73, 0.67], [0.76, 0.68],
    [0.80, 0.80],
  ],

  // H: Side profile: Index AND Middle extended together horizontally left
  H: [
    [0.62, 0.84],
    [0.52, 0.74], [0.45, 0.68], [0.43, 0.61], [0.46, 0.56],
    [0.54, 0.50], [0.43, 0.48], [0.32, 0.47], [0.21, 0.46],
    [0.55, 0.56], [0.44, 0.54], [0.33, 0.53], [0.22, 0.52],
    [0.66, 0.58], [0.61, 0.63], [0.62, 0.67], [0.66, 0.68],
    [0.74, 0.61], [0.70, 0.66], [0.71, 0.70], [0.74, 0.71],
    [0.80, 0.81],
  ],

  // I: Pinky finger extended straight UP; others in fist
  I: [
    [0.50, 0.84],
    [0.37, 0.74], [0.35, 0.64], [0.45, 0.58], [0.55, 0.56],
    [0.48, 0.60], [0.46, 0.49], [0.47, 0.56], [0.48, 0.63],
    [0.59, 0.59], [0.58, 0.48], [0.59, 0.56], [0.60, 0.64],
    [0.70, 0.60], [0.70, 0.50], [0.70, 0.57], [0.69, 0.65],
    [0.81, 0.63], [0.84, 0.49], [0.86, 0.36], [0.88, 0.23],
    [0.78, 0.835],
  ],

  // J: ASL "I" base shape (traces J swoop hook)
  J: [
    [0.50, 0.84],
    [0.37, 0.74], [0.35, 0.64], [0.45, 0.58], [0.55, 0.56],
    [0.48, 0.60], [0.46, 0.49], [0.47, 0.56], [0.48, 0.63],
    [0.59, 0.59], [0.58, 0.48], [0.59, 0.56], [0.60, 0.64],
    [0.70, 0.60], [0.70, 0.50], [0.70, 0.57], [0.69, 0.65],
    [0.81, 0.63], [0.84, 0.49], [0.86, 0.36], [0.88, 0.23],
    [0.78, 0.835],
  ],

  // K: Index straight up, middle angled forward, thumb upright touching middle PIP
  K: [
    [0.50, 0.84],
    [0.38, 0.74], [0.42, 0.63], [0.48, 0.52], [0.55, 0.44],
    [0.50, 0.60], [0.49, 0.44], [0.48, 0.30], [0.47, 0.17],
    [0.61, 0.59], [0.63, 0.45], [0.67, 0.33], [0.70, 0.22],
    [0.72, 0.60], [0.72, 0.50], [0.70, 0.57], [0.68, 0.65],
    [0.82, 0.63], [0.81, 0.55], [0.79, 0.62], [0.76, 0.68],
    [0.78, 0.835],
  ],

  // L: Index straight UP, Thumb extended 90° forming "L"
  L: [
    [0.50, 0.84],
    [0.38, 0.74], [0.28, 0.67], [0.18, 0.61], [0.08, 0.59],
    [0.52, 0.60], [0.52, 0.44], [0.52, 0.30], [0.52, 0.17],
    [0.63, 0.59], [0.63, 0.49], [0.63, 0.56], [0.63, 0.64],
    [0.74, 0.60], [0.73, 0.51], [0.72, 0.58], [0.70, 0.65],
    [0.84, 0.64], [0.83, 0.56], [0.81, 0.63], [0.78, 0.69],
    [0.79, 0.835],
  ],

  // M: 3 fingers folded over thumb
  M: [
    [0.50, 0.84],
    [0.38, 0.74], [0.42, 0.66], [0.56, 0.62], [0.72, 0.60],
    [0.48, 0.60], [0.47, 0.49], [0.48, 0.55], [0.48, 0.62],
    [0.58, 0.59], [0.58, 0.48], [0.58, 0.54], [0.58, 0.62],
    [0.68, 0.60], [0.68, 0.49], [0.68, 0.55], [0.68, 0.63],
    [0.80, 0.63], [0.81, 0.56], [0.80, 0.63], [0.78, 0.69],
    [0.78, 0.835],
  ],

  // N: 2 fingers folded over thumb
  N: [
    [0.50, 0.84],
    [0.38, 0.74], [0.41, 0.66], [0.50, 0.62], [0.62, 0.59],
    [0.48, 0.60], [0.47, 0.49], [0.48, 0.55], [0.48, 0.62],
    [0.58, 0.59], [0.58, 0.48], [0.58, 0.54], [0.58, 0.62],
    [0.70, 0.60], [0.72, 0.53], [0.72, 0.60], [0.70, 0.66],
    [0.81, 0.63], [0.82, 0.57], [0.81, 0.64], [0.78, 0.70],
    [0.78, 0.835],
  ],

  // O: All four fingertips curve down meeting thumb tip
  O: [
    [0.50, 0.84],
    [0.38, 0.74], [0.32, 0.65], [0.35, 0.55], [0.44, 0.49],
    [0.52, 0.60], [0.52, 0.44], [0.47, 0.43], [0.44, 0.49],
    [0.62, 0.59], [0.61, 0.43], [0.52, 0.44], [0.46, 0.49],
    [0.71, 0.60], [0.69, 0.45], [0.58, 0.46], [0.49, 0.50],
    [0.80, 0.63], [0.78, 0.49], [0.66, 0.49], [0.52, 0.51],
    [0.78, 0.835],
  ],

  // P: Downward angled "K": wrist tilted, index forward-down, middle straight down
  P: [
    [0.48, 0.68],
    [0.42, 0.72], [0.43, 0.77], [0.49, 0.81], [0.55, 0.82],
    [0.52, 0.70], [0.46, 0.77], [0.40, 0.83], [0.34, 0.88],
    [0.58, 0.71], [0.56, 0.81], [0.55, 0.90], [0.54, 0.98],
    [0.65, 0.69], [0.66, 0.74], [0.65, 0.78], [0.63, 0.78],
    [0.72, 0.67], [0.73, 0.72], [0.72, 0.76], [0.70, 0.76],
    [0.68, 0.62],
  ],

  // Q: Downward angled "G": index and thumb pointing straight down
  Q: [
    [0.50, 0.60],
    [0.42, 0.65], [0.40, 0.74], [0.40, 0.83], [0.40, 0.92],
    [0.50, 0.66], [0.50, 0.76], [0.50, 0.85], [0.50, 0.94],
    [0.58, 0.66], [0.61, 0.71], [0.60, 0.76], [0.56, 0.76],
    [0.66, 0.65], [0.68, 0.70], [0.67, 0.74], [0.64, 0.74],
    [0.73, 0.64], [0.75, 0.68], [0.74, 0.72], [0.71, 0.72],
    [0.68, 0.56],
  ],

  // R: Index and Middle fingers upright and CROSSED
  R: [
    [0.50, 0.84],
    [0.38, 0.74], [0.36, 0.65], [0.44, 0.60], [0.54, 0.58],
    [0.50, 0.60], [0.52, 0.44], [0.54, 0.30], [0.56, 0.17],
    [0.60, 0.59], [0.57, 0.43], [0.50, 0.29], [0.46, 0.16],
    [0.71, 0.60], [0.71, 0.50], [0.70, 0.57], [0.68, 0.64],
    [0.81, 0.63], [0.81, 0.56], [0.80, 0.63], [0.78, 0.69],
    [0.78, 0.835],
  ],

  // S: Solid fist with thumb wrapped horizontally across front
  S: [
    [0.50, 0.84],
    [0.38, 0.74], [0.39, 0.63], [0.52, 0.55], [0.68, 0.54],
    [0.48, 0.60], [0.46, 0.49], [0.47, 0.57], [0.47, 0.64],
    [0.59, 0.59], [0.58, 0.48], [0.58, 0.57], [0.58, 0.65],
    [0.70, 0.60], [0.69, 0.49], [0.69, 0.58], [0.68, 0.65],
    [0.81, 0.63], [0.81, 0.55], [0.80, 0.63], [0.78, 0.69],
    [0.78, 0.835],
  ],

  // T: Closed fist with thumb tucked between index and middle
  T: [
    [0.50, 0.84],
    [0.38, 0.74], [0.41, 0.64], [0.47, 0.54], [0.52, 0.45],
    [0.48, 0.60], [0.44, 0.49], [0.46, 0.56], [0.47, 0.63],
    [0.59, 0.59], [0.59, 0.48], [0.59, 0.56], [0.59, 0.64],
    [0.70, 0.60], [0.70, 0.50], [0.70, 0.57], [0.69, 0.65],
    [0.81, 0.63], [0.81, 0.56], [0.80, 0.63], [0.78, 0.69],
    [0.78, 0.835],
  ],

  // U: Index and Middle fingers upright and touching side-by-side
  U: [
    [0.50, 0.84],
    [0.38, 0.74], [0.36, 0.65], [0.44, 0.60], [0.54, 0.58],
    [0.50, 0.60], [0.51, 0.44], [0.51, 0.30], [0.51, 0.17],
    [0.58, 0.59], [0.57, 0.43], [0.57, 0.29], [0.57, 0.16],
    [0.70, 0.60], [0.70, 0.50], [0.70, 0.57], [0.69, 0.65],
    [0.81, 0.63], [0.81, 0.56], [0.80, 0.63], [0.78, 0.69],
    [0.78, 0.835],
  ],

  // V: Index and Middle fingers upright and SPREAD in a "V"
  V: [
    [0.50, 0.84],
    [0.38, 0.74], [0.36, 0.65], [0.44, 0.60], [0.54, 0.58],
    [0.50, 0.60], [0.47, 0.44], [0.44, 0.30], [0.41, 0.17],
    [0.60, 0.59], [0.63, 0.43], [0.66, 0.29], [0.69, 0.16],
    [0.71, 0.60], [0.71, 0.50], [0.70, 0.57], [0.69, 0.65],
    [0.81, 0.63], [0.81, 0.56], [0.80, 0.63], [0.78, 0.69],
    [0.78, 0.835],
  ],

  // W: Index, Middle, and Ring extended in a "W"; thumb holds down pinky
  W: [
    [0.50, 0.84],
    [0.38, 0.74], [0.42, 0.67], [0.55, 0.65], [0.68, 0.65],
    [0.48, 0.60], [0.44, 0.45], [0.40, 0.31], [0.36, 0.18],
    [0.58, 0.59], [0.58, 0.43], [0.58, 0.28], [0.58, 0.16],
    [0.68, 0.60], [0.72, 0.45], [0.76, 0.31], [0.80, 0.18],
    [0.80, 0.64], [0.80, 0.57], [0.77, 0.64], [0.72, 0.68],
    [0.78, 0.835],
  ],

  // X: Fist with index raised and hooked (claw hook)
  X: [
    [0.50, 0.84],
    [0.38, 0.74], [0.35, 0.65], [0.42, 0.58], [0.51, 0.56],
    [0.50, 0.60], [0.50, 0.43], [0.43, 0.39], [0.42, 0.48],
    [0.60, 0.59], [0.60, 0.49], [0.60, 0.56], [0.60, 0.64],
    [0.71, 0.60], [0.71, 0.50], [0.70, 0.57], [0.69, 0.65],
    [0.81, 0.63], [0.81, 0.56], [0.80, 0.63], [0.78, 0.69],
    [0.78, 0.835],
  ],

  // Y: Thumb extended wide left, Pinky extended wide right (shaka)
  Y: [
    [0.50, 0.84],
    [0.38, 0.74], [0.26, 0.66], [0.15, 0.57], [0.06, 0.50],
    [0.48, 0.60], [0.47, 0.49], [0.48, 0.56], [0.49, 0.63],
    [0.58, 0.59], [0.58, 0.48], [0.58, 0.56], [0.59, 0.64],
    [0.68, 0.60], [0.68, 0.50], [0.68, 0.57], [0.68, 0.65],
    [0.79, 0.63], [0.85, 0.51], [0.90, 0.39], [0.95, 0.28],
    [0.77, 0.835],
  ],

  // Z: Pointing index finger base (traces Z in the air)
  Z: [
    [0.50, 0.84],
    [0.38, 0.74], [0.35, 0.64], [0.44, 0.58], [0.53, 0.56],
    [0.52, 0.60], [0.52, 0.44], [0.52, 0.30], [0.52, 0.17],
    [0.61, 0.59], [0.60, 0.49], [0.60, 0.57], [0.60, 0.65],
    [0.71, 0.60], [0.70, 0.50], [0.70, 0.58], [0.69, 0.66],
    [0.81, 0.63], [0.80, 0.55], [0.79, 0.63], [0.77, 0.70],
    [0.78, 0.835],
  ],
};

// Word presets / aliases
ASL_LANDMARKS.OPEN = OPEN_LANDMARKS;
ASL_LANDMARKS.FIST = ASL_LANDMARKS.S;
ASL_LANDMARKS.PEACE = ASL_LANDMARKS.V;
ASL_LANDMARKS.OK = ASL_LANDMARKS.F;

// Kinematics geometric helpers
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

// 21-point standard MediaPipe letter slices
const LETTER_21 = {};
Object.keys(ASL_LANDMARKS).forEach((k) => {
  LETTER_21[k] = ASL_LANDMARKS[k].slice(0, 21);
});

// Two-handed word identifiers
export const TWO_HANDED_WORDS = new Set(['LOVE', 'HELP', 'FRIEND', 'MORE']);
export const isTwoHandedWord = (name) => TWO_HANDED_WORDS.has(String(name || '').trim().toUpperCase());

// =========================================================================
// LEXICAL ASL WORD KINEMATICS ENGINE
// Evaluates Hand 1 (dominant) and Hand 2 (non-dominant) for each ASL word.
// Every word executes a complete gesture:
// Exact Start Pose -> Full Authentic Movement -> End Pose -> Reset -> Complete Loop
// =========================================================================

export function evaluateWordSign(signKey, elapsed) {
  const key = String(signKey || '').trim().toUpperCase();

  // 1. HELLO: One-handed salute wave outward from forehead
  if (key === 'HELLO') {
    const duration = 1800;
    const t = (elapsed % duration) / duration;
    const base = clonePts(LETTER_21.B);
    let dx = -0.04, dy = -0.14, rot = -0.08;
    if (t < 0.15) {
      dx = -0.04; dy = -0.14; rot = -0.08;
    } else if (t < 0.65) {
      const p = (t - 0.15) / 0.50;
      const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
      dx = -0.04 + ease * 0.16;
      dy = -0.14 + ease * 0.05;
      rot = -0.08 + ease * 0.22;
    } else if (t < 0.80) {
      dx = 0.12; dy = -0.09; rot = 0.14;
    } else {
      const p = (t - 0.80) / 0.20;
      const ease = 0.5 + 0.5 * Math.cos(p * Math.PI);
      dx = -0.04 + ease * 0.16;
      dy = -0.14 + ease * 0.05;
      rot = -0.08 + ease * 0.22;
    }
    const hand1 = rotatePts(translatePts(base, dx, dy), rot, 0.5, 0.7);
    return { hand1, hand2: null };
  }

  // 2. THANK YOU: Flat hand moves forward and down from chin
  if (key === 'THANK_YOU' || key === 'THANK YOU') {
    const duration = 1800;
    const t = (elapsed % duration) / duration;
    const base = clonePts(LETTER_21.B);
    let dy = -0.12, dx = 0, rot = -0.05;
    if (t < 0.15) {
      dy = -0.12; rot = -0.05;
    } else if (t < 0.65) {
      const p = (t - 0.15) / 0.50;
      const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
      dy = -0.12 + ease * 0.18;
      rot = -0.05 + ease * 0.24;
    } else if (t < 0.80) {
      dy = 0.06; rot = 0.19;
    } else {
      const p = (t - 0.80) / 0.20;
      const ease = 0.5 + 0.5 * Math.cos(p * Math.PI);
      dy = -0.12 + ease * 0.18;
      rot = -0.05 + ease * 0.24;
    }
    const hand1 = rotatePts(translatePts(base, dx, dy), rot, 0.5, 0.7);
    return { hand1, hand2: null };
  }

  // 3. PLEASE: Flat open palm in circular motion over chest
  if (key === 'PLEASE') {
    const duration = 1800;
    const t = (elapsed % duration) / duration;
    const base = clonePts(LETTER_21.B);
    const rad = t * Math.PI * 2;
    const dx = (1 - Math.cos(rad)) * 0.08;
    const dy = Math.sin(rad) * 0.07;
    const hand1 = translatePts(base, dx, dy);
    return { hand1, hand2: null };
  }

  // 4. SORRY: 'A' fist in circular motion over chest
  if (key === 'SORRY') {
    const duration = 1800;
    const t = (elapsed % duration) / duration;
    const base = clonePts(LETTER_21.A);
    const rad = t * Math.PI * 2;
    const dx = (1 - Math.cos(rad)) * 0.07;
    const dy = Math.sin(rad) * 0.06;
    const hand1 = translatePts(base, dx, dy);
    return { hand1, hand2: null };
  }

  // 5. YES: 'S' fist nodding up and down at wrist
  if (key === 'YES') {
    const duration = 1800;
    const t = (elapsed % duration) / duration;
    const base = clonePts(LETTER_21.S);
    let nod = 0;
    if (t < 0.85) {
      const cycle = (t / 0.85) * Math.PI * 4;
      nod = Math.max(0, Math.sin(cycle));
    } else {
      nod = 0;
    }
    const dy = nod * 0.06;
    const rot = nod * 0.22;
    const hand1 = rotatePts(translatePts(base, 0, dy), rot, 0.5, 0.84);
    return { hand1, hand2: null };
  }

  // 6. NO: Index and middle snapping shut firmly against thumb
  if (key === 'NO') {
    const duration = 1600;
    const t = (elapsed % duration) / duration;
    const base = clonePts(LETTER_21.H);
    let snap = 0;
    if (t < 0.40) {
      const p = t / 0.40;
      snap = Math.sin(p * Math.PI);
    } else if (t < 0.45) {
      snap = 0;
    } else if (t < 0.85) {
      const p = (t - 0.45) / 0.40;
      snap = Math.sin(p * Math.PI);
    } else {
      snap = 0;
    }
    base[7][1] += snap * 0.07;
    base[8][1] += snap * 0.11;
    base[11][1] += snap * 0.07;
    base[12][1] += snap * 0.11;
    base[3][1] -= snap * 0.03;
    base[4][1] -= snap * 0.05;
    const hand1 = translatePts(base, 0.04, -0.04);
    return { hand1, hand2: null };
  }

  // 7. GOOD: Flat fingers touch chin and move forward/down
  if (key === 'GOOD') {
    const duration = 1800;
    const t = (elapsed % duration) / duration;
    const base = clonePts(LETTER_21.B);
    let dy = -0.14, rot = -0.06;
    if (t < 0.15) {
      dy = -0.14; rot = -0.06;
    } else if (t < 0.65) {
      const p = (t - 0.15) / 0.50;
      const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
      dy = -0.14 + ease * 0.18;
      rot = -0.06 + ease * 0.24;
    } else if (t < 0.80) {
      dy = 0.04; rot = 0.18;
    } else {
      const p = (t - 0.80) / 0.20;
      const ease = 0.5 + 0.5 * Math.cos(p * Math.PI);
      dy = -0.14 + ease * 0.18;
      rot = -0.06 + ease * 0.24;
    }
    const hand1 = rotatePts(translatePts(base, 0, dy), rot, 0.5, 0.7);
    return { hand1, hand2: null };
  }

  // 8. PEACE: Upright 'V' peace sign with living organic breath
  if (key === 'PEACE') {
    const base = clonePts(LETTER_21.V);
    const duration = 1800;
    const t = (elapsed % duration) / duration;
    const breath = Math.sin(t * Math.PI * 2) * 0.015;
    const hand1 = translatePts(base, 0, breath);
    return { hand1, hand2: null };
  }

  // 9. WATER: 'W' sign tapped twice against chin
  if (key === 'WATER') {
    const duration = 1800;
    const t = (elapsed % duration) / duration;
    const base = clonePts(LETTER_21.W);
    let tapX = 0;
    if (t < 0.35) {
      const p = t / 0.35;
      tapX = -Math.sin(p * Math.PI) * 0.06;
    } else if (t < 0.45) {
      tapX = 0;
    } else if (t < 0.80) {
      const p = (t - 0.45) / 0.35;
      tapX = -Math.sin(p * Math.PI) * 0.06;
    } else {
      tapX = 0;
    }
    const hand1 = translatePts(base, tapX, -0.06);
    return { hand1, hand2: null };
  }

  // 10. WELCOME: Open receptive palm sweeping inward toward body
  if (key === 'WELCOME') {
    const duration = 2000;
    const t = (elapsed % duration) / duration;
    const base = clonePts(LETTER_21.B);
    let dx = 0.12, dy = -0.05, rot = 0.20;
    if (t < 0.15) {
      dx = 0.12; dy = -0.05; rot = 0.20;
    } else if (t < 0.70) {
      const p = (t - 0.15) / 0.55;
      const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
      dx = 0.12 - ease * 0.22;
      dy = -0.05 + ease * 0.11;
      rot = 0.20 - ease * 0.40;
    } else if (t < 0.85) {
      dx = -0.10; dy = 0.06; rot = -0.20;
    } else {
      const p = (t - 0.85) / 0.15;
      const ease = 0.5 + 0.5 * Math.cos(p * Math.PI);
      dx = -0.10 + (1 - ease) * 0.22;
      dy = 0.06 - (1 - ease) * 0.11;
      rot = -0.20 + (1 - ease) * 0.40;
    }
    const hand1 = rotatePts(translatePts(base, dx, dy), rot, 0.5, 0.7);
    return { hand1, hand2: null };
  }

  // 11. UNDERSTAND: 'S' fist near temple, index finger flicking upward
  if (key === 'UNDERSTAND') {
    const duration = 1800;
    const t = (elapsed % duration) / duration;
    const base = clonePts(LETTER_21.S);
    let flick = 0;
    if (t < 0.20) {
      flick = 0;
    } else if (t < 0.45) {
      const p = (t - 0.20) / 0.25;
      flick = 0.5 - 0.5 * Math.cos(p * Math.PI);
    } else if (t < 0.75) {
      flick = 1;
    } else {
      const p = (t - 0.75) / 0.25;
      flick = 0.5 + 0.5 * Math.cos(p * Math.PI);
    }
    const D = LETTER_21.D;
    for (let j = 5; j <= 8; j++) {
      base[j][0] = base[j][0] * (1 - flick) + D[j][0] * flick;
      base[j][1] = base[j][1] * (1 - flick) + D[j][1] * flick;
    }
    const hand1 = translatePts(base, 0.04, -0.10);
    return { hand1, hand2: null };
  }

  // =========================================================================
  // TWO-HANDED SIGNS (Both hands render standard 21 landmarks)
  // =========================================================================

  // 12. LOVE: TWO-HANDED.
  // Starting State: Left Hand near Left Edge, Right Hand near Right Edge
  // Lifecycle: Opposite-side start -> Move inward -> Cross & hug over chest -> Reset to opposite-side start -> Repeat
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

    const startX = 0.22; // Separation: Left Hand at -0.22, Right Hand at +0.22
    const base1 = scalePts(clonePts(LETTER_21.S), 0.84);
    const base2 = scalePts(clonePts(LETTER_21.S), 0.84);
    const mirrored2 = base2.map(([x, y]) => [1.0 - x, y]);

    // Right Hand (Dominant): starts at right edge, moves inward, crosses to upper-left chest
    const h1Dx = (1 - inward) * startX - inward * (crossAction * 0.10);
    const h1Dy = (1 - inward) * 0.04 - inward * (0.04 + crossAction * 0.04);
    const h1Rot = (1 - inward) * (-0.10) + inward * (crossAction * 0.38);
    const hand1 = rotatePts(translatePts(base1, h1Dx, h1Dy), h1Rot, 0.5, 0.7);

    // Left Hand (Non-dominant): starts at left edge, moves inward, crosses to upper-right chest
    const h2Dx = (1 - inward) * (-startX) + inward * (crossAction * 0.10);
    const h2Dy = (1 - inward) * 0.04 - inward * (0.04 + crossAction * 0.04);
    const h2Rot = (1 - inward) * (0.10) - inward * (crossAction * 0.38);
    const hand2 = rotatePts(translatePts(mirrored2, h2Dx, h2Dy), h2Rot, 0.5, 0.7);

    return { hand1, hand2 };
  }

  // 13. HELP: TWO-HANDED.
  // Starting State: Left flat palm at Left Edge, Right 'A' fist at Right Edge
  // Lifecycle: Opposite-side start -> Move inward -> Left palm lifts Right fist upward -> Reset to opposite-side start -> Repeat
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
    const base1 = scalePts(clonePts(LETTER_21.A), 0.84); // Dominant 'A' fist
    const base2 = scalePts(clonePts(LETTER_21.B), 0.84); // Non-dominant flat palm
    const mirrored2 = base2.map(([x, y]) => [1.0 - x, y]);

    // Right Hand (Dominant 'A' fist): starts at right edge, moves inward, rests on palm, lifts
    const h1Dx = (1 - inward) * startX;
    const h1Dy = (1 - inward) * (-0.02) + inward * (liftY - 0.04);
    const hand1 = translatePts(base1, h1Dx, h1Dy);

    // Left Hand (Non-dominant flat palm): starts at left edge, moves inward, forms shelf, lifts
    const h2Dx = (1 - inward) * (-startX);
    const h2Dy = (1 - inward) * 0.06 + inward * (liftY + 0.10);
    const h2Rot = 0.28 * inward + (1 - inward) * 0.08;
    const hand2 = rotatePts(translatePts(mirrored2, h2Dx, h2Dy), h2Rot, 0.5, 0.7);

    return { hand1, hand2 };
  }

  // 14. FRIEND: TWO-HANDED.
  // Starting State: Left hook at Left Edge, Right hook at Right Edge
  // Lifecycle: Opposite-side start -> Move inward -> Interlock hooks & alternate -> Reset to opposite-side start -> Repeat
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

    // Right Hand (Dominant): starts at right edge, moves inward, clasps
    const h1Dx = (1 - inward) * startX + inward * (0.07 - claspX);
    const h1Dy = inward * (-0.02 + claspY);
    const hand1 = translatePts(base1, h1Dx, h1Dy);

    // Left Hand (Non-dominant): starts at left edge, moves inward, clasps
    const h2Dx = (1 - inward) * (-startX) + inward * (-0.07 + claspX);
    const h2Dy = inward * (-0.02 - claspY);
    const hand2 = translatePts(mirrored2, h2Dx, h2Dy);

    return { hand1, hand2 };
  }

  // 15. MORE: TWO-HANDED.
  // Starting State: Left pinched fingertips at Left Edge, Right pinched fingertips at Right Edge
  // Lifecycle: Opposite-side start -> Move inward -> Tap fingertips twice in center -> Reset to opposite-side start -> Repeat
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

    // Right Hand (Dominant): starts at right edge, moves inward, taps in center
    const h1Dx = (1 - inward) * startX + inward * (0.06 - tapDist);
    const h1Rot = (1 - inward) * (-0.08) + inward * (-0.22);
    const hand1 = rotatePts(translatePts(base1, h1Dx, -0.04), h1Rot, 0.5, 0.7);

    // Left Hand (Non-dominant): starts at left edge, moves inward, taps in center
    const h2Dx = (1 - inward) * (-startX) + inward * (-0.06 + tapDist);
    const h2Rot = (1 - inward) * (0.08) + inward * (0.22);
    const hand2 = rotatePts(translatePts(mirrored2, h2Dx, -0.04), h2Rot, 0.5, 0.7);

    return { hand1, hand2 };
  }

  return { hand1: clonePts(LETTER_21.B), hand2: null };
}

// Helper to look up base landmarks for a pose
export function getRawLandmarks(poseKey) {
  if (!poseKey) return OPEN_LANDMARKS;
  const key = String(poseKey).trim().toUpperCase();
  return ASL_LANDMARKS[key] || OPEN_LANDMARKS;
}

// Compute dynamic trajectory offset for J (tracing the J swoop hook)
function getJTrajectory(time) {
  const duration = 2000;
  const t = (time % duration) / duration;
  let dx = 0, dy = 0, rot = 0;
  if (t < 0.18) {
    dx = 0; dy = 0; rot = 0;
  } else if (t < 0.48) {
    const p = (t - 0.18) / 0.30;
    const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
    dy = ease * 0.13;
    dx = 0;
    rot = ease * -0.05;
  } else if (t < 0.78) {
    const p = (t - 0.48) / 0.30;
    const angle = p * Math.PI * 0.85;
    dx = -Math.sin(angle) * 0.14;
    dy = 0.13 - (1 - Math.cos(angle)) * 0.055;
    rot = -0.05 - p * 0.15;
  } else {
    const p = (t - 0.78) / 0.22;
    const ease = 0.5 + 0.5 * Math.cos(p * Math.PI);
    const startDx = -Math.sin(Math.PI * 0.85) * 0.14;
    const startDy = 0.13 - (1 - Math.cos(Math.PI * 0.85)) * 0.055;
    const startRot = -0.20;
    dx = startDx * ease;
    dy = startDy * ease;
    rot = startRot * ease;
  }
  return { dx, dy, rot };
}

// Compute dynamic trajectory offset for Z (tracing the 3 strokes of Z)
function getZTrajectory(time) {
  const duration = 2200;
  const t = (time % duration) / duration;
  let dx = 0, dy = 0;
  const leftX = -0.11, rightX = 0.11, topY = -0.07, botY = 0.07;
  if (t < 0.06) {
    dx = leftX; dy = topY;
  } else if (t < 0.28) {
    const p = (t - 0.06) / 0.22;
    const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
    dx = leftX + (rightX - leftX) * ease;
    dy = topY;
  } else if (t < 0.34) {
    dx = rightX; dy = topY;
  } else if (t < 0.60) {
    const p = (t - 0.34) / 0.26;
    const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
    dx = rightX + (leftX - rightX) * ease;
    dy = topY + (botY - topY) * ease;
  } else if (t < 0.66) {
    dx = leftX; dy = botY;
  } else if (t < 0.88) {
    const p = (t - 0.66) / 0.22;
    const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
    dx = leftX + (rightX - leftX) * ease;
    dy = botY;
  } else {
    const p = (t - 0.88) / 0.12;
    const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
    dx = rightX + (leftX - rightX) * ease;
    dy = botY + (topY - botY) * ease;
  }
  return { dx, dy };
}

// Compute transformed point with dynamic offsets & subtle organic breathing motion
function evaluateLandmark(basePt, i, poseKey, now, elapsed, morphBlend = 1) {
  const [origX, origY] = basePt;
  let x = origX;
  let y = origY;

  const key = String(poseKey || '').trim().toUpperCase();

  // Subtle living breathing motion & fingertip tremor
  const isTipOrDIP = i === 4 || i === 8 || i === 12 || i === 16 || i === 20 ||
                     i === 3 || i === 7 || i === 11 || i === 15 || i === 19;
  const breath = Math.sin(now * 0.0018) * 0.005;
  const microTremor = isTipOrDIP ? Math.sin(now * 0.0042 + i * 0.8) * 0.0018 : 0;
  y += breath + microTremor;

  const timeForTrajectory = elapsed !== undefined ? elapsed : now;

  // Dynamic trajectory for ASL "J"
  if (key === 'J') {
    const { dx, dy, rot } = getJTrajectory(timeForTrajectory);
    const cx = 0.55;
    const cy = 0.60;
    const px = x - cx;
    const py = y - cy;
    const cosR = Math.cos(rot * morphBlend);
    const sinR = Math.sin(rot * morphBlend);
    x = cx + px * cosR - py * sinR + dx * morphBlend;
    y = cy + px * sinR + py * cosR + dy * morphBlend;
  }

  // Dynamic trajectory for ASL "Z"
  if (key === 'Z') {
    const { dx, dy } = getZTrajectory(timeForTrajectory);
    x += dx * morphBlend;
    y += dy * morphBlend;
  }

  return [x, y];
}

// Initial point generator based on mode
function getInitialPoints(pose, word, hand) {
  if (word) {
    const initWord = evaluateWordSign(word, 0);
    const pts = hand === 'non-dominant' ? initWord.hand2 : initWord.hand1;
    return pts || LETTER_21.B;
  }
  return getRawLandmarks(pose);
}

// Main HandSkeleton component
export default function HandSkeleton({
  pose = 'OPEN',
  word = null,
  hand = 'dominant', // 'dominant' (Hand 1) | 'non-dominant' (Hand 2)
  syncRef = null,
  auto = null,
  interval = 2200,
  loop = true,
  className = '',
  glow = true,
  onActivePoseChange,
}) {
  const circleRefs = useRef([]);
  const lineRefs = useRef([]);
  const startTimeRef = useRef(performance.now());
  const lastActiveRef = useRef(-1);
  const poseNameRef = useRef(pose);
  const prevPoseNameRef = useRef('OPEN');
  const autoRef = useRef(auto);
  const onActivePoseChangeRef = useRef(onActivePoseChange);

  // Compute starting points for initial SSR/first paint with zero flicker
  const initialPoints = getInitialPoints(pose, word, hand);
  const is22Pt = initialPoints.length > 21;
  const activeBones = is22Pt ? BONES_HEEL : BONES;

  // Register Hand 2 in syncRef for two-handed word signs (zero duplicate rAF loop)
  useEffect(() => {
    if (hand === 'non-dominant' && syncRef) {
      syncRef.current.updateHand2 = (hand2Pts) => {
        if (!hand2Pts) return;
        hand2Pts.forEach(([x, y], i) => {
          const c = circleRefs.current[i];
          if (c) {
            c.setAttribute('cx', (x * 100).toFixed(2));
            c.setAttribute('cy', (y * 100).toFixed(2));
          }
        });
        BONES.forEach(([a, b], i) => {
          const l = lineRefs.current[i];
          if (l && hand2Pts[a] && hand2Pts[b]) {
            l.setAttribute('x1', (hand2Pts[a][0] * 100).toFixed(2));
            l.setAttribute('y1', (hand2Pts[a][1] * 100).toFixed(2));
            l.setAttribute('x2', (hand2Pts[b][0] * 100).toFixed(2));
            l.setAttribute('y2', (hand2Pts[b][1] * 100).toFixed(2));
          }
        });
      };
      return () => {
        if (syncRef.current) syncRef.current.updateHand2 = null;
      };
    }
  }, [hand, syncRef]);

  useEffect(() => {
    onActivePoseChangeRef.current = onActivePoseChange;
  }, [onActivePoseChange]);

  useEffect(() => {
    if (pose !== poseNameRef.current) {
      prevPoseNameRef.current = poseNameRef.current || 'OPEN';
      poseNameRef.current = pose;
      startTimeRef.current = performance.now();
    }
    autoRef.current = auto;
    lastActiveRef.current = -1;
  }, [pose, auto, word]);

  // Main Hardware-accelerated rAF animation loop
  useEffect(() => {
    // Hand 2 in two-handed mode is driven by Hand 1 synchronously
    if (hand === 'non-dominant' && syncRef) {
      return;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf;

    const tick = (time) => {
      const now = time || performance.now();
      const elapsed = now - startTimeRef.current;
      const currentAuto = autoRef.current;
      const currentPoseName = poseNameRef.current;
      const prevPoseName = prevPoseNameRef.current;

      // ── MODE 1: LEXICAL ASL WORD SIGNS ──
      if (word) {
        const { hand1, hand2 } = evaluateWordSign(word, elapsed);

        if (hand1) {
          hand1.forEach(([x, y], i) => {
            const c = circleRefs.current[i];
            if (c) {
              c.setAttribute('cx', (x * 100).toFixed(2));
              c.setAttribute('cy', (y * 100).toFixed(2));
            }
          });
          BONES.forEach(([a, b], i) => {
            const l = lineRefs.current[i];
            if (l && hand1[a] && hand1[b]) {
              l.setAttribute('x1', (hand1[a][0] * 100).toFixed(2));
              l.setAttribute('y1', (hand1[a][1] * 100).toFixed(2));
              l.setAttribute('x2', (hand1[b][0] * 100).toFixed(2));
              l.setAttribute('y2', (hand1[b][1] * 100).toFixed(2));
            }
          });
        }

        // Synchronously update Hand 2 on the exact same frame
        if (syncRef?.current?.updateHand2 && hand2) {
          syncRef.current.updateHand2(hand2);
        }

        raf = requestAnimationFrame(tick);
        return;
      }

      // ── MODE 2: REDUCED MOTION ──
      const pts = [];
      if (reduce) {
        const targetKey = currentAuto && currentAuto.length > 0 ? currentAuto[0] : currentPoseName;
        const targetLandmarks = getRawLandmarks(targetKey);
        for (let i = 0; i < targetLandmarks.length; i++) {
          pts.push(targetLandmarks[i] || OPEN_LANDMARKS[i]);
        }
      } else if (currentAuto && currentAuto.length > 0) {
        // ── MODE 3: MULTI-LETTER SEQUENCE (e.g. Fingerspelling Sequences) ──
        const seq = currentAuto;
        const letterDuration = (interval && interval >= 500) ? interval : 800;
        const totalDuration = seq.length * letterDuration;
        const cycleElapsed = (now - startTimeRef.current) % totalDuration;
        const currentIdx = Math.floor(cycleElapsed / letterDuration);
        const t = (cycleElapsed % letterDuration) / letterDuration;

        if (currentIdx !== lastActiveRef.current) {
          lastActiveRef.current = currentIdx;
          onActivePoseChangeRef.current?.(seq[currentIdx], currentIdx);
        }

        const currKey = seq[currentIdx];
        const prevIdx = (currentIdx - 1 + seq.length) % seq.length;
        const prevKey = seq[prevIdx];
        const nextIdx = (currentIdx + 1) % seq.length;
        const nextKey = seq[nextIdx];

        const prevPts = getRawLandmarks(prevKey);
        const currPts = getRawLandmarks(currKey);
        const nextPts = getRawLandmarks(nextKey);

        let blend = 1;
        let sourcePts = currPts;
        let targetPts = currPts;
        let activeKey = currKey;

        if (t < 0.24) {
          const p = t / 0.24;
          blend = 0.5 - 0.5 * Math.cos(p * Math.PI);
          sourcePts = prevPts;
          targetPts = currPts;
          activeKey = blend > 0.5 ? currKey : prevKey;
        } else if (t < 0.78) {
          blend = 1;
          sourcePts = currPts;
          targetPts = currPts;
          activeKey = currKey;
        } else {
          const p = (t - 0.78) / 0.22;
          blend = 0.5 - 0.5 * Math.cos(p * Math.PI);
          sourcePts = currPts;
          targetPts = nextPts;
          activeKey = blend > 0.5 ? nextKey : currKey;
        }

        for (let i = 0; i <= 21; i++) {
          const s = sourcePts[i] || OPEN_LANDMARKS[i];
          const trg = targetPts[i] || OPEN_LANDMARKS[i];
          const blendedBase = [
            s[0] + (trg[0] - s[0]) * blend,
            s[1] + (trg[1] - s[1]) * blend,
          ];
          pts.push(evaluateLandmark(blendedBase, i, activeKey, now, now, blend));
        }
      } else {
        // ── MODE 4: SINGLE ALPHABET LETTER (A–Z) ──
        const targetLandmarks = getRawLandmarks(currentPoseName);
        const prevLandmarks = getRawLandmarks(prevPoseName);

        const key = String(currentPoseName || '').trim().toUpperCase();
        const isDynamicLetter = key === 'J' || key === 'Z';

        let blend = 1;
        if (!loop) {
          const enterProgress = Math.min(1, elapsed / 280);
          blend = 0.5 - 0.5 * Math.cos(enterProgress * Math.PI);
        } else if (isDynamicLetter) {
          const enterProgress = Math.min(1, elapsed / 200);
          blend = 0.5 - 0.5 * Math.cos(enterProgress * Math.PI);
        } else {
          // Static letters (A–Z): Infinite signing demonstration loop while hovered
          const CYCLE = 2000;
          const t = (elapsed % CYCLE) / CYCLE;
          if (t < 0.28) {
            const p = t / 0.28;
            blend = 0.5 - 0.5 * Math.cos(p * Math.PI);
          } else if (t < 0.74) {
            blend = 1.0;
          } else {
            const p = (t - 0.74) / 0.26;
            blend = 0.5 + 0.5 * Math.cos(p * Math.PI);
          }
        }

        for (let i = 0; i <= 21; i++) {
          const p0 = prevLandmarks[i] || OPEN_LANDMARKS[i];
          const p1 = targetLandmarks[i] || OPEN_LANDMARKS[i];

          const readyPt = [
            p0[0] * 0.70 + p1[0] * 0.30,
            p0[1] * 0.70 + p1[1] * 0.30,
          ];

          const basePt = [
            readyPt[0] + (p1[0] - readyPt[0]) * blend,
            readyPt[1] + (p1[1] - readyPt[1]) * blend,
          ];

          pts.push(evaluateLandmark(basePt, i, currentPoseName, now, elapsed, blend));
        }
      }

      // Update SVG Landmark Circles (direct DOM mutation)
      pts.forEach(([x, y], i) => {
        const c = circleRefs.current[i];
        if (c) {
          c.setAttribute('cx', (x * 100).toFixed(2));
          c.setAttribute('cy', (y * 100).toFixed(2));
        }
      });

      // Update SVG Bone Lines (direct DOM mutation)
      activeBones.forEach(([a, b], i) => {
        const l = lineRefs.current[i];
        if (l && pts[a] && pts[b]) {
          l.setAttribute('x1', (pts[a][0] * 100).toFixed(2));
          l.setAttribute('y1', (pts[a][1] * 100).toFixed(2));
          l.setAttribute('x2', (pts[b][0] * 100).toFixed(2));
          l.setAttribute('y2', (pts[b][1] * 100).toFixed(2));
        }
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loop, interval, word, hand, syncRef]);

  const isHand2 = hand === 'non-dominant';
  const lineGradId = isHand2 ? 'hand-line-h2' : 'hand-line-h1';
  const dotGradId = isHand2 ? 'hand-dot-h2' : 'hand-dot-h1';

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={`ASL sign language hand gesture: ${word || pose}`}
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      <defs>
        <radialGradient id="hand-glow-h1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.25" />
          <stop offset="45%" stopColor="#8B5CF6" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hand-glow-h2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E879F9" stopOpacity="0.25" />
          <stop offset="45%" stopColor="#DB2777" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#DB2777" stopOpacity="0" />
        </radialGradient>
        {isHand2 ? (
          <>
            <linearGradient id={lineGradId} gradientUnits="userSpaceOnUse" x1="20" y1="20" x2="90" y2="90">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#F472B6" />
            </linearGradient>
            <radialGradient id={dotGradId}>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#E879F9" />
              <stop offset="100%" stopColor="#DB2777" />
            </radialGradient>
          </>
        ) : (
          <>
            <linearGradient id={lineGradId} gradientUnits="userSpaceOnUse" x1="20" y1="20" x2="90" y2="90">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <radialGradient id={dotGradId}>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#7C3AED" />
            </radialGradient>
          </>
        )}
      </defs>
      {glow && (
        <ellipse
          cx="50"
          cy="50"
          rx="44"
          ry="44"
          fill={isHand2 ? 'url(#hand-glow-h2)' : 'url(#hand-glow-h1)'}
        />
      )}
      <g>
        {activeBones.map(([a, b], i) => (
          <line
            key={`b-${a}-${b}`}
            ref={(el) => (lineRefs.current[i] = el)}
            x1={(initialPoints[a][0] * 100).toFixed(2)}
            y1={(initialPoints[a][1] * 100).toFixed(2)}
            x2={(initialPoints[b][0] * 100).toFixed(2)}
            y2={(initialPoints[b][1] * 100).toFixed(2)}
            stroke={`url(#${lineGradId})`}
            strokeWidth={isHand2 ? '1.3' : '1.4'}
            strokeLinecap="round"
            opacity={isHand2 ? '0.80' : '0.85'}
            shapeRendering="geometricPrecision"
          />
        ))}
      </g>
      <g>
        {Array.from({ length: initialPoints.length }, (_, i) => (
          <circle
            key={`pt-${i}`}
            ref={(el) => (circleRefs.current[i] = el)}
            cx={(initialPoints[i][0] * 100).toFixed(2)}
            cy={(initialPoints[i][1] * 100).toFixed(2)}
            r={i === 0 ? 2.4 : 2.0}
            fill={`url(#${dotGradId})`}
            stroke="#0B0F19"
            strokeWidth="0.6"
            shapeRendering="geometricPrecision"
          />
        ))}
      </g>
    </svg>
  );
}

// Two-handed sign component: Renders 2 synchronized HandSkeletons inside the same card
export function TwoHandWordSign({
  word,
  className = 'h-full w-full',
  glow = true,
}) {
  const syncRef = useRef({});

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Non-dominant hand mounts first to register syncRef listener */}
      <HandSkeleton
        word={word}
        hand="non-dominant"
        syncRef={syncRef}
        className="absolute inset-0 h-full w-full"
        glow={false}
      />
      {/* Dominant hand drives the single shared rAF loop */}
      <HandSkeleton
        word={word}
        hand="dominant"
        syncRef={syncRef}
        className="absolute inset-0 h-full w-full"
        glow={glow}
      />
    </div>
  );
}
