// ARCHITECTURE — animated layered flow diagram. A vertical stack whose spine
// draws on scroll while pulse signals travel down the pipeline.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import { ARCH_STEPS } from '../lib/data.js';

gsap.registerPlugin(ScrollTrigger);

function Layer({ step, i, total }) {
  return (
    <Reveal delay={i * 0.05}>
      <div className="relative z-10 flex items-center gap-4">
        <div className={`h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br ${step.color} p-[2px] shadow-lg`}>
          <div className="grid h-full w-full place-items-center rounded-[14px] bg-ink-900">
            <span className="font-mono text-lg font-bold text-white">{String(i + 1).padStart(2, '0')}</span>
          </div>
        </div>
        <div className="glass sheen flex-1 rounded-2xl px-5 py-4 transition-all duration-500 hover:border-cyan-400/30 hover:shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-lg font-semibold text-white">{step.label}</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-widest text-slate-500 sm:block">{step.sub}</span>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function Architecture() {
  const spineRef = useRef(null);

  useEffect(() => {
    const spine = spineRef.current;
    if (!spine) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: spine, start: 'top 75%', end: 'bottom 50%', scrub: 0.5 },
    });
    tl.fromTo(spine, { scaleY: 0 }, { scaleY: 1, duration: 1, ease: 'none' });
    return () => tl.scrollTrigger?.kill();
  }, []);

  return (
    <section id="architecture" className="relative z-10 px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          eyebrow="Architecture"
          title="From Frame to Voice"
          sub="A clean, layered pipeline — every module has one responsibility, and data flows in one direction."
        />

        <div className="relative">
          {/* spine track + animated fill + travelling pulses */}
          <div className="absolute bottom-8 left-7 top-8 w-px bg-white/8" aria-hidden="true" />
          <div ref={spineRef} className="absolute bottom-8 left-7 top-8 w-px origin-top bg-gradient-to-b from-cyan-400 via-violet-400 to-rose-400 shadow-glow" aria-hidden="true" />
          <div className="absolute bottom-8 left-7 top-8 w-px" aria-hidden="true">
            <span className="absolute left-[-1px] h-[38%] w-[3px] rounded-full bg-gradient-to-b from-transparent via-cyan-300 to-transparent" style={{ animation: 'pulseDown 2.6s linear infinite' }} />
          </div>

          <div className="space-y-4 pl-16 md:pl-20">
            {ARCH_STEPS.map((s, i) => (
              <div key={s.label} className="relative">
                <Layer step={s} i={i} total={ARCH_STEPS.length} />
                {i < ARCH_STEPS.length - 1 && (
                  <div className="flex justify-center py-1" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-cyan-400/70">
                      <path d="M12 5v14m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* data loop note */}
          <Reveal delay={0.2}>
            <div className="glass mt-8 flex items-center gap-3 rounded-2xl px-5 py-4">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-cyan-400" />
              </span>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Full duplex loop — new frames keep the pipeline continuously fed at 30 FPS
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
