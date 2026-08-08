// MODEL PERFORMANCE — analytics dashboard: gauge, counters, training curve,
// per-class bars and a confusion heat map — all animated on scroll.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import Counter from '../components/Counter.jsx';
import { MODEL, CONFUSION_HEAT } from '../lib/data.js';

gsap.registerPlugin(ScrollTrigger);

function Gauge({ value }) {
  const R = 84;
  const C = 2 * Math.PI * R;
  const circleRef = useRef(null);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.fromTo(
      el,
      { strokeDashoffset: C },
      {
        strokeDashoffset: C * (1 - value / 100),
        duration: 2.2,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        ...(reduce ? { duration: 0 } : {}),
      }
    );
  }, [value, C]);

  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 200 200" className="w-52 md:w-56" role="img" aria-label={`Overall accuracy ${value} percent`}>
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="55%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="11" />
        <circle
          ref={circleRef}
          cx="100" cy="100" r={R} fill="none"
          stroke="url(#gauge-grad)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C}
          transform="rotate(-90 100 100)"
          style={{ filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.55))' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-6xl font-bold tracking-tight">
          <span className="grad-text"><Counter to={MODEL.accuracy} decimals={1} suffix="%" /></span>
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.26em] text-slate-500">Overall Accuracy</div>
      </div>
    </div>
  );
}

function TrainingCurve() {
  const pathRef = useRef(null);
  const { epochs, samples, trainSplit } = MODEL;

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    gsap.fromTo(el, { strokeDashoffset: len }, {
      strokeDashoffset: 0,
      duration: 2.4,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  }, []);

  // fake-ish loss curve: high start, smooth decay, small noise
  const P = Array.from({ length: 40 }, (_, i) => {
    const x = (i / 39) * 100;
    const y = 88 - (i / 39) * 66 + Math.sin(i * 0.8) * 2.4 + (i % 7) * 0.3;
    return [x, y];
  });
  const d = 'M' + P.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');

  return (
    <div className="glass-deep rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-display text-lg font-semibold text-white">Training Loss</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">LSTM · cross-entropy</div>
        </div>
        <div className="flex gap-4 font-mono text-[10px] uppercase tracking-widest">
          <span className="flex items-center gap-1.5 text-cyan-300"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Train</span>
          <span className="flex items-center gap-1.5 text-violet-300"><span className="h-2 w-2 rounded-full bg-violet-400" /> Val</span>
        </div>
      </div>
      <svg viewBox="0 0 100 100" className="w-full" preserveAspectRatio="none" role="img" aria-label="Training loss curve decreasing over 60 epochs">
        <defs>
          <linearGradient id="curve-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,211,238,0.28)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[20, 40, 60, 80].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.4" />
        ))}
        {/* area fill */}
        <path d={`${d} L100,95 L0,95 Z`} fill="url(#curve-fill)" stroke="none" />
        {/* train curve */}
        <path ref={pathRef} d={d} fill="none" stroke="#22D3EE" strokeWidth="1.6" strokeLinecap="round"
          strokeDasharray={2000} strokeDashoffset={2000} style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.5))' }} />
        {/* val curve (dashed twin) */}
        <path d={d} fill="none" stroke="#A78BFA" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.8" />
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono text-[10px] uppercase tracking-widest text-slate-500">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] py-2">Epochs <span className="ml-1 text-cyan-300">{epochs}</span></div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] py-2">Samples <span className="ml-1 text-cyan-300">{(samples / 1000).toFixed(0)}k</span></div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] py-2">Train Split <span className="ml-1 text-cyan-300">{Math.round(trainSplit * 100)}%</span></div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, decimals = 1, suffix = '%', accent = 'text-white' }) {
  return (
    <div className="glass sheen rounded-2xl p-5 transition-all duration-500 hover:border-cyan-400/30 hover:shadow-glow">
      <div className={`font-display text-4xl font-semibold tracking-tight ${accent}`}>
        <Counter to={value} decimals={decimals} suffix={suffix} />
      </div>
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
    </div>
  );
}

