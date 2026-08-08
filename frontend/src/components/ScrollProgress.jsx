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
        className="fixed left-0 top-0 z-[95] h-[2.5px] w-full origin-left scale-x-0 bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-500"
        ref={barRef} />
      <div aria-hidden="true"
        className="glass-deep fixed bottom-6 right-6 z-[95] hidden items-center gap-1 rounded-full px-3.5 py-1.5 font-mono text-[11px] tracking-widest text-cyan-200/90 md:flex">
        <span className="tabular-nums">{pct}</span><span className="text-slate-500">/100</span>
      </div>
    </>
  );
}
