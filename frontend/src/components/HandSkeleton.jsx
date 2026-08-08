// MediaPipe-style 21-landmark hand skeleton that actually SIGNS letters.
// Poses are defined as per-finger curl (0..1) + thumb spread; landmarks are
// interpolated open-palm -> folded-palm and re-rendered per frame via rAF.
import { useEffect, useRef } from 'react';

// Base landmark layout — open palm facing camera (normalized 0..1, y down).
const BASE = {
  // finger: [mcp, pip, dip, tip]
  thumb: [
    [0.36, 0.74], // 1 CMC
    [0.24, 0.66], // 2 MCP
    [0.175, 0.545], // 3 IP
    [0.155, 0.42], // 4 TIP
  ],
  index: [
    [0.55, 0.6], [0.585, 0.435], [0.6, 0.31], [0.615, 0.21],
  ],
  middle: [
    [0.675, 0.585], [0.705, 0.4], [0.72, 0.27], [0.735, 0.165],
  ],
  ring: [
    [0.795, 0.6], [0.825, 0.44], [0.84, 0.32], [0.855, 0.245],
  ],
  pinky: [
    [0.9, 0.655], [0.925, 0.53], [0.935, 0.43], [0.945, 0.365],
  ],
};
const WRIST = [0.5, 0.845];

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];

// Fold centers (inside the palm) per finger — fingertips fold toward these.
const FOLD = {
  thumb: [0.3, 0.62],
  index: [0.55, 0.66],
  middle: [0.67, 0.65],
  ring: [0.79, 0.67],
  pinky: [0.88, 0.72],
};

// Pose = { curl: [thumb, index, middle, ring, pinky] 0..1, spread: thumb out 0..1, rot: degrees }
export const POSES = {
  A: { curl: [0.55, 1, 1, 1, 1], spread: 0.25 },
  B: { curl: [0.75, 0, 0, 0, 0], spread: 0 },
  C: { curl: [0.5, 0.45, 0.45, 0.45, 0.5], spread: 0.15 },
  E: { curl: [0.2, 1, 1, 1, 1], spread: 0.15 },
  F: { curl: [0.8, 0.65, 0.1, 0.1, 0.1], spread: 0 },
  I: { curl: [0.5, 1, 1, 1, 0], spread: 0.25 },
  L: { curl: [0, 0, 1, 1, 1], spread: 0.55 },
  Y: { curl: [0, 1, 1, 1, 0], spread: 0.65 },
  V: { curl: [0.35, 0, 0, 1, 1], spread: 0.15 },
  W: { curl: [0.35, 0, 0, 0, 1], spread: 0.1 },
  OK: { curl: [0.7, 0.75, 0, 0, 0], spread: 0.1 },
  OPEN: { curl: [0.3, 0, 0, 0, 0], spread: 0.2 },
  FIST: { curl: [0.6, 1, 1, 1, 1], spread: 0.1 },
  PEACE: { curl: [0.3, 0, 0, 1, 1], spread: 0.15 },
  THUMBS: { curl: [0, 1, 1, 1, 1], spread: 0.75 },
};

// Lines between landmark indices (MediaPipe connection topology, simplified).
const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb chain
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // pinky base to wrist
];

// landmark index -> finger + joint offset (0=base ... tip)
const INDEX_MAP = [
  [null, -1], // 0 wrist
  ['thumb', 0], ['thumb', 1], ['thumb', 2], ['thumb', 3],
  ['index', 0], ['index', 1], ['index', 2], ['index', 3],
  ['middle', 0], ['middle', 1], ['middle', 2], ['middle', 3],
  ['ring', 0], ['ring', 1], ['ring', 2], ['ring', 3],
  ['pinky', 0], ['pinky', 1], ['pinky', 2], ['pinky', 3],
];

