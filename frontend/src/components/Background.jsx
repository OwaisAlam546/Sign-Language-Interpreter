// Full-page animated AI background: gradient orbs, neural grid, particles,
// floating geometric shapes and connecting lines. Pure CSS/canvas, no assets.
import { useEffect, useRef } from 'react';

function Particles({ className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf;
    let w, h;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 46;
    const pts = Array.from({ length: COUNT }, () => ({
      x: Math.random() * (w || 1),
      y: Math.random() * (h || 1),
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.6 + 0.4,
      hue: Math.random() > 0.5 ? '56,189,248' : '139,92,246',
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hue},0.5)`;
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(56,189,248,${(1 - d / 130) * 0.14})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden="true" />;
}

export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* base mesh */}
      <div className="absolute inset-0 bg-mesh" />

      {/* drifting gradient orbs */}
      <div className="absolute -left-[15%] top-[-10%] h-[46vw] w-[46vw] rounded-full bg-sky-500/14 blur-[130px] animate-orb" />
      <div className="absolute right-[-12%] top-[22%] h-[40vw] w-[40vw] rounded-full bg-violet-600/14 blur-[130px] animate-orb [animation-delay:-6s]" />
      <div className="absolute bottom-[-18%] left-[28%] h-[44vw] w-[44vw] rounded-full bg-cyan-400/10 blur-[140px] animate-orb [animation-delay:-12s]" />

      {/* neural grid */}
      <div className="ai-grid absolute inset-0 animate-grid-pan" />

      {/* particle field */}
      <Particles />

      {/* horizon glow bands */}
      <div className="absolute bottom-0 left-1/2 h-px w-[120%] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      <div className="absolute top-0 left-1/2 h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-400/25 to-transparent" />

      {/* floating geometric shapes */}
      <div className="absolute left-[8%] top-[64%] hidden h-16 w-16 rotate-12 rounded-2xl border border-cyan-400/20 animate-float-slow lg:block" />
      <div className="absolute right-[10%] top-[16%] hidden h-10 w-10 -rotate-6 rounded-full border border-violet-400/25 animate-float lg:block" />
      <div className="absolute left-[45%] top-[8%] hidden h-5 w-5 rounded-full bg-cyan-400/15 blur-[2px] animate-float-slow lg:block" />
      <div className="absolute right-[22%] bottom-[22%] hidden h-8 w-8 rotate-45 rounded-md border border-sky-400/20 animate-float lg:block [animation-delay:-3s]" />

      {/* vignette to seat content on top */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(11,15,25,0.72)_100%)]" />
    </div>
  );
}
