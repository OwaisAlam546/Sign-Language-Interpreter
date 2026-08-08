// SCREENSHOTS — horizontal snap carousel with fullscreen preview.
// Thumbnails are stylized UI mockups (webcam, HUD, dashboard) rendered live.
import { useState } from 'react';
import { FiX, FiMaximize2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import HandSkeleton from '../components/HandSkeleton.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import { SCREENSHOTS } from '../lib/data.js';

function MockShot({ type, big }) {
  const s = big ? 'h-64 w-64' : 'h-28 w-28';
  const r = big ? 'rounded-2xl' : 'rounded-lg';
  if (type === 'Live Translation View') {
    return (
      <div className={`${s} ${r} relative overflow-hidden bg-ink-950 ring-1 ring-white/10`}>
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-red-500/80 px-1 font-mono text-[7px] text-white">● REC</span>
        <span className="absolute right-2 top-2 rounded bg-ink-900/70 px-1 font-mono text-[7px] text-cyan-300">30 FPS</span>
        <div className="absolute inset-0 grid place-items-center"><HandSkeleton pose="OPEN" className="w-2/3" /></div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink-900/80 px-2 py-0.5 font-mono text-[7px] text-white">HELLO ▍</div>
      </div>
    );
  }
  return (
    <div className={`${s} ${r} relative overflow-hidden bg-gradient-to-br ${type === 'Gesture Recognition' ? 'from-violet-500/40 to-ink-950' : type === 'Analytics Dashboard' ? 'from-emerald-500/30 to-ink-950' : 'from-amber-500/30 to-ink-950'} ring-1 ring-white/10`}>
      <div className="relative flex h-full flex-col justify-center gap-1.5 px-3">
        {[62, 48, 72, 40, 55].map((w, i) => (
          <span key={i} className="h-1.5 rounded-full bg-white/40" style={{ width: `${w}%`, opacity: 1 - i * 0.15 }} />
        ))}
      </div>
      <span className="absolute bottom-2 right-2 rounded bg-ink-900/60 px-1 py-0.5 font-mono text-[6px] uppercase tracking-widest text-white/70">{type}</span>
    </div>
  );
}

export default function Screenshots() {
  const [open, setOpen] = useState(null);

  const next = (i) => setOpen((open + 1) % SCREENSHOTS.length);
  const prev = (i) => setOpen((open - 1 + SCREENSHOTS.length) % SCREENSHOTS.length);

  return (
    <section id="shots" className="relative z-10 overflow-hidden px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="In Action"
          title="The Product, Up Close"
          sub="A look at the SignSpeak experience — the interface, the recognition engine and the analytics that power it."
        />

        <Reveal>
          <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:thin]" style={{ scrollbarColor: 'rgba(34,211,238,0.4) transparent' }}>
            {SCREENSHOTS.map((s, i) => (
              <button
                key={i}
                onClick={() => setOpen(i)}
                className="group w-[300px] shrink-0 snap-center overflow-hidden rounded-3xl border border-white/8 bg-white/[0.03] text-left transition-all duration-500 hover:-translate-y-2 hover:border-cyan-400/30 hover:shadow-glow"
              >
                <div className="relative aspect-[3/2] overflow-hidden bg-ink-950/60 p-6">
                  <MockShot type={s.title} />
                  <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-ink-900/70 text-slate-300 opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
                    <FiMaximize2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <div className="p-4">
                  <div className="font-display text-base font-semibold text-white">{s.title}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">{s.desc}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-slate-600">Scroll to browse · click to preview</p>
        </Reveal>
      </div>

      {/* fullscreen preview */}
      {open !== null && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ink-950/90 p-5 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={`${SCREENSHOTS[open].title} preview`}>
          <div className="glass-deep relative w-full max-w-4xl overflow-hidden rounded-3xl p-8">
            <div className="absolute left-6 top-6 flex gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400/70" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-amber-400/70" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/70" aria-hidden="true" />
            </div>
            <button onClick={() => setOpen(null)} className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white" aria-label="Close preview">
              <FiX className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="mt-6 grid place-items-center">
              <div className="scale-150"><MockShot type={SCREENSHOTS[open].title} big /></div>
            </div>
            <div className="mt-8 flex items-center justify-between">
              <div>
                <div className="font-display text-xl font-semibold text-white">{SCREENSHOTS[open].title}</div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500">{SCREENSHOTS[open].desc}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={prev} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white" aria-label="Previous">
                  <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button onClick={next} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white" aria-label="Next">
                  <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}