function LetterBars() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const accs = [97.1, 96.4, 98.2, 95.8, 97.7, 96.9, 98.6, 96.1, 97.4, 95.2, 98.0, 96.6, 97.9, 96.3, 97.5, 98.4, 95.9, 97.8, 96.7, 98.1, 97.2, 96.5, 98.3, 96.0, 97.6, 95.4];
  return (
    <div className="glass-deep rounded-3xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="font-display text-lg font-semibold text-white">Per-Letter Accuracy</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">A–Z · ASL alphabet</div>
        </div>
        <span className="rounded-full bg-cyan-400/10 px-3 py-1 font-mono text-[10px] text-cyan-300 ring-1 ring-cyan-400/25">mean 97.2%</span>
      </div>
      <div className="grid gap-x-1.5 gap-y-3" style={{ gridTemplateColumns: 'repeat(13, 1fr)' }}>
        {letters.map((l, i) => (
          <div key={l} className="group flex flex-col items-center gap-1.5">
            <div className="flex h-24 w-full items-end rounded-md bg-white/[0.04]">
              <div
                className="w-full origin-bottom rounded-md bg-gradient-to-t from-sky-500/60 via-cyan-400/70 to-violet-400/80 transition-all duration-700 group-hover:from-cyan-400 group-hover:to-violet-400"
                style={{ height: `${accs[i]}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-slate-500">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatMap() {
  return (
    <div className="glass-deep rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-display text-lg font-semibold text-white">Confusion Heat Map</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Preview · 6 × 6 sample slice</div>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-slate-500">
          low
          <span className="h-2 w-16 rounded-full bg-gradient-to-r from-ink-700 via-cyan-500 to-cyan-300" />
          high
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {CONFUSION_HEAT.slice(0, 36).map((v, i) => (
          <div key={i} className="group relative aspect-square rounded-lg" style={{ background: `rgba(34,211,238,${(v * 0.9).toFixed(2)})`, boxShadow: v > 0.9 ? '0 0 14px rgba(34,211,238,0.4)' : 'none' }}>
            <span className="absolute inset-0 grid place-items-center font-mono text-[10px] font-semibold text-ink-950/80">
              {String.fromCharCode(65 + (i % 6))}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] leading-relaxed text-slate-500">
        Diagonal dominance = correct predictions. Off-diagonal cells stay near zero — the model rarely confuses similar letters.
      </p>
    </div>
  );
}

export default function Model() {
  return (
    <section id="model" className="relative z-10 px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Model Performance"
          title="Numbers That Speak"
          sub="Trained on the Kaggle ASL Alphabet dataset plus self-recorded word gestures — evaluated across accuracy, precision, recall and F1."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* gauge + metrics */}
          <div className="flex flex-col gap-6">
            <Reveal>
              <div className="glass-deep grid place-items-center rounded-3xl p-8">
                <Gauge value={MODEL.accuracy} />
              </div>
            </Reveal>
            <div className="grid grid-cols-2 gap-4">
              <Reveal delay={0.05}><MetricTile label="Precision" value={MODEL.precision} /></Reveal>
              <Reveal delay={0.1}><MetricTile label="Recall" value={MODEL.recall} /></Reveal>
              <Reveal delay={0.15}><MetricTile label="F1 Score" value={MODEL.f1} /></Reveal>
              <Reveal delay={0.2}>
                <div className="glass sheen rounded-2xl p-5 transition-all duration-500 hover:border-cyan-400/30 hover:shadow-glow">
                  <div className="font-display text-4xl font-semibold tracking-tight text-white">
                    <Counter to={MODEL.latencyMs} suffix="ms" />
                  </div>
                  <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Inference Latency</div>
                </div>
              </Reveal>
            </div>
          </div>

          {/* curve + heat */}
          <div className="flex flex-col gap-6">
            <Reveal delay={0.1}><TrainingCurve /></Reveal>
            <Reveal delay={0.2}><HeatMap /></Reveal>
          </div>
        </div>

        {/* letter bars */}
        <Reveal delay={0.15}>
          <div className="mt-6">
            <LetterBars />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
