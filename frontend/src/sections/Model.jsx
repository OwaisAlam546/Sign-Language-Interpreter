// MODEL PERFORMANCE — compact dashboard: accuracy gauge / neutral telemetry dial + core metric tiles.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FiActivity, FiTarget, FiAward, FiClock, FiCheckCircle, FiGlobe, FiUsers, FiCpu } from 'react-icons/fi';
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
    if (value === null) return;
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

  if (value === null) {
    return (
      <div className="relative flex flex-col items-center justify-center text-center">
        {/* Polished neutral telemetry calibration dial */}
        <div className="relative grid place-items-center">
          <svg
            viewBox="0 0 200 200"
            className="w-52 md:w-56"
            role="img"
            aria-label="Overall accuracy awaiting evaluation"
          >
            <defs>
              <linearGradient id="neutral-dial-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00D9FF" />
                <stop offset="50%" stopColor="#83E8F5" />
                <stop offset="100%" stopColor="#168BFF" />
              </linearGradient>
            </defs>

            {/* Background static graticule track */}
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="currentColor"
              className="text-white/10"
              strokeWidth="4"
              strokeDasharray="4 6"
            />

            {/* Inner telemetry ring */}
            <circle
              cx="100"
              cy="100"
              r={R - 16}
              fill="none"
              stroke="currentColor"
              className="text-cyan-400/20"
              strokeWidth="1.5"
            />

            {/* Rotating radar scanner arc */}
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="url(#neutral-dial-grad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="50 160"
              className="animate-spin-slow origin-center"
              style={{ filter: 'drop-shadow(0 0 10px rgba(0, 217, 255, 0.45))' }}
            />

            {/* Precision crosshairs */}
            <line x1="100" y1="8" x2="100" y2="18" stroke="#00D9FF" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
            <line x1="100" y1="182" x2="100" y2="192" stroke="#00D9FF" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
            <line x1="8" y1="100" x2="18" y2="100" stroke="#00D9FF" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
            <line x1="182" y1="100" x2="192" y2="100" stroke="#00D9FF" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
          </svg>

          {/* Central content overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-cyan-300 shadow-[0_0_12px_rgba(0,217,255,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              Awaiting Evaluation
            </span>

            <div className="mt-2.5 font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
              Overall Accuracy
            </div>

            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
              Benchmark Standby
            </div>
          </div>
        </div>

        {/* Telemetry bottom badge */}
        <div className="mt-4 flex items-center justify-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80 animate-pulse" />
          <span>Validation Protocol Active</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 200 200" className="w-52 md:w-56" role="img" aria-label={`Overall accuracy ${value} percent`}>
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D9FF" />
            <stop offset="55%" stopColor="#83E8F5" />
            <stop offset="100%" stopColor="#168BFF" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" className="text-white/10" strokeWidth="11" />
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
          <span className="grad-text"><Counter to={value} decimals={1} suffix="%" /></span>
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.26em] text-slate-500">Overall Accuracy</div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, decimals = 1, suffix = '%', icon: Icon, description, fallbackText = 'Awaiting Evaluation' }) {
  const isAvailable = value !== null;

  return (
    <div className="glass-card group relative flex flex-col justify-between rounded-2xl border border-white/12 bg-slate-950/90 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.65)] hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.2)] transition-all">
      <div>
        {/* Top header row with icon and status tag */}
        <div className="mb-3 flex items-center justify-between">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-400/10 border border-cyan-400/25 text-cyan-300">
            {Icon && <Icon className="h-4 w-4" />}
          </div>
          <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-400">
            {isAvailable ? 'Measured' : 'Standby'}
          </span>
        </div>

        {/* Value / Status */}
        {isAvailable ? (
          <div className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
            <Counter to={value} decimals={decimals} suffix={suffix} />
          </div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xl sm:text-2xl font-bold text-cyan-400/60">—</span>
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-200">
              {fallbackText}
            </span>
          </div>
        )}

        {/* Label */}
        <div className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-cyan-300 font-semibold">
          {label}
        </div>

        {/* Description note */}
        {description && (
          <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Standby / Calibration Track */}
      <div className="mt-4 pt-3 border-t border-white/8 flex items-center justify-between font-mono text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5 text-cyan-300/80">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          {isAvailable ? 'Verified Metric' : 'Pending Verification'}
        </span>
        <span className="text-slate-500">SignSpeak AI</span>
      </div>
    </div>
  );
}

export default function Model() {
  return (
    <section id="model" className="relative z-10 px-4 sm:px-6 md:px-8 pt-10 sm:pt-12 md:pt-14 pb-16 sm:pb-20 md:pb-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Model Performance"
          title="Numbers That Speak"
          sub="The bundled model covers A–Z plus synthetic HELLO. Independent signer/video accuracy evaluation is required before performance can be claimed."
        />

        <div className="grid items-stretch gap-8 lg:grid-cols-[1fr_1.2fr]">
          <Reveal className="h-full">
            <div className="glass-card relative flex h-full flex-col items-center justify-center rounded-3xl border border-white/12 bg-slate-950/90 p-8 sm:p-10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.65)] overflow-hidden">
              <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />
              <Gauge value={MODEL.accuracy} />
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Reveal delay={0.05}>
              <MetricTile
                label="Precision"
                value={MODEL.precision}
                icon={FiTarget}
                description="Class-specific positive prediction accuracy"
                fallbackText="Awaiting Evaluation"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <MetricTile
                label="Recall"
                value={MODEL.recall}
                icon={FiActivity}
                description="True gesture sensitivity & coverage"
                fallbackText="Awaiting Evaluation"
              />
            </Reveal>
            <Reveal delay={0.15}>
              <MetricTile
                label="F1 Score"
                value={MODEL.f1}
                icon={FiAward}
                description="Harmonic balance of precision & recall"
                fallbackText="Awaiting Evaluation"
              />
            </Reveal>
            <Reveal delay={0.2}>
              <MetricTile
                label="Inference Latency"
                value={MODEL.latencyMs}
                decimals={0}
                suffix="ms"
                icon={FiClock}
                description="End-to-end frame processing delay"
                fallbackText="Not Yet Measured"
              />
            </Reveal>
          </div>
        </div>

        {/* Compact explanation that evaluation results will appear after a verified test run */}
        <Reveal delay={0.25}>
          <div className="glass-card mt-6 sm:mt-7 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/12 bg-slate-950/80 p-5 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/15 border border-cyan-400/35 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                <FiCheckCircle className="h-5 w-5" />
              </span>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                <span className="font-semibold text-white">Evaluation Protocol:</span>{' '}
                Evaluation results will appear after a verified test run on multi-signer validation sets and real-world conditions.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/10 px-3.5 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-300 border border-cyan-400/25 font-semibold shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Test Suite Ready
            </span>
          </div>
        </Reveal>

        {/* ── Compact Sign Language Facts (Visually Secondary Context) ── */}
        <Reveal delay={0.28}>
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5 backdrop-blur-xl">
            {/* Header row with subtle tag and attribution */}
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2.5">
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-300/85 font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80" />
                Sign Language Global Context
              </span>
              <span className="font-mono text-[9px] sm:text-[10px] text-slate-500">
                Sources: World Federation of the Deaf (WFD) &amp; Google MediaPipe
              </span>
            </div>

            {/* 3-column fact grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Fact 1 */}
              <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3 sm:p-3.5 transition-colors hover:border-cyan-400/30">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
                  <FiGlobe className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
                    300+
                  </div>
                  <div className="font-mono text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider">
                    Sign languages worldwide
                  </div>
                </div>
              </div>

              {/* Fact 2 */}
              <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3 sm:p-3.5 transition-colors hover:border-cyan-400/30">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
                  <FiUsers className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
                    70M+
                  </div>
                  <div className="font-mono text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider">
                    Deaf people worldwide
                  </div>
                </div>
              </div>

              {/* Fact 3 */}
              <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3 sm:p-3.5 transition-colors hover:border-cyan-400/30">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
                  <FiCpu className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
                    21
                  </div>
                  <div className="font-mono text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider">
                    Hand landmarks tracked by MediaPipe
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass-card mx-auto mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-full border border-white/12 bg-slate-950/80 px-8 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 backdrop-blur-xl shadow-lg max-w-3xl">
            <span className="text-slate-300"><span className="text-cyan-300 font-semibold">{MODEL.classes}</span> classes</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="text-slate-300"><span className="text-cyan-300 font-semibold">{MODEL.samples}</span> samples</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="text-slate-300"><span className="text-cyan-300 font-semibold">{MODEL.epochs}</span> epochs</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="text-cyan-300 font-medium">{MODEL.dataset}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
