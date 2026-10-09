import { FiActivity } from 'react-icons/fi';

export default function ModelPerformanceCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col gap-3 max-w-[280px] sm:max-w-[320px] select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 font-mono text-xs">
        <div className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[11px]">
          <FiActivity className="h-3.5 w-3.5 text-cyan-400" />
          <span>Model Architecture</span>
        </div>
        <span className="text-[9px] text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/25">
          159 KB ONNX
        </span>
      </div>

      {/* Neural Tensor Visualization Box */}
      <div className="relative h-28 w-full rounded-xl border border-cyan-500/20 bg-slate-900/90 overflow-hidden flex items-center justify-center p-3">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,217,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,217,255,0.04)_1px,transparent_1px)] bg-[size:12px_12px]" />

        <svg viewBox="0 0 200 90" className="w-full h-full relative z-10 drop-shadow-[0_0_8px_rgba(0,217,255,0.4)]">
          <g stroke="rgba(0, 217, 255, 0.25)" strokeWidth="0.8">
            {[20, 35, 50, 65].map((y1) =>
              [15, 30, 45, 60, 75].map((y2, idx) => (
                <line key={`l1-${y1}-${idx}`} x1="30" y1={y1} x2="100" y2={y2} />
              ))
            )}
            {[15, 30, 45, 60, 75].map((y1) =>
              [25, 45, 65].map((y2, idx) => (
                <line key={`l2-${y1}-${idx}`} x1="100" y1={y1} x2="170" y2={y2} />
              ))
            )}
          </g>

          {[20, 35, 50, 65].map((y, idx) => (
            <circle key={`in-${idx}`} cx="30" cy={y} r="3.5" fill="#38BDF8" stroke="#00D9FF" strokeWidth="1" />
          ))}

          {[15, 30, 45, 60, 75].map((y, idx) => (
            <circle key={`hid-${idx}`} cx="100" cy={y} r="3" fill="#FFFFFF" stroke="#00D9FF" strokeWidth="1" />
          ))}

          {[25, 45, 65].map((y, idx) => (
            <circle key={`out-${idx}`} cx="170" cy={y} r="4" fill="#00D9FF" stroke="#38BDF8" strokeWidth="1.2" />
          ))}

          <text x="30" y="84" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">
            IN (90)
          </text>
          <text x="100" y="84" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">
            DENSE
          </text>
          <text x="170" y="84" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">
            OUT (26)
          </text>
        </svg>

        <div className="absolute top-2 left-2 flex items-center gap-1 text-[8.5px] font-mono text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>FEEDFORWARD</span>
        </div>
      </div>

      {/* Key Metrics Breakdown */}
      <div className="flex flex-col gap-2 font-mono text-xs pt-1">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
          <span className="text-[10px] text-slate-400">Overall Accuracy</span>
          <span className="font-bold text-white text-[11px]">Standby (Zero-Fab)</span>
        </div>

        <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
          <span className="text-[10px] text-slate-400">Gating Threshold</span>
          <span className="font-bold text-cyan-300 text-[11px]">0.75 Temporal</span>
        </div>

        <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
          <span className="text-[10px] text-slate-400">Dataset Samples</span>
          <span className="font-bold text-white text-[11px]">11,742 Kaggle</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Alphabet Coverage</span>
          <span className="font-bold text-emerald-400 text-[11px]">26 Classes (A–Z)</span>
        </div>
      </div>
    </div>
  );
}
