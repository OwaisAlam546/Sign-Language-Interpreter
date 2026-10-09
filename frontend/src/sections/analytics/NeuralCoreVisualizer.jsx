import { useState, useEffect } from 'react';
import { FiActivity, FiLayers, FiCrosshair, FiMaximize2, FiCpu } from 'react-icons/fi';

// 21 MediaPipe hand landmark node names & canonical topological positions for normalized 2D projection
const LANDMARK_NODES = [
  { id: 0, name: 'Wrist', x: 200, y: 340, group: 'palm' },
  { id: 1, name: 'Thumb CMC', x: 165, y: 310, group: 'thumb' },
  { id: 2, name: 'Thumb MCP', x: 140, y: 275, group: 'thumb' },
  { id: 3, name: 'Thumb IP', x: 125, y: 240, group: 'thumb' },
  { id: 4, name: 'Thumb Tip', x: 115, y: 205, group: 'thumb' },
  { id: 5, name: 'Index MCP', x: 165, y: 220, group: 'index' },
  { id: 6, name: 'Index PIP', x: 155, y: 170, group: 'index' },
  { id: 7, name: 'Index DIP', x: 150, y: 130, group: 'index' },
  { id: 8, name: 'Index Tip', x: 145, y: 95, group: 'index' },
  { id: 9, name: 'Middle MCP', x: 200, y: 210, group: 'middle' },
  { id: 10, name: 'Middle PIP', x: 200, y: 155, group: 'middle' },
  { id: 11, name: 'Middle DIP', x: 200, y: 115, group: 'middle' },
  { id: 12, name: 'Middle Tip', x: 200, y: 80, group: 'middle' },
  { id: 13, name: 'Ring MCP', x: 235, y: 220, group: 'ring' },
  { id: 14, name: 'Ring PIP', x: 245, y: 170, group: 'ring' },
  { id: 15, name: 'Ring DIP', x: 250, y: 130, group: 'ring' },
  { id: 16, name: 'Ring Tip', x: 255, y: 95, group: 'ring' },
  { id: 17, name: 'Pinky MCP', x: 265, y: 245, group: 'pinky' },
  { id: 18, name: 'Pinky PIP', x: 280, y: 200, group: 'pinky' },
  { id: 19, name: 'Pinky DIP', x: 290, y: 165, group: 'pinky' },
  { id: 20, name: 'Pinky Tip', x: 300, y: 135, group: 'pinky' },
];

// Structural bone connections between landmark nodes
const BONE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],   // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17],             // Palm MCP arch
];

