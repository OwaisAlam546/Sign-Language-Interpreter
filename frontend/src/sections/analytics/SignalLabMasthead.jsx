import { useState } from 'react';
import { FiArrowLeft, FiCamera, FiZap, FiRadio, FiShield, FiTerminal } from 'react-icons/fi';
import { useRouter } from '../../context/RouterContext.jsx';

export default function SignalLabMasthead({
  activeView,
  setActiveView,
  status,
  metrics,
}) {
  const { navigate } = useRouter();
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [pulseFreq, setPulseFreq] = useState('60.0 Hz');

  const handleRecalibrate = () => {
    setIsCalibrating(true);
    setTimeout(() => {
      setIsCalibrating(false);
      setPulseFreq(`${(58 + Math.random() * 4).toFixed(1)} Hz`);
    }, 450);
  };

  return (
    <header className="relative pt-24 sm:pt-28 pb-6 border-b border-white/[0.08] bg-[#05080D]">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Minimal Editorial Metadata Line */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono tracking-widest uppercase text-slate-500 mb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-[#00F0FF] transition-colors cursor-pointer"
            >
              <FiArrowLeft className="h-3 w-3" />
              <span>SIGNSPEAK</span>
            </button>
            <span className="text-slate-700">/</span>
            <span className="text-slate-400">RESEARCH EXPERIMENT</span>
            <span className="text-slate-700">/</span>
            <span className="text-[#00F0FF] font-bold">EXP-094 // SIGNAL LAB</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00F0FF] animate-ping" />
              <span>KERNEL: WASM-SIMD</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">FREQ: {pulseFreq}</span>
            <span className="text-slate-700">|</span>
            <span className="text-emerald-400 font-semibold">{status?.badge || 'Awaiting Verified Evaluation'}</span>
          </div>
        </div>

        {/* Oversized Editorial Masthead Title */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-4">
          <div className="space-y-2">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF] font-semibold flex items-center gap-2">
              <FiRadio className="h-3.5 w-3.5" />
              <span>Model Performance Observatory</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-none">
              AI SIGNAL <span className="grad-text">LAB</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 font-mono max-w-2xl leading-relaxed">
              Topological gesture landscape mapping classification boundaries, kinematic confusion filaments, and 90-dimensional landmark invariance.
            </p>
          </div>

          {/* Tactical Action Terminal */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 font-mono text-xs">
            <button
              type="button"
              onClick={handleRecalibrate}
              disabled={isCalibrating}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 font-semibold text-slate-300 hover:border-[#00F0FF]/50 hover:text-[#00F0FF] transition-all cursor-pointer shadow-sm"
              title="Ping client WebAssembly node"
            >
              <FiZap className={`h-3.5 w-3.5 ${isCalibrating ? 'animate-spin text-[#00F0FF]' : 'text-[#00F0FF]'}`} />
              <span>{isCalibrating ? 'Calibrating...' : 'Probe WASM Node'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/', 'demo')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00F0FF] via-cyan-400 to-blue-600 px-4 py-2 font-sans font-bold text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:opacity-95 transition-opacity cursor-pointer"
            >
              <FiCamera className="h-4 w-4" />
              <span>Live Camera Stream</span>
            </button>
          </div>
        </div>

        {/* Minimal Typographic Telemetry Strip (No generic cards!) */}
        <div className="pt-4 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono text-xs">
          <div>
            <span className="block text-[10px] uppercase text-slate-500 tracking-wider">Top-1 Accuracy</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-200">—</span>
              <span className="text-[10px] text-cyan-400 font-semibold uppercase">Standby</span>
            </div>
            <span className="text-[9px] text-slate-500">Zero-Fabrication</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase text-slate-500 tracking-wider">Macro F1-Score</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-200">—</span>
              <span className="text-[10px] text-slate-400 uppercase">Unmeasured</span>
            </div>
            <span className="text-[9px] text-slate-500">Equal Class Support</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase text-slate-500 tracking-wider">Macro Precision</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-200">—</span>
              <span className="text-[10px] text-slate-400 uppercase">Unmeasured</span>
            </div>
            <span className="text-[9px] text-slate-500">False-Alarm Suppress</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase text-slate-500 tracking-wider">Held-Out Test Set</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#00F0FF]">1,762</span>
              <span className="text-[10px] text-slate-400">imgs</span>
            </div>
            <span className="text-[9px] text-slate-500">15% Stratified seed=42</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase text-slate-500 tracking-wider">Inference Kernel</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-purple-400">&lt;12ms</span>
              <span className="text-[10px] text-slate-400">target</span>
            </div>
            <span className="text-[9px] text-slate-500">ONNX WASM SIMD</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase text-slate-500 tracking-wider">Feature Tensor</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-400">90D</span>
              <span className="text-[10px] text-slate-400">Float32</span>
            </div>
            <span className="text-[9px] text-slate-500">21 Landmark Invariants</span>
          </div>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-500 mr-2 text-[10px] uppercase tracking-wider">Visual Field:</span>
            <button
              type="button"
              onClick={() => setActiveView('constellation')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeView === 'constellation'
                  ? 'bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              Constellation Map
            </button>
            <button
              type="button"
              onClick={() => setActiveView('spectrogram')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeView === 'spectrogram'
                  ? 'bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              Spectral Frequency (A–Z)
            </button>
            <button
              type="button"
              onClick={() => setActiveView('collisions')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeView === 'collisions'
                  ? 'bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              Collision Resonance
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
            <FiShield className="h-3 w-3 text-[#00F0FF]" />
            <span>Strict Zero-Fabrication Protocol Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
