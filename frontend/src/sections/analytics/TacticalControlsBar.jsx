import { useState } from 'react';
import { FiLayers, FiShield, FiSliders, FiCpu } from 'react-icons/fi';

export default function TacticalControlsBar() {
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    <div className="flex flex-col gap-3 font-mono text-xs select-none">
      {/* PIPELINE GATING */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold px-1">
          Pipeline Gate
        </span>

        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-slate-950/80 px-3 py-2 text-[10px] text-cyan-300 backdrop-blur-xl shadow-lg hover:border-cyan-400/60 transition-colors cursor-pointer text-left"
        >
          <FiShield className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <div>
            <div className="font-bold text-white">0.75 Gate</div>
            <div className="text-[8px] text-slate-400">Confidence Threshold</div>
          </div>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[10px] text-slate-300 backdrop-blur-xl shadow-md hover:border-white/20 transition-colors cursor-pointer text-left"
        >
          <FiSliders className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <div>
            <div className="font-bold text-white">5-Frame Buffer</div>
            <div className="text-[8px] text-slate-400">Temporal Window</div>
          </div>
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-white/10">
        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold px-1">
          Engine Filters
        </span>

        <button
          type="button"
          onClick={() => setActiveFilter(activeFilter === 'all' ? 'landmarks' : 'all')}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] backdrop-blur-xl transition-all cursor-pointer text-left ${
            activeFilter === 'all'
              ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
              : 'border-white/10 bg-slate-950/70 text-slate-400'
          }`}
        >
          <FiLayers className="h-3.5 w-3.5 shrink-0" />
          <span>26 Alphabet Classes</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[10px] text-slate-400 backdrop-blur-xl hover:text-white transition-colors cursor-pointer text-left"
        >
          <FiCpu className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>SIMD Acceleration</span>
        </button>
      </div>
    </div>
  );
}
