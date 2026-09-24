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
    let w = 0;
    let h = 0;

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

    // Keep existing static float on touch/mobile devices
    const isTouch =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        window.matchMedia('(pointer: coarse)').matches);

    let hasMouse = false;
    let lastMoveTime = 0;
    let stillness = 0;
    const targetMouse = { x: (w || window.innerWidth) / 2, y: (h || window.innerHeight) / 2 };
    const smoothMouse = { x: targetMouse.x, y: targetMouse.y };
    let shiftX = 0;
    let shiftY = 0;

    const onMouseMove = (e) => {
      hasMouse = true;
      lastMoveTime = performance.now();
      targetMouse.x = e.clientX;
      targetMouse.y = e.clientY;
    };

    const onMouseLeave = () => {
      hasMouse = false;
      targetMouse.x = w / 2;
      targetMouse.y = h / 2;
    };

    if (!isTouch) {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      document.addEventListener('mouseleave', onMouseLeave);
    }

    const COUNT = 46;
    const pts = Array.from({ length: COUNT }, () => ({
      x: Math.random() * (w || 1),
      y: Math.random() * (h || 1),
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.6 + 0.4,
      hue: Math.random() > 0.5 ? '56,189,248' : '139,92,246',
      pullX: 0,
      pullY: 0,
      rx: 0,
      ry: 0,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      const now = performance.now();
      const isStill = hasMouse && now - lastMoveTime > 110;
      if (isStill) {
        // Smoothly ramp up stillness when mouse stops moving
        stillness += (1 - stillness) * 0.04;
      } else {
        // Rapidly but smoothly ease back down when mouse moves or leaves
        stillness += (0 - stillness) * 0.12;
      }

      // Ultra-smooth cursor interpolation & gentle constellation lag
      if (!isTouch && hasMouse) {
        smoothMouse.x += (targetMouse.x - smoothMouse.x) * 0.035;
        smoothMouse.y += (targetMouse.y - smoothMouse.y) * 0.035;
        const targetShiftX = (smoothMouse.x - w / 2) * 0.045;
        const targetShiftY = (smoothMouse.y - h / 2) * 0.045;
        shiftX += (targetShiftX - shiftX) * 0.03;
        shiftY += (targetShiftY - shiftY) * 0.03;
      } else {
        shiftX += (0 - shiftX) * 0.025;
        shiftY += (0 - shiftY) * 0.025;
      }

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // Subtle dynamic attraction: smoothly amplifies and pulls dots closer when cursor is still
        if (!isTouch && hasMouse) {
          const dx = smoothMouse.x - (p.x + shiftX);
          const dy = smoothMouse.y - (p.y + shiftY);
          const dist = Math.hypot(dx, dy);
          let targetPullX = 0;
          let targetPullY = 0;

          const pullRadius = 320 + 130 * stillness;
          const maxPull = 26 + 68 * stillness;

          if (dist < pullRadius && dist > 1) {
            const influence = Math.pow(1 - dist / pullRadius, 1.3) * maxPull;
            targetPullX = (dx / dist) * influence;
            targetPullY = (dy / dist) * influence;
          }
          p.pullX += (targetPullX - p.pullX) * 0.035;
          p.pullY += (targetPullY - p.pullY) * 0.035;
        } else {
          p.pullX += (0 - p.pullX) * 0.025;
          p.pullY += (0 - p.pullY) * 0.025;
        }

        p.rx = p.x + shiftX + p.pullX;
        p.ry = p.y + shiftY + p.pullY;

        ctx.beginPath();
        ctx.arc(p.rx, p.ry, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hue},0.5)`;
        ctx.fill();

        // When cursor is still and static, draw subtle soft connection lines to the cursor
        if (!isTouch && stillness > 0.05) {
          const distToCursor = Math.hypot(p.rx - smoothMouse.x, p.ry - smoothMouse.y);
          if (distToCursor < 145) {
            ctx.beginPath();
            ctx.moveTo(p.rx, p.ry);
            ctx.lineTo(smoothMouse.x, smoothMouse.y);
            ctx.strokeStyle = `rgba(56,189,248,${(1 - distToCursor / 145) * 0.20 * stillness})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < pts.length; i++) {
        const pi = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const pj = pts[j];
          const dx = pi.rx - pj.rx;
          const dy = pi.ry - pj.ry;
          const d = Math.hypot(dx, dy);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(pi.rx, pi.ry);
            ctx.lineTo(pj.rx, pj.ry);
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
      if (!isTouch) {
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseleave', onMouseLeave);
      }
    };
  }, []);

  return <canvas ref={ref} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden="true" />;
}

export default function Background() {
  const orbsRef = useRef(null);

  useEffect(() => {
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!orbsRef.current) return;
        const scrollY = window.scrollY || 0;
        orbsRef.current.style.transform = `translate3d(0, ${-scrollY * 0.14}px, 0)`;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* base mesh */}
      <div className="absolute inset-0 bg-mesh opacity-90" />

      {/* drifting luminous gradient orbs with scroll parallax */}
      <div ref={orbsRef} className="absolute inset-0 will-change-transform">
        {/* Top cyan/sky aura */}
        <div className="absolute -left-[10%] top-[-8%] h-[50vw] w-[50vw] rounded-full bg-cyan-400/22 blur-[120px] animate-orb" />
        {/* Mid-right electric violet */}
        <div className="absolute right-[-10%] top-[20%] h-[46vw] w-[46vw] rounded-full bg-violet-600/24 blur-[130px] animate-orb [animation-delay:-5s]" />
        {/* Mid-left cyber fuchsia accent */}
        <div className="absolute -left-[5%] top-[55%] h-[38vw] w-[38vw] rounded-full bg-fuchsia-500/16 blur-[130px] animate-orb [animation-delay:-9s]" />
        {/* Bottom cyan/teal foundation */}
        <div className="absolute bottom-[-15%] left-[25%] h-[50vw] w-[50vw] rounded-full bg-teal-400/18 blur-[140px] animate-orb [animation-delay:-14s]" />
        {/* Deep electric indigo base */}
        <div className="absolute right-[5%] bottom-[10%] h-[42vw] w-[42vw] rounded-full bg-indigo-600/20 blur-[130px] animate-orb [animation-delay:-3s]" />
      </div>

      {/* neural grid */}
      <div className="ai-grid absolute inset-0 animate-grid-pan opacity-70" />

      {/* particle field */}
      <Particles />

      {/* horizon glow bands */}
      <div className="absolute bottom-0 left-1/2 h-px w-[120%] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
      <div className="absolute top-0 left-1/2 h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />

      {/* floating geometric shapes */}
      <div className="absolute left-[8%] top-[64%] hidden h-16 w-16 rotate-12 rounded-2xl border border-cyan-400/30 animate-float-slow lg:block shadow-[0_0_20px_rgba(34,211,238,0.15)]" />
      <div className="absolute right-[10%] top-[16%] hidden h-10 w-10 -rotate-6 rounded-full border border-violet-400/35 animate-float lg:block shadow-[0_0_20px_rgba(139,92,246,0.18)]" />
      <div className="absolute left-[45%] top-[8%] hidden h-5 w-5 rounded-full bg-cyan-400/25 blur-[1px] animate-float-slow lg:block" />
      <div className="absolute right-[22%] bottom-[22%] hidden h-8 w-8 rotate-45 rounded-md border border-sky-400/25 animate-float lg:block [animation-delay:-3s]" />

      {/* subtle vignette that preserves bright frosted refractions */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(11,15,25,0.65)_100%)]" />
    </div>
  );
}
