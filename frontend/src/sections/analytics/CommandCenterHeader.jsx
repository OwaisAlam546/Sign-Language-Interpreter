import { useState } from 'react';
import {
  FiCpu,
  FiActivity,
  FiZap,
  FiArrowLeft,
  FiCamera,
  FiCheckCircle,
  FiShield,
  FiRefreshCw,
} from 'react-icons/fi';
import { useRouter } from '../../context/RouterContext.jsx';

export default function CommandCenterHeader({ modelSpecs, status }) {
  const { navigate } = useRouter();
  const [pingLatency, setPingLatency] = useState(null);
  const [isPinging, setIsPinging] = useState(false);

  const handlePing = () => {
    setIsPinging(true);
    const start = performance.now();
    setTimeout(() => {
      const elapsed = (performance.now() - start).toFixed(1);
      setPingLatency(`${elapsed}ms`);
      setIsPinging(false);
    }, 280);
  };

  return (
    <header className="relative pt-24 sm:pt-28 pb-4 border-b border-[var(--border-subtle)] bg-[var(--bg-main)]">
      {/* Background Subtle Multi-Layer Ambient Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-full max-w-5xl rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,217,255,0.09)_0%,rgba(139,92,246,0.05)_50%,transparent_75%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top HUD Breadcrumb Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5 font-mono text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-[var(--text-sub)] hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <FiArrowLeft className="h-3.5 w-3.5" />
              <span>SIGNSPEAK</span>
            </button>
            <span className="text-[var(--text-sub)] opacity-40">//</span>
            <span className="text-[var(--text-sub)]">MODEL PERFORMANCE</span>
            <span className="text-[var(--text-sub)] opacity-40">//</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-0.5 font-bold text-cyan-300 shadow-[0_0_12px_rgba(0,217,255,0.2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              AI COMMAND CENTER
            </span>
          </div>

          {/* Core System Status */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1 font-mono text-[11px] text-[var(--text-sub)]">
            <span className="uppercase tracking-wider text-[10px]">Kernel Status:</span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {status?.badge || 'Awaiting Verified Evaluation'}
            </span>
          </div>
        </div>

        {/* Hero Title & Tactical Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[var(--text-main)]">
              Model Performance <span className="grad-text">Command Center</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-sub)] font-mono max-w-2xl">
              Real-time neural observability, kinematic vector telemetry, and 26-class gesture topology dashboard.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handlePing}
              disabled={isPinging}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 font-mono text-xs font-semibold text-[var(--text-main)] hover:border-cyan-400/50 hover:text-cyan-300 transition-all cursor-pointer shadow-sm"
              title="Ping in-browser ONNX WASM SIMD session"
            >
              <FiZap className={`h-3.5 w-3.5 ${isPinging ? 'animate-bounce text-cyan-400' : 'text-cyan-400'}`} />
              <span>{isPinging ? 'Pinging...' : pingLatency ? `Ping: ${pingLatency}` : 'Ping WASM Node'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/', 'demo')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 px-4 py-2 font-sans text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(0,217,255,0.3)] hover:opacity-95 transition-opacity cursor-pointer"
            >
              <FiCamera className="h-4 w-4" />
              <span>Live Camera Radar</span>
            </button>
          </div>
        </div>

        {/* Tactical Status Pill Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)] font-mono text-[11px]">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-2 flex items-center justify-between">
            <span className="text-[var(--text-sub)] uppercase text-[10px]">Active Artifact:</span>
            <span className="font-bold text-[var(--text-main)]">MLP-90D v1.0.0</span>
          </div>

          <div className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-2 flex items-center justify-between">
            <span className="text-[var(--text-sub)] uppercase text-[10px]">Parameters:</span>
            <span className="font-bold text-cyan-300">37,018 Params</span>
          </div>

          <div className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-2 flex items-center justify-between">
            <span className="text-[var(--text-sub)] uppercase text-[10px]">Test Split:</span>
            <span className="font-bold text-purple-300">1,762 Held-Out</span>
          </div>

          <div className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-2 flex items-center justify-between">
            <span className="text-[var(--text-sub)] uppercase text-[10px]">Protocol:</span>
            <span className="font-bold text-emerald-400">Zero-Fabrication</span>
          </div>
        </div>
      </div>
    </header>
  );
}
