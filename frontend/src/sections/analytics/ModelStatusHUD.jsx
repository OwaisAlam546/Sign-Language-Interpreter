import { FiActivity, FiCpu, FiEye, FiZap, FiCheckCircle } from 'react-icons/fi';

export default function ModelStatusHUD() {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3.5 sm:p-4 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col gap-2.5 max-w-[280px] sm:max-w-[320px] select-none">
      {/* Sensor / Landmark Wireframe Thumbnail */}
      <div className="relative h-28 w-full rounded-xl border border-cyan-500/20 bg-slate-900/90 overflow-hidden flex items-center justify-center">
        {/* Fine background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,217,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,217,255,0.05)_1px,transparent_1px)] bg-[size:14px_14px]" />

        {/* Radar scanline animation */}
        <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-cyan-400/15 to-transparent animate-pulse -top-2" />

        {/* Vector Hand Skeleton Wireframe (MediaPipe 21 landmarks topology) */}
        <svg viewBox="0 0 160 110" className="w-full h-full p-2 relative z-10 drop-shadow-[0_0_8px_rgba(0,217,255,0.5)]">
          {/* Skeleton bones (connecting lines) */}
          <g stroke="#00D9FF" strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round">
            <path d="M 80 95 L 60 75 L 68 55 L 80 52 L 95 55 L 105 75 Z" />
            <path d="M 60 75 L 42 68 L 32 58 L 24 50" />
            <path d="M 68 55 L 62 38 L 58 25 L 56 14" />
            <path d="M 80 52 L 80 32 L 80 18 L 80 8" />
            <path d="M 95 55 L 98 38 L 100 25 L 102 16" />
            <path d="M 105 75 L 118 62 L 124 50 L 128 40" />
          </g>

          {/* 21 Landmark Nodes */}
          {[
            [80, 95],
            [60, 75], [42, 68], [32, 58], [24, 50],
            [68, 55], [62, 38], [58, 25], [56, 14],
            [80, 52], [80, 32], [80, 18], [80, 8],
            [95, 55], [98, 38], [100, 25], [102, 16],
            [105, 75], [118, 62], [124, 50], [128, 40]
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === 0 ? 3.5 : 2.2}
              fill={i === 0 ? '#38BDF8' : '#FFFFFF'}
              stroke="#00D9FF"
              strokeWidth="1.2"
            />
          ))}
        </svg>

        {/* Top-right sensor indicator pill */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/80 border border-cyan-400/30 text-[9px] font-mono text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>21 LANDMARKS</span>
        </div>

        {/* Bottom coordinate badge */}
        <div className="absolute bottom-1.5 left-2 font-mono text-[9px] text-slate-400">
          POS: 12.9716°N, 77.5946°E
        </div>
      </div>

      {/* Model Spec Details */}
      <div className="flex flex-col gap-1 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white text-[11px] truncate">
            SignSpeak-DenseLandmark-v2
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <FiCheckCircle className="h-3 w-3" />
            <span>ONLINE</span>
          </span>
        </div>

        <div className="text-[10px] text-slate-400">
          ONNX Runtime Web · SIMD Multi-Thread
        </div>
      </div>

      {/* Live Technical Metrics Grid */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10 font-mono text-center">
        <div className="rounded-lg bg-white/5 p-1.5 border border-white/5">
          <div className="text-[9px] text-slate-400 uppercase">FPS</div>
          <div className="text-xs font-bold text-cyan-300">60.0</div>
        </div>
        <div className="rounded-lg bg-white/5 p-1.5 border border-white/5">
          <div className="text-[9px] text-slate-400 uppercase">LATENCY</div>
          <div className="text-xs font-bold text-emerald-400">&lt; 12ms</div>
        </div>
        <div className="rounded-lg bg-white/5 p-1.5 border border-white/5">
          <div className="text-[9px] text-slate-400 uppercase">TENSOR</div>
          <div className="text-xs font-bold text-white">1x90</div>
        </div>
      </div>
    </div>
  );
}
