import { FiActivity, FiShield, FiCpu, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';

export default function AnalyticsHero({ data, status }) {
  return (
    <header className="relative pt-24 sm:pt-28 md:pt-32 pb-8 sm:pb-10 border-b border-white/[0.08] overflow-hidden">
      {/* Subtle background ambient gradients */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-72 sm:h-96 w-full max-w-5xl rounded-full bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Eyebrow & Live Status Bar */}
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 font-mono text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 shadow-[0_0_12px_rgba(0,217,255,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              MODEL ANALYTICS
            </div>

            {/* Evaluation Status Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3.5 py-1 font-mono text-[11px] text-slate-300 backdrop-blur-md">
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Evaluation Status</span>
              <span className="h-3 w-px bg-white/10" />
              <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {status.badge}
              </span>
            </div>
          </div>
        </Reveal>

        {/* Main Title & Subtitle */}
        <Reveal delay={0.05}>
          <div className="max-w-4xl">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08]">
              SignSpeak AI <span className="grad-text">Recognition Intelligence</span>
            </h1>
            <p className="mt-3.5 text-sm sm:text-base md:text-lg text-slate-300/90 leading-relaxed max-w-3xl">
              Recognition performance, model evaluation, dataset insights, and real-time inference analysis.
            </p>
          </div>
        </Reveal>

        {/* Provenance & System Metadata Ribbon */}
        <Reveal delay={0.1}>
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="glass-card rounded-xl border border-white/10 bg-slate-950/70 p-3 sm:p-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <FiCpu className="h-3.5 w-3.5 text-cyan-400" />
                <span>Runtime Engine</span>
              </div>
              <div className="mt-1 font-sans text-xs sm:text-[13px] font-semibold text-white truncate">
                ONNX Web WASM + MediaPipe
              </div>
              <div className="mt-0.5 font-mono text-[9px] text-slate-500">
                Client-side execution
              </div>
            </div>

            <div className="glass-card rounded-xl border border-white/10 bg-slate-950/70 p-3 sm:p-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <FiActivity className="h-3.5 w-3.5 text-cyan-400" />
                <span>Target Classes</span>
              </div>
              <div className="mt-1 font-sans text-xs sm:text-[13px] font-semibold text-white">
                26 Alphabet Letters (A–Z)
              </div>
              <div className="mt-0.5 font-mono text-[9px] text-slate-500">
                Static handshape gestures
              </div>
            </div>

            <div className="glass-card rounded-xl border border-white/10 bg-slate-950/70 p-3 sm:p-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <FiShield className="h-3.5 w-3.5 text-cyan-400" />
                <span>Integrity Standard</span>
              </div>
              <div className="mt-1 font-sans text-xs sm:text-[13px] font-semibold text-white">
                Strict Zero-Fabrication
              </div>
              <div className="mt-0.5 font-mono text-[9px] text-cyan-400/80">
                Unmeasured metrics unrepresented
              </div>
            </div>

            <div className="glass-card rounded-xl border border-white/10 bg-slate-950/70 p-3 sm:p-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <FiClock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Validation State</span>
              </div>
              <div className="mt-1 font-sans text-xs sm:text-[13px] font-semibold text-slate-200">
                Awaiting Verified Test Set
              </div>
              <div className="mt-0.5 font-mono text-[9px] text-slate-500">
                Protocol ready for execution
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </header>
  );
}
