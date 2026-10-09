import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { ANALYTICS_DATA } from '../../lib/analyticsData.js';

export default function AlphabetPerformanceList({ selectedLetter, onSelectLetter }) {
  const [search, setSearch] = useState('');

  const classes = ANALYTICS_DATA.classPerformance || [];
  const samples = ANALYTICS_DATA.dataset?.samplesPerClass || {};

  const filtered = classes.filter(
    (c) =>
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.handshape.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col justify-between select-none h-full min-h-[220px]">
      <div>
        {/* Table Header & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Class Telemetry
            </span>
            <span className="text-[10px] text-cyan-300 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/25">
              26 Classes
            </span>
          </div>

          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter class..."
              className="rounded-lg border border-white/10 bg-slate-900/90 pl-7 pr-2.5 py-1 text-[10px] text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 w-28 sm:w-32 transition-colors font-mono"
            />
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-1 py-1.5 border-b border-white/5 font-mono text-[9px] uppercase tracking-wider text-slate-500">
          <span className="col-span-2">ID</span>
          <span className="col-span-6">Handshape Pose</span>
          <span className="col-span-2 text-right">Samples</span>
          <span className="col-span-2 text-right">Status</span>
        </div>

        {/* Scrollable Class Rows */}
        <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1 font-mono text-xs scrollbar-thin">
          {filtered.map((item) => {
            const count = samples[item.label] || 400;
            const isLow = count < 300;
            const isSelected = selectedLetter === item.label;

            return (
              <div
                key={item.label}
                onClick={() => onSelectLetter?.(item.label)}
                className={`grid grid-cols-12 gap-1 items-center px-1.5 py-1 rounded-lg transition-colors cursor-pointer text-[10px] ${
                  isSelected
                    ? 'bg-cyan-500/20 text-white border border-cyan-400/40'
                    : 'hover:bg-white/5 text-slate-300'
                }`}
              >
                {/* ID / Letter */}
                <span className="col-span-2 font-bold text-cyan-300 flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${isLow ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                  <span>{item.label}</span>
                </span>

                {/* Handshape Description */}
                <span className="col-span-6 truncate text-slate-400 text-[9.5px]">
                  {item.handshape}
                </span>

                {/* Samples */}
                <span className="col-span-2 text-right text-slate-300 font-semibold text-[9.5px]">
                  {count}
                </span>

                {/* Status Indicator */}
                <span className="col-span-2 text-right">
                  {isLow ? (
                    <span className="text-[8.5px] text-amber-400 font-bold bg-amber-400/10 px-1 py-0.5 rounded">
                      DYN
                    </span>
                  ) : (
                    <span className="text-[8.5px] text-emerald-400 font-bold bg-emerald-400/10 px-1 py-0.5 rounded">
                      NOM
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Readout */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-slate-500">
        <span>Showing {filtered.length} of 26 alphabet items</span>
        <span className="text-cyan-400">11,742 Total Samples</span>
      </div>
    </div>
  );
}
