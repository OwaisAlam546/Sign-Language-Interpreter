// Premium animated cursor — FIXED version.
// Root cause of the "cursor doesn't follow / invisible" bug:
// the previous version captured dotRef.current / ringRef.current ONCE at
// effect start, but the elements don't exist yet at that point (the component
// renders null until `enabled` flips true). The handlers kept null references,
// so the cursor stayed frozen at the top-left corner while `has-cursor` CSS
// hid the native arrow → no visible cursor at all.
// Fix: read the refs dynamically inside the mousemove handler and rAF loop,
// so they're picked up as soon as the elements mount.
import { useEffect, useRef, useState } from 'react';

export default function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return; // touch/headless -> native cursor
    document.documentElement.classList.add('has-cursor');
    setEnabled(true);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let hover = false;
    let rafId;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      // read refs at event time — elements are mounted by now
      const dot = dotRef.current;
      if (dot) dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      const target = e.target instanceof Element ? e.target : null;
      hover = !!(target && target.closest('a,button,[role="button"],input,textarea,select,summary'));
    };

    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      const ring = ringRef.current;
      if (ring) {
        const size = hover ? 58 : 38;
        ring.style.width = `${size}px`;
        ring.style.height = `${size}px`;
        ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      }
      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove);
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
      document.documentElement.classList.remove('has-cursor');
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      {/* dot — solid bright cyan + glow so it's always visible on dark bg */}
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[100] h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.95)] ring-2 ring-ink-950/80"
      />
      {/* ring — trailing glow ring, expands over interactive elements */}
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[99] h-[38px] w-[38px] rounded-full border border-cyan-300/80 mix-blend-difference transition-[width,height] duration-200 ease-out"
      />
    </>
  );
}

// CSS to hide the native cursor only when the JS cursor is active:
//   html.has-cursor, html.has-cursor * { cursor: none !important; }
