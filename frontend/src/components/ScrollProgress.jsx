// Top scroll-progress bar + bottom-right scroll percentage pill.
import { useEffect, useRef, useState } from 'react';

export default function ScrollProgress() {
  const barRef = useRef(null);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? (window.scrollY / max) * 100 : 0;
        if (barRef.current) barRef.current.style.transform = `scaleX(${p / 100})`;
        setPct(Math.round(p));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div aria-hidden="true"
        className="fixed left-0 top-0 z-[95] h-[2.5px] w-full origin-left scale-x-0 bg-gradient-to-r from-[#00D9FF] via-[#83E8F5] to-[#168BFF] shadow-[0_0_10px_var(--glow-cyan)]"
        ref={barRef} />
      <div aria-hidden="true"
        className="glass-card fixed bottom-6 right-6 z-[95] hidden items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-1.5 font-mono text-[11px] tracking-widest text-[var(--accent-cyan)] backdrop-blur-xl shadow-lg md:flex">
        <span className="tabular-nums font-semibold">{pct}</span><span className="text-[var(--text-sub)]">/100</span>
      </div>
    </>
  );
}
