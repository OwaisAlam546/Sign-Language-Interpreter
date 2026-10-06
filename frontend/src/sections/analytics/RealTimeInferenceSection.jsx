import { useState } from 'react';
import { FiCpu, FiClock, FiActivity, FiZap, FiCheck, FiArrowRight, FiInfo } from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';

export default function RealTimeInferenceSection({ inference }) {
  const [activeStep, setActiveStep] = useState(4); // Highlight committed frame by default

  const metricsList = [
    { label: 'FPS', val: inference.fps, unit: 'fps', icon: FiActivity, desc: 'Live video ingestion throughput' },
    { label: 'Average Latency', val: inference.avgLatencyMs, unit: 'ms', icon: FiClock, desc: 'Mean end-to-end forward pass' },
    { label: 'P95 Latency', val: inference.p95LatencyMs, unit: 'ms', icon: FiZap, desc: '95th percentile execution tail' },
    { label: 'Prediction Confidence', val: inference.confidence, unit: '%', icon: FiCpu, desc: 'Argmax softmax probability' },
  ];

  return (
    <section className="relative py-10 sm:py-12 border-b border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              Live Pipeline Telemetry
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
              Real-Time Inference Performance
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              Frame processing latency, tracking speed, and temporal hysteresis commit progression.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-cyan-400/25 bg-slate-950/80 px-3 py-1 font-mono text-[10px] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Source: Client WebAssembly telemetry</span>
          </div>
        </div>

        {/* 4 Compact Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {metricsList.map(({ label, val, unit, icon: Icon, desc }) => (
            <div
              key={label}
              className="glass-card rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/80 p-3.5 sm:p-4 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-cyan-300 font-semibold">
                  {label}
                </span>
                <div className="grid h-6 w-6 place-items-center rounded-md bg-cyan-400/10 text-cyan-300">
                  <Icon className="h-3 w-3" />
                </div>
              </div>

              <div className="my-1">
                {val !== null && val !== undefined ? (
                  <div className="font-display text-2xl sm:text-3xl font-bold text-white">
                    {val} <span className="text-xs text-slate-400 font-normal">{unit}</span>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="font-display text-sm sm:text-base font-bold text-slate-200">
                      Not Yet Measured
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                      Standby
                    </span>
                  </div>
                )}
              </div>

              <p className="mt-1 text-[11px] text-slate-400">
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* Timeline Visualization: Frame → Prediction → Confidence → Stabilization → Commit */}
        <div className="glass-card rounded-2xl border border-white/12 bg-slate-950/90 p-5 sm:p-6 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-5 border-b border-white/[0.08]">
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-white">
                Temporal Stabilization Flow
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Frame-by-frame confidence progression before emitting a stable recognized letter.
              </p>
            </div>
            <div className="font-mono text-[10px] text-cyan-300 flex items-center gap-1.5 bg-cyan-400/10 border border-cyan-400/25 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
              <span>Frame → Prediction → Confidence → Stabilization → Commit</span>
            </div>
          </div>

          {/* Stepped Frame Sequence */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 sm:gap-3 mb-5">
            {inference.sampleTimeline.map((item, idx) => {
              const isActive = activeStep === idx;
              const isCommitted = idx === 4;

              return (
                <div
                  key={item.frame}
                  onClick={() => setActiveStep(idx)}
                  className={`relative flex flex-col justify-between rounded-xl border p-3 transition-all cursor-pointer ${
                    isActive
                      ? 'border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_15px_rgba(0,217,255,0.15)]'
                      : 'border-white/8 bg-slate-900/60 hover:border-white/20'
                  }`}
                >
                  <div>
                    {/* Frame Indicator */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono font-bold text-slate-300">{item.frame}</span>
                      <span className={`h-2 w-2 rounded-full ${isCommitted ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                    </div>

                    {/* Prediction & Confidence */}
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-2xl font-bold text-white">{item.raw}</span>
                      <span className="font-mono text-xs text-cyan-300 font-semibold">{item.confidence.toFixed(2)}</span>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400">
                      {item.label}
                    </div>
                  </div>

                  {/* Stage Badge */}
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider">
                    <span className={isCommitted ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {isCommitted ? 'Stable Commit' : `Stage ${idx + 1}/5`}
                    </span>
                    {isCommitted && <FiCheck className="h-3 w-3 text-emerald-400" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conceptual Summary Banner */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 shrink-0 font-bold">
                ✓
              </span>
              <div>
                <span className="font-bold text-white">Stable Prediction Output: </span>
                <span className="font-mono font-semibold text-emerald-300">Letter 'A'</span>
                <span className="text-slate-400 ml-2">
                  (Confirmed after 5 consecutive frames above 0.70 confidence threshold)
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              Gating: Window Size 4 · Cooldown 800ms
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
