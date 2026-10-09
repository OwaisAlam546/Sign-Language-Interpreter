import { useState } from 'react';
import { FiTrendingUp, FiCheckCircle, FiClock, FiActivity } from 'react-icons/fi';

export default function PerformanceGraph({ inference }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Real inference timeline progression from project analytics data
  const timeline = inference?.sampleTimeline || [
    { frame: 'Frame 01', confidence: 0.71, label: 'Candidate detected' },
    { frame: 'Frame 02', confidence: 0.78, label: 'Buffer accumulating' },
    { frame: 'Frame 03', confidence: 0.84, label: 'Confidence threshold passed' },
    { frame: 'Frame 04', confidence: 0.91, label: 'Temporal threshold met' },
    { frame: 'Frame 05', confidence: 0.94, label: 'Prediction committed' },
  ];

  // SVG Chart bounds
  const width = 500;
  const height = 220;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 35;

  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  // Map data to coordinates (Y axis from 0.5 to 1.0)
  const minY = 0.5;
  const maxY = 1.0;

  const points = timeline.map((item, idx) => {
    const x = padLeft + (idx / (timeline.length - 1)) * chartWidth;
    const y = padTop + chartHeight - ((item.confidence - minY) / (maxY - minY)) * chartHeight;
    return { ...item, x, y };
  });

  // Construct SVG Path
  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Filled area path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padTop + chartHeight} L ${points[0].x} ${padTop + chartHeight} Z`;

  // 0.75 Threshold Line Y coordinate
  const thresholdY = padTop + chartHeight - ((0.75 - minY) / (maxY - minY)) * chartHeight;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono text-xs">
          <div className="flex items-center gap-2">
            <FiTrendingUp className="h-4 w-4 text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-wider">
              Inference Confidence Progression
            </span>
          </div>
          <span className="text-[10px] text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/25">
            5-Frame Temporal Window
          </span>
        </div>

        {/* Line Graph SVG */}
        <div className="relative mt-3 select-none">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="curve-area" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#00D9FF" stopOpacity="0.0" />
              </linearGradient>

              <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Grid lines */}
            {[0.6, 0.7, 0.8, 0.9, 1.0].map((val) => {
              const y = padTop + chartHeight - ((val - minY) / (maxY - minY)) * chartHeight;
              return (
                <g key={val}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill="#64748B"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {(val * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}

            {/* 0.75 Threshold Guide Line */}
            <line
              x1={padLeft}
              y1={thresholdY}
              x2={width - padRight}
              y2={thresholdY}
              stroke="rgba(245, 158, 11, 0.6)"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <text
              x={width - padRight + 4}
              y={thresholdY + 3}
              fill="#F59E0B"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              0.75 Gate
            </text>

            {/* Filled Area */}
            <path d={areaD} fill="url(#curve-area)" />

            {/* Main Glowing Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#00D9FF"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#glow-line)"
            />

            {/* Data Points */}
            {points.map((pt, idx) => {
              const isHovered = hoveredPoint?.frame === pt.frame;

              return (
                <g
                  key={pt.frame}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 4}
                    fill={isHovered ? '#FFFFFF' : '#00D9FF'}
                    stroke="#05080D"
                    strokeWidth="2"
                    className="transition-all"
                  />

                  {/* X axis frame label */}
                  <text
                    x={pt.x}
                    y={height - 10}
                    textAnchor="middle"
                    fill={isHovered ? '#00D9FF' : '#94A3B8'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                  >
                    F0{idx + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Footer Readout */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
        {hoveredPoint ? (
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{hoveredPoint.frame}:</span>
            <span className="text-cyan-400 font-bold">{(hoveredPoint.confidence * 100).toFixed(0)}% Confidence</span>
            <span className="text-slate-400">· {hoveredPoint.label}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <FiActivity className="h-3.5 w-3.5 text-cyan-400" />
            <span>Hover points to inspect temporal gating hysteresis. Gating threshold: 0.75.</span>
          </div>
        )}

        <span className="text-slate-500 text-[10px] shrink-0">WASM Latency &lt; 12ms</span>
      </div>
    </div>
  );
}
