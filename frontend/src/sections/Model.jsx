// MODEL PERFORMANCE — compact dashboard: accuracy gauge + core metric tiles.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import Counter from '../components/Counter.jsx';
import { MODEL } from '../lib/data.js';

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

function MetricTile({ label, value, decimals = 1, suffix = '%' }) {
  return (
    <div className="glass sheen rounded-2xl p-5 transition-all duration-500 hover:border-cyan-400/30 hover:shadow-glow">
      <div className="font-display text-4xl font-semibold tracking-tight text-white">
        <Counter to={value} decimals={decimals} suffix={suffix} />
      </div>
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
    </div>
  );
}

export default function Model() {
  return (
    <section id="model" className="relative z-10 px-5 py-24 md:px-10 md:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Model Performance"
          title="Numbers That Speak"
          sub="Trained on the Kaggle ASL Alphabet dataset plus self-recorded word gestures."
        />

        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
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

        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
            <span>{MODEL.classes} classes</span>
            <span className="h-3 w-px bg-white/10" />
            <span>{MODEL.samples.toLocaleString()} samples</span>
            <span className="h-3 w-px bg-white/10" />
            <span>{MODEL.epochs} epochs</span>
            <span className="h-3 w-px bg-white/10" />
            <span>{MODEL.dataset}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
