// Full-page glowing connected neural background:
// Cursor-following particle constellation with continuous luminous glow,
// independent node pulsing, and seamless Dark/Light theme switching.
import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

function Particles({ className = '', isDark = true }) {
  const ref = useRef(null);
  const themeRef = useRef(isDark);

  useEffect(() => {
    themeRef.current = isDark;
  }, [isDark]);

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

    const COUNT = 52;
    const pts = Array.from({ length: COUNT }, (_, i) => ({
      x: Math.random() * (w || 1),
      y: Math.random() * (h || 1),
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      baseR: Math.random() * 1.5 + 1.2,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.8 + 0.6,
      isCyan: i % 3 !== 0, // 2/3 Ice Cyan, 1/3 Electric Blue
      pullX: 0,
      pullY: 0,
      rx: 0,
      ry: 0,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const now = performance.now();
      const currentDark = themeRef.current;

      const isStill = hasMouse && now - lastMoveTime > 120;
      if (isStill) {
        stillness += (1 - stillness) * 0.04;
      } else {
        stillness += (0 - stillness) * 0.12;
      }

      // Smooth cursor interpolation
      if (!isTouch && hasMouse) {
        smoothMouse.x += (targetMouse.x - smoothMouse.x) * 0.04;
        smoothMouse.y += (targetMouse.y - smoothMouse.y) * 0.04;
        const targetShiftX = (smoothMouse.x - w / 2) * 0.04;
        const targetShiftY = (smoothMouse.y - h / 2) * 0.04;
        shiftX += (targetShiftX - shiftX) * 0.03;
        shiftY += (targetShiftY - shiftY) * 0.03;
      } else {
        shiftX += (0 - shiftX) * 0.025;
        shiftY += (0 - shiftY) * 0.025;
      }

      // Update and draw nodes
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // Dynamic attraction to cursor
        let distToCursor = 9999;
        if (!isTouch && hasMouse) {
          const dx = smoothMouse.x - (p.x + shiftX);
          const dy = smoothMouse.y - (p.y + shiftY);
          distToCursor = Math.hypot(dx, dy);
          let targetPullX = 0;
          let targetPullY = 0;

          const pullRadius = 300 + 120 * stillness;
          const maxPull = 28 + 65 * stillness;

          if (distToCursor < pullRadius && distToCursor > 1) {
            const influence = Math.pow(1 - distToCursor / pullRadius, 1.25) * maxPull;
            targetPullX = (dx / distToCursor) * influence;
            targetPullY = (dy / distToCursor) * influence;
          }
          p.pullX += (targetPullX - p.pullX) * 0.038;
          p.pullY += (targetPullY - p.pullY) * 0.038;
        } else {
          p.pullX += (0 - p.pullX) * 0.025;
          p.pullY += (0 - p.pullY) * 0.025;
        }

        p.rx = p.x + shiftX + p.pullX;
        p.ry = p.y + shiftY + p.pullY;

        // Subtle independent node pulsing
        const pulse = Math.sin(now * 0.0016 * p.pulseSpeed + p.pulsePhase);
        const nodeR = p.baseR + pulse * 0.45;
        const prox = Math.max(0, 1 - distToCursor / 190);

        ctx.beginPath();
        ctx.arc(p.rx, p.ry, nodeR + prox * 0.7, 0, Math.PI * 2);

        if (currentDark) {
          // Dark Mode: Continuous glowing Ice Cyan and Electric Blue nodes with high contrast against #05080D
          if (p.isCyan) {
            ctx.fillStyle = `rgba(0, 217, 255, ${0.94 + pulse * 0.06})`;
            ctx.shadowColor = 'rgba(0, 217, 255, 0.95)';
          } else {
            ctx.fillStyle = `rgba(22, 139, 255, ${0.94 + pulse * 0.06})`;
            ctx.shadowColor = 'rgba(22, 139, 255, 0.90)';
          }
          ctx.shadowBlur = 10 + pulse * 5 + prox * 8;
        } else {
          // Light Mode: Option B - Deep cyan/teal (#087F9B) & Electric Blue (#168BFF)
          if (p.isCyan) {
            ctx.fillStyle = `rgba(8, 127, 155, ${0.88 + pulse * 0.12})`;
            ctx.shadowColor = 'rgba(8, 127, 155, 0.35)';
          } else {
            ctx.fillStyle = `rgba(22, 139, 255, ${0.88 + pulse * 0.12})`;
            ctx.shadowColor = 'rgba(22, 139, 255, 0.30)';
          }
          ctx.shadowBlur = 4 + prox * 4;
        }

        ctx.fill();

        // Luminous cool-white inner core for bright node radiance on #05080D
        if (currentDark) {
          ctx.beginPath();
          ctx.arc(p.rx, p.ry, Math.max(0.70, nodeR * 0.44), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(234, 246, 250, 0.96)';
          ctx.fill();
        }

        ctx.shadowBlur = 0;

        // Connected line to cursor when close (with soft outer halo)
        if (!isTouch && hasMouse && distToCursor < 165) {
          const cursorLineAlpha = (1 - distToCursor / 165) * (currentDark ? 0.50 : 0.28);

          if (currentDark) {
            // Subtle soft outer glow
            ctx.beginPath();
            ctx.moveTo(p.rx, p.ry);
            ctx.lineTo(smoothMouse.x, smoothMouse.y);
            ctx.strokeStyle = `rgba(0, 217, 255, ${cursorLineAlpha * 0.28})`;
            ctx.lineWidth = 2.6;
            ctx.stroke();
          }

          // Luminous core line
          ctx.beginPath();
          ctx.moveTo(p.rx, p.ry);
          ctx.lineTo(smoothMouse.x, smoothMouse.y);
          ctx.strokeStyle = currentDark
            ? `rgba(0, 217, 255, ${cursorLineAlpha})`
            : `rgba(8, 127, 155, ${cursorLineAlpha})`;
          ctx.lineWidth = currentDark ? 0.9 : 0.7;
          ctx.stroke();
        }
      }

      // Inter-particle connecting lines (continuous neural network with soft cyan glow)
      for (let i = 0; i < pts.length; i++) {
        const pi = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const pj = pts[j];
          const dx = pi.rx - pj.rx;
          const dy = pi.ry - pj.ry;
          const d = Math.hypot(dx, dy);

          if (d < 135) {
            let lineProx = 0;
            if (!isTouch && hasMouse) {
              const mx = (pi.rx + pj.rx) / 2;
              const my = (pi.ry + pj.ry) / 2;
              const dCursor = Math.hypot(mx - smoothMouse.x, my - smoothMouse.y);
              lineProx = Math.max(0, 1 - dCursor / 180);
            }

            const distRatio = 1 - d / 135;

            if (currentDark) {
              const baseAlpha = distRatio * (0.24 + lineProx * 0.36);

              // 1. Subtle soft cyan outer glow pass
              ctx.beginPath();
              ctx.moveTo(pi.rx, pi.ry);
              ctx.lineTo(pj.rx, pj.ry);
              ctx.strokeStyle = `rgba(0, 217, 255, ${baseAlpha * 0.26})`;
              ctx.lineWidth = 2.4 + lineProx * 1.6;
              ctx.stroke();

              // 2. Crisp, clearly visible luminous cyan core pass
              ctx.beginPath();
              ctx.moveTo(pi.rx, pi.ry);
              ctx.lineTo(pj.rx, pj.ry);
              ctx.strokeStyle = `rgba(0, 217, 255, ${baseAlpha})`;
              ctx.lineWidth = 0.85 + lineProx * 0.55;
              ctx.stroke();
            } else {
              const alpha = distRatio * (0.16 + lineProx * 0.22);
              ctx.beginPath();
              ctx.moveTo(pi.rx, pi.ry);
              ctx.lineTo(pj.rx, pj.ry);
              ctx.strokeStyle = `rgba(8, 127, 155, ${alpha})`;
              ctx.lineWidth = 0.75 + lineProx * 0.40;
              ctx.stroke();
            }
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
  const { isDark } = useTheme();
  const orbsRef = useRef(null);

  useEffect(() => {
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!orbsRef.current) return;
        const scrollY = window.scrollY || 0;
        orbsRef.current.style.transform = `translate3d(0, ${-scrollY * 0.10}px, 0)`;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden transition-colors duration-500 ${
        isDark ? 'bg-[#05080D]' : 'bg-[#F5F7FA]'
      }`}
      aria-hidden="true"
    >
      {/* Background base mesh & subtle controlled depth - #05080D in dark, #F5F7FA in light */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 65% 45% at 50% 18%, rgba(0, 217, 255, 0.045) 0%, rgba(8, 21, 34, 0.16) 35%, rgba(5, 8, 13, 0.95) 65%, #05080D 100%)'
            : 'radial-gradient(ellipse 70% 50% at 50% 15%, rgba(230, 235, 241, 0.55) 0%, rgba(237, 241, 245, 0.85) 45%, #F5F7FA 100%)',
        }}
      />

      {/* Whisper-soft atmospheric accents with scroll parallax */}
      <div ref={orbsRef} className="absolute inset-0 will-change-transform">
        {/* Top subtle cyan accent */}
        <div
          className={`absolute -left-[5%] top-[-5%] h-[28vw] w-[28vw] rounded-full blur-[120px] animate-orb transition-colors duration-700 ${
            isDark ? 'bg-[#00D9FF]/[0.035]' : 'bg-[#087F9B]/[0.025]'
          }`}
        />
        {/* Mid-right faint Electric Blue accent */}
        <div
          className={`absolute right-[-5%] top-[25%] h-[24vw] w-[24vw] rounded-full blur-[120px] animate-orb [animation-delay:-5s] transition-colors duration-700 ${
            isDark ? 'bg-[#168BFF]/[0.025]' : 'bg-[#168BFF]/[0.02]'
          }`}
        />
        {/* Bottom subtle cyan foundation */}
        <div
          className={`absolute bottom-[-10%] left-[20%] h-[26vw] w-[26vw] rounded-full blur-[130px] animate-orb [animation-delay:-14s] transition-colors duration-700 ${
            isDark ? 'bg-[#00D9FF]/[0.02]' : 'bg-[#087F9B]/[0.015]'
          }`}
        />
      </div>

      {/* Animated neural grid - subtle non-intrusive technical overlay */}
      <div className="ai-grid absolute inset-0 animate-grid-pan opacity-25" />

      {/* Interactive Continuously Glowing Neural Particle Constellation Canvas */}
      <Particles isDark={isDark} />

      {/* Horizon delicate accent lines */}
      <div
        className={`absolute bottom-0 left-1/2 h-px w-[120%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--accent-cyan)]/15 to-transparent transition-colors duration-500`}
      />
      <div
        className={`absolute top-0 left-1/2 h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--border-subtle)]/40 to-transparent transition-colors duration-500`}
      />

      {/* Floating technical geometric accents */}
      <div className="absolute left-[8%] top-[64%] hidden h-16 w-16 rotate-12 rounded-2xl border border-[var(--border-subtle)]/60 animate-float-slow lg:block shadow-[0_0_12px_rgba(0,217,255,0.08)]" />
      <div className="absolute right-[10%] top-[16%] hidden h-10 w-10 -rotate-6 rounded-full border border-[var(--border-subtle)]/60 animate-float lg:block shadow-[0_0_12px_rgba(0,217,255,0.08)]" />
      <div className="absolute left-[45%] top-[8%] hidden h-4 w-4 rounded-full bg-[var(--accent-cyan)]/12 blur-[1px] animate-float-slow lg:block" />
      <div className="absolute right-[22%] bottom-[22%] hidden h-8 w-8 rotate-45 rounded-md border border-[var(--border-subtle)]/60 animate-float lg:block [animation-delay:-3s]" />

      {/* Vignette preserving depth and contrast */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, transparent 35%, rgba(5, 8, 13, 0.82) 65%, #05080D 95%)'
            : 'radial-gradient(ellipse at center, transparent 70%, rgba(237, 241, 245, 0.45) 100%)',
        }}
      />
    </div>
  );
}