function landmarkPos(i, pose) {
  const [finger, joint] = INDEX_MAP[i];
  if (finger === null) return [...WRIST];

  const base = BASE[finger][joint];
  const curl = pose.curl[FINGERS.indexOf(finger)];
  const [foldX, foldY] = FOLD[finger];

  // weight: MCP stays, PIP folds a bit, DIP folds more, tip folds fully
  const weight = [0, 0.45, 0.75, 1][joint];
  let x = base[0] + (foldX - base[0]) * curl * weight;
  let y = base[1] + (foldY - base[1]) * curl * weight;

  // thumb spread — rotate the whole thumb outward around the CMC
  if (finger === 'thumb' && pose.spread) {
    const cmc = BASE.thumb[0];
    const dx = x - cmc[0];
    const dy = y - cmc[1];
    const ang = pose.spread * 0.9;
    x = cmc[0] + dx * Math.cos(ang) - dy * Math.sin(ang) * 0.7;
    y = cmc[1] + dx * Math.sin(ang) * 0.55 + dy * Math.cos(ang);
  }

  return [x, y];
}

export default function HandSkeleton({ pose = 'OPEN', auto = null, interval = 1600, className = '', glow = true }) {
  const circleRefs = useRef([]);
  const lineRefs = useRef([]);
  const poseRef = useRef(POSES[pose] || POSES.OPEN);
  const current = useRef(Array.from({ length: 21 }, (_, i) => landmarkPos(i, POSES.OPEN)));

  useEffect(() => {
    if (!auto) return;
    let idx = 0;
    const timer = setInterval(() => {
      idx = (idx + 1) % auto.length;
      poseRef.current = POSES[auto[idx]] || POSES.OPEN;
    }, interval);
    return () => clearInterval(timer);
  }, [auto, interval]);

  useEffect(() => {
    if (!auto) poseRef.current = POSES[pose] || POSES.OPEN;
  }, [pose, auto]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf;
    const tick = () => {
      const target = poseRef.current;
      const next = current.current.map((p, i) => {
        const t = landmarkPos(i, target);
        return [p[0] + (t[0] - p[0]) * (reduce ? 1 : 0.14), p[1] + (t[1] - p[1]) * (reduce ? 1 : 0.14)];
      });
      current.current = next;
      next.forEach(([x, y], i) => {
        const c = circleRefs.current[i];
        if (c) { c.setAttribute('cx', (x * 100).toFixed(2)); c.setAttribute('cy', (y * 100).toFixed(2)); }
      });
      BONES.forEach(([a, b], i) => {
        const l = lineRefs.current[i];
        if (l) {
          l.setAttribute('x1', (next[a][0] * 100).toFixed(2));
          l.setAttribute('y1', (next[a][1] * 100).toFixed(2));
          l.setAttribute('x2', (next[b][0] * 100).toFixed(2));
          l.setAttribute('y2', (next[b][1] * 100).toFixed(2));
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`Sign language hand gesture: ${pose}`}>
      <defs>
        <linearGradient id="hand-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <radialGradient id="hand-dot">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#7C3AED" />
        </radialGradient>
      </defs>
      {glow && (
        <ellipse cx="50" cy="50" rx="40" ry="40" fill="url(#hand-dot)" opacity="0.07" style={{ filter: 'blur(18px)' }} />
      )}
      <g>
        {BONES.map(([a, b], i) => (
          <line
            key={`l${i}`}
            ref={(el) => (lineRefs.current[i] = el)}
            x1="0" y1="0" x2="0" y2="0"
            stroke="url(#hand-line)"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.75"
          />
        ))}
      </g>
      <g>
        {Array.from({ length: 21 }, (_, i) => (
          <circle
            key={`c${i}`}
            ref={(el) => (circleRefs.current[i] = el)}
            cx="0" cy="0" r={i === 0 ? 2.4 : 2.0}
            fill="url(#hand-dot)"
            stroke="#0B0F19"
            strokeWidth="0.6"
          />
        ))}
      </g>
    </svg>
  );
}
