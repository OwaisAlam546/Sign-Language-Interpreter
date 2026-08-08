// ─────────────────────────────────────────────────────────────
//  lib/handTopology.js — MediaPipe hand topology + palette
//  Mirrors the backend contract (services/pipeline.py): the 21
//  landmarks and the exact 21-pair connection list the browser
//  draws, so both ends render the same skeleton.
//  ─────────────────────────────────────────────────────────────

// Official MediaPipe hand connections (index pairs into 21 landmarks).
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm seam
];

// Per-hand accent (hand 0 cyan, hand 1 violet) — same language as
// the rest of the UI (cyan sky-400 → violet-500 gradient).
export const HAND_COLORS = ['#22D3EE', '#C084FC'];

// Gesture → letter/word used by the live transcription panel.
export const GESTURE_LETTER = {
  A: 'A', B: 'B', D: 'D', PEACE: 'V', THREE: '3', FOUR: '4',
  L: 'L', O: 'O', THUMBS_UP: 'U',
};