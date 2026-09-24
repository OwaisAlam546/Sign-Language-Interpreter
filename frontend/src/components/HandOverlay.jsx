// ─────────────────────────────────────────────────────────────
// components/HandOverlay.jsx — canvas renderer over the webcam
// Draws the COMPLETE MediaPipe visualization per frame:
//   • official skeleton (HAND_CONNECTIONS lines)
//   • 21 landmark points (wrist drawn slightly larger)
//   • tight bounding box per hand
//   • hand label chip: handedness · gesture · confidence%
//   • mirror-aware (scale(-1,1) canvas + swapped handedness)
// Parent calls `draw(hands)` every animation frame — no React
// state in the hot loop; the canvas is fully imperative here.
// ─────────────────────────────────────────────────────────────
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { HAND_CONNECTIONS, HAND_COLORS } from '../lib/handTopology.js';

const HandOverlay = forwardRef(function HandOverlay(
  { mirror, className = '' },
  ref,
) {
  const canvasRef = useRef(null);
  const boxRef = useRef(null); // sized to the visible video area
  const mirrorRef = useRef(mirror);
  useEffect(() => { mirrorRef.current = mirror; }, [mirror]);

  // Keep the canvas at the parent's display size × devicePixelRatio
  // once — the webcam window is a fixed aspect box, so no resize loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth: w, clientHeight: h } = box;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }, []);

  useImperativeHandle(ref, () => ({
    // hands: [{ landmarks:[{x,y,z}], handedness, score, gesture, confidence, bbox }]
    draw(hands) {
      const canvas = canvasRef.current;
      const box = boxRef.current;
      const ctx = canvas.getContext('2d');
      const w = box.clientWidth;
      const h = box.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // Smoothly fade the overlay in/out as tracking is gained/lost (PRD #13).
      canvas.style.opacity = hands.length > 0 ? '1' : '0';
      if (mirrorRef.current) {
        // mirrored canvas: landmark x maps to (w − x·w)
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }

      const labelRects = [];
      const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      hands.forEach((hand, i) => {
        const color = HAND_COLORS[i % HAND_COLORS.length];
        const lms = hand.landmarks;

        // ── skeleton (official connections) ──
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        for (const [a, b] of HAND_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(lms[a].x * w, lms[a].y * h);
          ctx.lineTo(lms[b].x * w, lms[b].y * h);
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.85;
          ctx.stroke();
        }

        // ── 21 landmark points (0 = wrist, slightly bigger) ──
        ctx.globalAlpha = 1;
        lms.forEach((p, k) => {
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, k === 0 ? 4.5 : 3, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        });

        // ── bounding box ──
        const { x, y, w: bw, h: bh } = hand.bbox;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.9;
        ctx.strokeRect(x * w, y * h, bw * w, bh * h);

        // ── label chip: name · gesture · confidence ──
        // In mirror mode the feed is flipped, so the handedness that
        // looks right to the viewer is the geometric one swapped.
        const shown =
          mirrorRef.current && (hand.name === 'Left' || hand.name === 'Right')
            ? hand.name === 'Left' ? 'Right' : 'Left'
            : hand.name;
        const label = `${shown} · ${hand.gesture}  ${(hand.confidence * 100).toFixed(0)}%`;
        ctx.font = '600 11px ui-monospace, monospace';
        const pad = 8;
        const tw = ctx.measureText(label).width;
        const chipH = 20;
        const chipW = tw + pad * 2;
        const chipX = Math.min(Math.max(x * w, 6), w - chipW - 6);
        // Prefer directly above the box, then move the chip down in its own
        // column until it no longer covers another hand's label.
        let chipY = Math.max(y * h - chipH - pad, 6);
        while (labelRects.some((rect) => overlaps({ x: chipX, y: chipY, w: chipW, h: chipH }, rect)) && chipY + chipH + 6 < h) {
          chipY += chipH + 6;
        }
        labelRects.push({ x: chipX, y: chipY, w: chipW, h: chipH });

        ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.roundRect(chipX, chipY, chipW, chipH, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#E2E8F0';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, chipX + pad, chipY + chipH / 2);
      });

      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
  }));

  return (
    <div ref={boxRef} className={`absolute inset-0 pointer-events-none ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full block transition-opacity duration-300" />
    </div>
  );
});

export default HandOverlay;