export default function NeuralCoreVisualizer({ onSelectClass }) {
  const [coreMode, setCoreMode] = useState('topology'); // 'topology' | 'features' | 'radar'
  const [hoveredNode, setHoveredNode] = useState(null);
  const [scanAngle, setScanAngle] = useState(0);

  // Radar continuous rotation sweep
  useEffect(() => {
    let animId;
    let angle = 0;
    const animate = () => {
      angle = (angle + 0.75) % 360;
      setScanAngle(angle);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5 backdrop-blur-2xl shadow-2xl overflow-hidden min-h-[460px]">
      {/* Background Radial Glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,217,255,0.08)_0%,rgba(139,92,246,0.04)_45%,transparent_70%)]"
        aria-hidden="true"
      />

      {/* Top HUD Strip */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          <span className="font-bold text-[var(--text-main)] uppercase tracking-wider">
            Neural Core Telemetry
          </span>
          <span className="text-[10px] text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/25">
            21-Pt Landmarker
          </span>
        </div>

        {/* Core Visualization Mode Switcher */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-[var(--border-subtle)] rounded-lg p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setCoreMode('topology')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              coreMode === 'topology'
                ? 'bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/40'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            Topology
          </button>
          <button
            type="button"
            onClick={() => setCoreMode('features')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              coreMode === 'features'
                ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            90D Tensors
          </button>
          <button
            type="button"
            onClick={() => setCoreMode('radar')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              coreMode === 'radar'
                ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            Radar
          </button>
        </div>
      </div>

      {/* Main Interactive Vector Display Area */}
      <div className="relative my-auto flex items-center justify-center py-2">
        <svg
          viewBox="0 0 400 380"
          className="w-full max-w-[340px] sm:max-w-[380px] h-auto select-none"
          role="img"
          aria-label="Interactive hand landmark neural topology radar"
        >
          <defs>
            {/* Radar scanner gradient */}
            <linearGradient id="scanner-beam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
            </linearGradient>

            {/* Bone stroke gradient */}
            <linearGradient id="bone-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D9FF" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="glow-node" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Concentric Telemetry Target Rings */}
          <circle cx="200" cy="190" r="170" fill="none" stroke="currentColor" className="text-white/[0.04]" strokeWidth="1" strokeDasharray="3 6" />
          <circle cx="200" cy="190" r="125" fill="none" stroke="currentColor" className="text-cyan-400/[0.08]" strokeWidth="1" />
          <circle cx="200" cy="190" r="80" fill="none" stroke="currentColor" className="text-purple-400/[0.08]" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="200" cy="190" r="35" fill="none" stroke="currentColor" className="text-white/[0.06]" strokeWidth="1" />

          {/* Crosshairs & Angle Graticules */}
          <line x1="200" y1="15" x2="200" y2="365" stroke="currentColor" className="text-white/[0.05]" strokeWidth="1" />
          <line x1="25" y1="190" x2="375" y2="190" stroke="currentColor" className="text-white/[0.05]" strokeWidth="1" />

          <text x="200" y="24" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">000° N</text>
          <text x="370" y="193" textAnchor="end" fill="#64748B" fontSize="8" fontFamily="monospace">090° E</text>
          <text x="200" y="362" textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">180° S</text>
          <text x="30" y="193" textAnchor="start" fill="#64748B" fontSize="8" fontFamily="monospace">270° W</text>

          {/* Rotating Radar Scan Arc (In Radar Mode) */}
          {coreMode === 'radar' && (
            <g transform={`rotate(${scanAngle} 200 190)`}>
              <line x1="200" y1="190" x2="200" y2="25" stroke="#00D9FF" strokeWidth="1.5" opacity="0.8" />
              <path
                d="M 200 190 L 200 25 A 165 165 0 0 1 315 70 Z"
                fill="url(#scanner-beam)"
              />
            </g>
          )}

          {/* Hand Landmark Bone Connections (Lines) */}
          <g>
            {BONE_CONNECTIONS.map(([startIdx, endIdx]) => {
              const start = LANDMARK_NODES[startIdx];
              const end = LANDMARK_NODES[endIdx];
              const isHighlighted =
                hoveredNode !== null &&
                (hoveredNode === startIdx || hoveredNode === endIdx);

              return (
                <line
                  key={`${startIdx}-${endIdx}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={isHighlighted ? '#00D9FF' : 'url(#bone-grad)'}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  strokeOpacity={isHighlighted ? 1 : 0.6}
                  strokeLinecap="round"
                  className="transition-all duration-200"
                />
              );
            })}
          </g>

          {/* Hand Landmark Nodes (Circles) */}
          <g>
            {LANDMARK_NODES.map((node) => {
              const isHovered = hoveredNode === node.id;
              const isWrist = node.id === 0;
              const isTip = [4, 8, 12, 16, 20].includes(node.id);

              let nodeColor = '#38BDF8';
              if (isWrist) nodeColor = '#8B5CF6';
              else if (isTip) nodeColor = '#00D9FF';

              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                >
                  {/* Outer pulse aura if hovered */}
                  {isHovered && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="10"
                      fill="none"
                      stroke="#00D9FF"
                      strokeWidth="1.5"
                      opacity="0.8"
                      className="animate-ping"
                    />
                  )}

                  {/* Primary Node Point */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isHovered ? 5.5 : isWrist ? 5 : isTip ? 4 : 3}
                    fill={nodeColor}
                    stroke="#05080D"
                    strokeWidth="1.5"
                    filter={isHovered || isTip ? 'url(#glow-node)' : undefined}
                    className="transition-all duration-150"
                  />

                  {/* Label on Tips or when hovered */}
                  {(isHovered || isTip || isWrist) && (
                    <text
                      x={node.x}
                      y={node.y - (isHovered ? 9 : 7)}
                      textAnchor="middle"
                      fill={isHovered ? '#FFFFFF' : '#94A3B8'}
                      fontSize={isHovered ? '9' : '7.5'}
                      fontWeight={isHovered ? 'bold' : 'normal'}
                      fontFamily="monospace"
                      className="pointer-events-none select-none"
                    >
                      {node.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Central Telemetry Targeting Reticle */}
          <circle cx="200" cy="190" r="12" fill="none" stroke="#00D9FF" strokeWidth="1" opacity="0.4" strokeDasharray="2 3" />
          <circle cx="200" cy="190" r="2.5" fill="#00D9FF" opacity="0.8" />
        </svg>
      </div>

      {/* Bottom Telemetry Readout Box */}
      <div className="relative z-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/90 p-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiCrosshair className="h-3.5 w-3.5 text-cyan-400" />
            {hoveredNode !== null ? (
              <span className="text-[var(--text-main)] font-bold">
                Selected Landmark #{hoveredNode}: {LANDMARK_NODES[hoveredNode].name}
              </span>
            ) : (
              <span className="text-[var(--text-sub)]">
                Active Telemetry: Hover nodes to inspect 3D spatial keypoints
              </span>
            )}
          </div>
          <span className="text-[10px] text-cyan-400 font-semibold">
            {coreMode === 'features' ? '90 Invariant Dimensions' : 'Scale Normalized'}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-[var(--text-sub)] pt-2 border-t border-[var(--border-subtle)]">
          <div>
            <span className="block text-[9px] uppercase">Translation:</span>
            <span className="text-[var(--text-main)] font-bold">Wrist Origin (0,0,0)</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase">Scale Invariant:</span>
            <span className="text-[var(--text-main)] font-bold">Palm Extent / R-Max</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase">Gating Window:</span>
            <span className="text-emerald-400 font-bold">4 Frames &gt; 0.75</span>
          </div>
        </div>
      </div>
    </div>
  );
}
