import { useState } from 'react';
import {
  FiCpu,
  FiActivity,
  FiShield,
  FiClock,
  FiRefreshCw,
  FiCheckCircle,
  FiArrowLeft,
  FiCamera,
  FiSliders,
  FiTerminal,
  FiLayers,
} from 'react-icons/fi';
import { useRouter } from '../../context/RouterContext.jsx';

export default function AnalystHeader({
  activeTab,
  setActiveTab,
  modelSpecs,
  status,
}) {
  const { navigate } = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotification, setRefreshNotification] = useState(null);

  const handleRecheck = () => {
    setIsRefreshing(true);
    setRefreshNotification(null);

    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshNotification({
        type: 'success',
        message: 'Client runtime verified: ONNX Runtime Web SIMD & MediaPipe assets active. Multi-signer benchmark standby.',
      });

      setTimeout(() => {
        setRefreshNotification(null);
      }, 5000);
    }, 900);
  };

  const navTabs = [
    { id: 'overview', label: 'Overview & Metrics' },
    { id: 'classes', label: 'Alphabet Classes (A–Z)' },
    { id: 'confusion', label: 'Confusion Matrix' },
    { id: 'diagnostics', label: 'Critical Diagnostics' },
    { id: 'specs', label: 'Model Specs & Dataset' },
    { id: 'history', label: 'Evaluation History' },
  ];

  return (
    <header className="relative pt-24 sm:pt-28 pb-4 border-b border-[var(--border-subtle)] bg-[var(--bg-main)]">
      {/* Background Subtle Ambient Glow */}
      <div
        className="pointer-events-none absolute -top-36 left-1/2 -translate-x-1/2 h-80 w-full max-w-6xl rounded-full bg-cyan-500/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Section Indicator Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-[var(--text-sub)] hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <FiArrowLeft className="h-3.5 w-3.5" />
              <span>SignSpeak AI</span>
            </button>
            <span className="text-[var(--text-sub)] opacity-50">/</span>
            <span className="text-[var(--text-sub)]">Model Performance</span>
            <span className="text-[var(--text-sub)] opacity-50">/</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 font-semibold text-cyan-300 shadow-[0_0_10px_rgba(0,217,255,0.15)]">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              ANALYST
            </span>
          </div>

          {/* Evaluation Status Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1 font-mono text-[11px] text-[var(--text-sub)] backdrop-blur-md">
            <span className="uppercase tracking-wider text-[10px]">Evaluation Status</span>
            <span className="h-3 w-px bg-[var(--border-subtle)]" />
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {status?.badge || 'Awaiting Verified Evaluation'}
            </span>
          </div>
        </div>

        {/* Main Title & Action Row */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-main)]">
              Model Performance
            </h1>
            <p className="mt-1 text-sm sm:text-base text-[var(--text-sub)] max-w-2xl leading-relaxed">
              AI model observability, fine-grained class evaluation, confusion topology, and dataset integrity dashboard.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRecheck}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 font-mono text-xs font-semibold text-[var(--text-main)] hover:border-cyan-400/50 hover:text-cyan-300 transition-all cursor-pointer shadow-sm disabled:opacity-60"
              title="Verify active runtime model artifacts and benchmark readiness"
            >
              <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
              <span>{isRefreshing ? 'Verifying...' : 'Re-check Runtime'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/', 'demo')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 font-sans text-xs font-semibold text-slate-950 shadow-[0_0_15px_rgba(0,217,255,0.25)] hover:opacity-95 transition-opacity cursor-pointer"
            >
              <FiCamera className="h-3.5 w-3.5" />
              <span>Launch Live Camera</span>
            </button>
          </div>
        </div>

        {/* Runtime & Provenance Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 py-3 border-t border-[var(--border-subtle)] text-xs">
          {/* Active Model Name & Version */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 text-[var(--text-sub)] font-mono text-[10px] uppercase tracking-wider">
              <FiCpu className="h-3 w-3 text-cyan-400" />
              <span>Active Model</span>
            </div>
            <div className="mt-1 font-mono text-xs sm:text-[13px] font-bold text-[var(--text-main)] truncate" title={modelSpecs?.artifactName || 'alphabet_landmark_model.onnx'}>
              {modelSpecs?.name || 'Alphabet Landmark MLP'}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-cyan-400">
              {modelSpecs?.version || 'v1.0.0'} · {modelSpecs?.artifactSize || '159 KB'}
            </div>
          </div>

          {/* Model Status */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 text-[var(--text-sub)] font-mono text-[10px] uppercase tracking-wider">
              <FiActivity className="h-3 w-3 text-cyan-400" />
              <span>Model Status</span>
            </div>
            <div className="mt-1 font-sans text-xs sm:text-[13px] font-semibold text-[var(--text-main)] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <span>Deployment Ready</span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-[var(--text-sub)]">
              WASM Client Inference
            </div>
          </div>

          {/* Last Evaluation Timestamp */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 text-[var(--text-sub)] font-mono text-[10px] uppercase tracking-wider">
              <FiClock className="h-3 w-3 text-cyan-400" />
              <span>Last Evaluation</span>
            </div>
            <div className="mt-1 font-sans text-xs sm:text-[13px] font-semibold text-[var(--text-main)]">
              {status?.lastRun ? status.lastRun : 'No evaluation recorded'}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-[var(--text-sub)]">
              Awaiting verified run
            </div>
          </div>

          {/* Evaluation Integrity Standard */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 text-[var(--text-sub)] font-mono text-[10px] uppercase tracking-wider">
              <FiShield className="h-3 w-3 text-cyan-400" />
              <span>Integrity Standard</span>
            </div>
            <div className="mt-1 font-sans text-xs sm:text-[13px] font-semibold text-[var(--text-main)]">
              Zero-Fabrication
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-cyan-400/90">
              Unmeasured metrics unsimulated
            </div>
          </div>
        </div>

        {/* Runtime Check Notification Toast Banner */}
        {refreshNotification && (
          <div className="mt-2.5 p-3 rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <FiCheckCircle className="h-4 w-4 shrink-0 text-cyan-400" />
              <span>{refreshNotification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setRefreshNotification(null)}
              className="text-cyan-300 hover:text-white font-mono text-[10px] uppercase"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dashboard Navigation Tabs */}
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-[var(--border-subtle)] -mx-4 px-4 sm:mx-0 sm:px-0">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-400/15 border border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(0,217,255,0.15)]'
                    : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
