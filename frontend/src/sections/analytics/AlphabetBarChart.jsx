import { useState } from 'react';
import { FiBarChart2, FiInfo, FiCheckCircle } from 'react-icons/fi';

export default function AlphabetBarChart({ classPerformance, datasetSamples = {} }) {
  const [hoveredLetter, setHoveredLetter] = useState(null);

  const classes = classPerformance || [];
  const maxSample = Math.max(...Object.values(datasetSamples), 500);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono text-xs">
          <div className="flex items-center gap-2">
            <FiBarChart2 className="h-4 w-4 text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-wider">
              A–Z Class Recognition &amp; Dataset Support
            </span>
          </div>
          <span className="text-[10px] text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/25">
            26 Alphabet Classes
          </span>
        </div>

        {/* Vertical Bars Container */}
        <div className="mt-4 flex items-end justify-between gap-1 sm:gap-1.5 h-36 px-1 select-none">
          {classes.map((cls) => {
            const letter = cls.label;
            const count = datasetSamples[letter] || 400;
            const heightPct = Math.max(20, Math.round((count / maxSample) * 100));
            const isHovered = hoveredLetter?.label === letter;
            const isUnder300 = count < 300;

            return (
              <div
                key={letter}
                onMouseEnter={() => setHoveredLetter({ ...cls, count })}
                onMouseLeave={() => setHoveredLetter(null)}
                className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
              >
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 group-hover:scale-y-105 ${
                    isHovered
                      ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]'
                      : isUnder300
                      ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-gradient-to-t from-blue-600 to-cyan-400 shadow-[0_0_8px_rgba(0,217,255,0.25)]'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />

                {/* Letter underneath */}
                <span
                  className={`mt-1.5 font-mono text-[10px] font-bold transition-colors ${
                    isHovered ? 'text-white scale-125' : 'text-slate-400 group-hover:text-cyan-300'
                  }`}
                >
                  {letter}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Readout */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
        {hoveredLetter ? (
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Class '{hoveredLetter.label}':</span>
            <span className="text-cyan-400 font-bold">{hoveredLetter.count} Samples</span>
            <span className="text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              · {hoveredLetter.handshape}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <FiInfo className="h-3.5 w-3.5 text-cyan-400" />
            <span>Hover any class bar to inspect training support and handshape pose. Accuracy: Standby.</span>
          </div>
        )}

        <span className="text-slate-500 text-[10px] shrink-0">11,742 Total Samples</span>
      </div>
    </div>
  );
}
