// MODEL PERFORMANCE — compact dashboard: accuracy gauge / neutral telemetry dial + core metric tiles.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FiActivity, FiTarget, FiAward, FiClock, FiCheckCircle } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import Counter from '../components/Counter.jsx';
import { MODEL } from '../lib/data.js';
import { useRouter } from '../context/RouterContext.jsx';

gsap.registerPlugin(ScrollTrigger);

function Gauge({ value }) {
  const R = 64;
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
            viewBox="0 0 160 160"
            className="w-36 sm:w-40 md:w-44"
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
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke="currentColor"
              className="text-white/10"
              strokeWidth="3.5"
              strokeDasharray="4 5"
            />

            {/* Inner telemetry ring */}
            <circle
              cx="80"
              cy="80"
              r={R - 13}
              fill="none"
              stroke="currentColor"
              className="text-cyan-400/20"
              strokeWidth="1.2"
            />

            {/* Rotating radar scanner arc */}
            <circle
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke="url(#neutral-dial-grad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="40 130"
              className="animate-spin-slow origin-center"
              style={{ filter: 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.45))' }}
            />

            {/* Precision crosshairs */}
            <line x1="80" y1="6" x2="80" y2="14" stroke="#00D9FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
            <line x1="80" y1="146" x2="80" y2="154" stroke="#00D9FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
            <line x1="6" y1="80" x2="14" y2="80" stroke="#00D9FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
            <line x1="146" y1="80" x2="154" y2="80" stroke="#00D9FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
          </svg>

          {/* Central content overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/35 bg-cyan-400/10 px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-cyan-300 shadow-[0_0_10px_rgba(0,217,255,0.2)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
              </span>
              Awaiting Evaluation
            </span>

            <div className="mt-1.5 font-display text-lg sm:text-xl font-bold tracking-tight text-white">
              Overall Accuracy
            </div>

            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">
              Benchmark Standby
            </div>
          </div>
        </div>

        {/* Telemetry bottom badge */}
        <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80 animate-pulse" />
          <span>Validation Protocol Active</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 160 160" className="w-36 sm:w-40 md:w-44" role="img" aria-label={`Overall accuracy ${value} percent`}>
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D9FF" />
            <stop offset="55%" stopColor="#83E8F5" />
            <stop offset="100%" stopColor="#168BFF" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={R} fill="none" stroke="currentColor" className="text-white/10" strokeWidth="9" />
        <circle
          ref={circleRef}
          cx="80" cy="80" r={R} fill="none"
          stroke="url(#gauge-grad)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C}
          transform="rotate(-90 80 80)"
          style={{ filter: 'drop-shadow(0 0 10px rgba(34,211,238,0.55))' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
          <span className="grad-text"><Counter to={value} decimals={1} suffix="%" /></span>
        </div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.24em] text-slate-500">Overall Accuracy</div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, decimals = 1, suffix = '%', icon: Icon, description, fallbackText = 'Awaiting Evaluation' }) {
  const isAvailable = value !== null;

  return (
    <div className="glass-card group relative flex flex-col justify-between rounded-xl sm:rounded-2xl border border-white/12 bg-slate-950/90 p-3.5 sm:p-4 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.55)] hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all">
      <div>
        {/* Top header row with icon and status tag */}
        <div className="mb-2 flex items-center justify-between">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/10 border border-cyan-400/25 text-cyan-300">
            {Icon && <Icon className="h-3.5 w-3.5" />}
          </div>
          <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-slate-400">
            {isAvailable ? 'Measured' : 'Standby'}
          </span>
        </div>

        {/* Value / Status */}
        {isAvailable ? (
          <div className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            <Counter to={value} decimals={decimals} suffix={suffix} />
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-lg sm:text-xl font-bold text-cyan-400/60">—</span>
            <span className="font-display text-xs sm:text-sm font-bold tracking-tight text-slate-200">
              {fallbackText}
            </span>
          </div>
        )}

        {/* Label */}
        <div className="mt-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-cyan-300 font-semibold">
          {label}
        </div>

        {/* Description note */}
        {description && (
          <p className="mt-1 text-[11px] text-slate-400 leading-snug">
            {description}
          </p>
        )}
      </div>

      {/* Standby / Calibration Track */}
      <div className="mt-2.5 pt-2 border-t border-white/8 flex items-center justify-between font-mono text-[9px] text-slate-400">
        <span className="flex items-center gap-1 text-cyan-300/80">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          {isAvailable ? 'Verified Metric' : 'Pending Verification'}
        </span>
        <span className="text-slate-500">SignSpeak AI</span>
      </div>
    </div>
  );
}

export default function Model() {
  const { navigate } = useRouter();

  return (
    <section id="model" className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="Model Performance"
          title="Numbers That Speak"
          sub="The bundled model covers A–Z plus synthetic HELLO. Independent signer/video accuracy evaluation is required before performance can be claimed."
        />

        <div className="grid items-stretch gap-4 sm:gap-5 lg:grid-cols-[1fr_1.25fr]">
          <Reveal className="h-full">
            <div className="glass-card relative flex h-full flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-white/12 bg-slate-950/90 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-36 w-36 rounded-full bg-cyan-500/15 blur-2xl" />
              <Gauge value={MODEL.accuracy} />
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
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
          <div className="glass-card mt-4 sm:mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl sm:rounded-2xl border border-white/12 bg-slate-950/80 p-3.5 sm:p-4 backdrop-blur-xl shadow-md">
            <div className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-400/15 border border-cyan-400/35 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                <FiCheckCircle className="h-4 w-4" />
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-white">Evaluation Protocol:</span>{' '}
                Evaluation results will appear after a verified test run on multi-signer validation sets and real-world conditions.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/10 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-cyan-300 border border-cyan-400/25 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Test Suite Ready
              </span>
              <button
                type="button"
                onClick={() => navigate('/analytics')}
                className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/40 hover:border-cyan-300 px-3.5 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-200 hover:text-white transition-all shadow-[0_0_12px_rgba(0,217,255,0.2)] hover:shadow-[0_0_18px_rgba(0,217,255,0.4)] cursor-pointer"
                aria-label="View detailed model analytics"
              >
                <span>View Detailed Analysis</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </Reveal>

        {/* ── Editorial Statistics Strip: Sign Language Global Context ── */}
        <Reveal delay={0.28}>
          <div className="mt-6 sm:mt-7 pt-5 sm:pt-6 border-t border-white/[0.08]">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] text-center">
              <div className="py-3 sm:py-1 sm:px-4">
                <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                  300+
                </div>
                <div className="mt-1 text-xs text-slate-400 font-medium">
                  Sign Languages Worldwide
                </div>
              </div>

              <div className="py-3 sm:py-1 sm:px-4">
                <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                  70M+
                </div>
                <div className="mt-1 text-xs text-slate-400 font-medium">
                  Deaf People Worldwide
                </div>
              </div>

              <div className="py-3 sm:py-1 sm:px-4">
                <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                  21
                </div>
                <div className="mt-1 text-xs text-slate-400 font-medium">
                  Hand Landmarks Tracked by MediaPipe
                </div>
              </div>
            </div>

            <div className="mt-3.5 text-center text-[11px] text-slate-500 font-mono tracking-wide">
              Sources: World Federation of the Deaf (WFD) &amp; Google MediaPipe
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass-card mx-auto mt-3.5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 rounded-full border border-white/12 bg-slate-950/80 px-6 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 backdrop-blur-xl shadow-md max-w-2xl">
            <span className="text-slate-300"><span className="text-cyan-300 font-semibold">{MODEL.classes}</span> classes</span>
            <span className="h-2.5 w-px bg-white/15" />
            <span className="text-slate-300"><span className="text-cyan-300 font-semibold">{MODEL.samples}</span> samples</span>
            <span className="h-2.5 w-px bg-white/15" />
            <span className="text-slate-300"><span className="text-cyan-300 font-semibold">{MODEL.epochs}</span> epochs</span>
            <span className="h-2.5 w-px bg-white/15" />
            <span className="text-cyan-300 font-medium">{MODEL.dataset}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
