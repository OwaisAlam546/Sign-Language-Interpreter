import { useState } from 'react';
import { FiActivity, FiTerminal, FiCopy, FiCheck, FiLayers, FiAlertTriangle } from 'react-icons/fi';
import { CONSTELLATION_NODES, COLLISION_FILAMENTS } from './SignalFieldCanvas.jsx';

export default function SignalResonanceMatrix({ activeView, onSelectLetter }) {
  const [copied, setCopied] = useState(false);
  const [hoveredFilament, setHoveredFilament] = useState(null);
  const evalCmd = 'python backend/ai-service/scripts/evaluate_alphabet_landmark_model.py';

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(evalCmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const maxSamples = Math.max(...CONSTELLATION_NODES.map((n) => n.samples), 500);

  if (activeView === 'spectrogram') {
    return (
      <div className="w-full rounded-3xl border border-white/10 bg-[#070A0F] p-6 sm:p-8 font-mono text-xs shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
          <div>
            <span className="text-[10px] uppercase text-[#00F0FF] tracking-widest font-bold">
              SPECTRAL DISTRIBUTION
            </span>
            <h3 className="font-display text-xl font-bold text-white mt-0.5">
              A–Z Ground Truth Sample Resonances
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Kaggle ASL Alphabet (11,742 total samples)
          </span>
        </div>

        {/* Continuous Frequency Landscape */}
        <div className="space-y-2 pt-2">
          <div className="h-48 sm:h-56 flex items-end gap-1.5 sm:gap-2 px-2 py-4 bg-black/40 rounded-2xl border border-white/5 overflow-x-auto scrollbar-thin">
            {CONSTELLATION_NODES.map((node) => {
              const heightPct = Math.round((node.samples / maxSamples) * 100);
              const isUnder300 = node.samples < 300;

              return (
                <div
                  key={node.id}
                  onClick={() => onSelectLetter && onSelectLetter(node)}
                  className="flex-1 min-w-[24px] sm:min-w-[28px] h-full flex flex-col justify-end items-center group cursor-pointer"
                >
                  {/* Floating tooltip */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-[#00F0FF] mb-1 font-bold">
                    {node.samples}
                  </span>

                  {/* Spectral Bar */}
                  <div
                    className={`w-full rounded-t-sm transition-all duration-300 group-hover:brightness-125 ${
                      isUnder300
                        ? 'bg-gradient-to-t from-rose-600/60 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                        : 'bg-gradient-to-t from-[#00F0FF]/30 to-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />

                  {/* Letter Glyph below */}
                  <span className="mt-2 text-xs font-bold text-slate-300 group-hover:text-[#00F0FF] transition-colors">
                    {node.id}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 pt-2">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-xs bg-rose-500" />
              <span>Under-represented support (&lt;300 imgs: N=166, M=290)</span>
            </span>
            <span>Click any harmonic bar to focus inspection</span>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'collisions') {
    return (
      <div className="w-full rounded-3xl border border-white/10 bg-[#070A0F] p-6 sm:p-8 font-mono text-xs shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
          <div>
            <span className="text-[10px] uppercase text-rose-400 tracking-widest font-bold">
              KINEMATIC FLUX
            </span>
            <h3 className="font-display text-xl font-bold text-white mt-0.5">
              Ambiguity Collision Vectors &amp; Disambiguation
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {COLLISION_FILAMENTS.length} Critical Vectors Monitored
          </span>
        </div>

        {/* Collision Pairs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {COLLISION_FILAMENTS.map((f) => (
            <div
              key={`${f.from}-${f.to}`}
              onMouseEnter={() => setHoveredFilament(f)}
              onMouseLeave={() => setHoveredFilament(null)}
              className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[#00F0FF]/50 transition-all flex flex-col justify-between space-y-2 group"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-base font-bold text-white group-hover:text-[#00F0FF] transition-colors">
                    {f.label}
                  </span>
                  <span
                    className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold ${
                      f.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : f.severity === 'dynamic'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {f.severity}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">
                  {f.reason}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500">
                Safeguard: <strong className="text-slate-300">{f.dim}</strong>
              </div>
            </div>
          ))}
        </div>

        {/* Terminal Pipeline Launcher */}
        <div className="p-4 rounded-2xl border border-white/10 bg-black/50 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-2 text-[#00F0FF] font-bold">
              <FiTerminal className="h-4 w-4" />
              <span>Execute Verification Benchmark (CLI)</span>
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-[#00F0FF] transition-colors cursor-pointer"
            >
              {copied ? <FiCheck className="h-3.5 w-3.5 text-emerald-400" /> : <FiCopy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Command'}</span>
            </button>
          </div>
          <div className="p-2.5 rounded-lg bg-black border border-white/5 text-[#00F0FF]">
            <code>{evalCmd}</code>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
