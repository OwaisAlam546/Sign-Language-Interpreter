import { useState, useEffect, useRef } from 'react';
import { FiActivity, FiZap, FiTarget, FiInfo, FiLayers, FiMinimize2 } from 'react-icons/fi';

// Topological coordinates for 26 ASL alphabet signs in a 1000x600 normalized signal coordinate field.
// Positioned organically by kinematic handshape clustering:
// - Fist cluster (A, M, N, S, T, E)
// - Pointing & directional signs (D, G, H, L, P, Q)
// - Spread & open finger handshapes (B, C, F, K, R, U, V, W, Y)
// - Curled & hooked handshapes (O, X)
// - Pinky & motion signs (I, J, Z)
export const CONSTELLATION_NODES = [
  { id: 'A', x: 260, y: 190, group: 'fist', label: 'A', name: 'Closed Fist / Thumb Lateral', samples: 455 },
  { id: 'B', x: 680, y: 110, group: 'open', label: 'B', name: '4 Fingers Upright / Thumb Folded', samples: 438 },
  { id: 'C', x: 520, y: 220, group: 'curved', label: 'C', name: 'Curved Open C Arc', samples: 489 },
  { id: 'D', x: 420, y: 140, group: 'pointer', label: 'D', name: 'Index Upright / Oval Base', samples: 494 },
  { id: 'E', x: 380, y: 310, group: 'fist', label: 'E', name: 'Curled Fingers on Tucked Thumb', samples: 459 },
  { id: 'F', x: 730, y: 180, group: 'open', label: 'F', name: 'Index & Thumb Circle / 3 Spread', samples: 489 },
  { id: 'G', x: 480, y: 440, group: 'pointer', label: 'G', name: 'Horizontal Index / Thumb Parallel', samples: 475 },
  { id: 'H', x: 570, y: 410, group: 'pointer', label: 'H', name: 'Index & Middle Extended Horizontal', samples: 479 },
  { id: 'I', x: 880, y: 240, group: 'pinky', label: 'I', name: 'Pinky Upright / Fist Base', samples: 469 },
  { id: 'J', x: 890, y: 360, group: 'dynamic', label: 'J', name: 'Pinky Swooping J Motion Trace', samples: 445 },
  { id: 'K', x: 620, y: 250, group: 'open', label: 'K', name: 'Index Up / Middle Forward / Thumb Mid', samples: 498 },
  { id: 'L', x: 340, y: 110, group: 'pointer', label: 'L', name: 'Index Up / Thumb 90° Right Angle', samples: 436 },
  { id: 'M', x: 190, y: 290, group: 'fist', label: 'M', name: 'Thumb Tucked Under 3 Fingers', samples: 290 },
  { id: 'N', x: 230, y: 370, group: 'fist', label: 'N', name: 'Thumb Tucked Under 2 Fingers', samples: 166 },
  { id: 'O', x: 580, y: 290, group: 'curved', label: 'O', name: 'All Fingertips Meeting Thumb', samples: 487 },
  { id: 'P', x: 430, y: 510, group: 'pointer', label: 'P', name: 'Downward Angled K Pose', samples: 495 },
  { id: 'Q', x: 350, y: 480, group: 'pointer', label: 'Q', name: 'Downward Pointing Index / Thumb', samples: 481 },
  { id: 'R', x: 760, y: 260, group: 'open', label: 'R', name: 'Index & Middle Crossed Upright', samples: 480 },
  { id: 'S', x: 290, y: 270, group: 'fist', label: 'S', name: 'Solid Fist / Thumb Wrapped Across', samples: 500 },
  { id: 'T', x: 310, y: 360, group: 'fist', label: 'T', name: 'Thumb Tucked Between Index & Middle', samples: 462 },
  { id: 'U', x: 790, y: 140, group: 'open', label: 'U', name: 'Index & Middle Held Together Up', samples: 457 },
  { id: 'V', x: 840, y: 160, group: 'open', label: 'V', name: 'Index & Middle Spread (Peace)', samples: 452 },
  { id: 'W', x: 850, y: 90, group: 'open', label: 'W', name: '3 Fingers Spread Upward', samples: 411 },
  { id: 'X', x: 130, y: 420, group: 'hooked', label: 'X', name: 'Index Hooked Knuckle in Fist', samples: 449 },
  { id: 'Y', x: 820, y: 320, group: 'open', label: 'Y', name: 'Thumb & Pinky Flared Wide', samples: 491 },
  { id: 'Z', x: 440, y: 360, group: 'dynamic', label: 'Z', name: 'Index Dynamic Zigzag Path', samples: 495 },
];

// Documented collision filaments connecting ambiguous letter pairs in ASL
export const COLLISION_FILAMENTS = [
  { from: 'M', to: 'N', label: 'M ⟷ N', reason: 'Thumb under 3 vs 2 folded fingers', dim: 'Dim #78: Thumb-to-Ring PIP', severity: 'critical' },
  { from: 'A', to: 'M', label: 'A ⟷ M', reason: 'Thumb lateral vs thumb tucked under 3', dim: 'Dim #82: Thumb Z-Depth', severity: 'high' },
  { from: 'S', to: 'T', label: 'S ⟷ T', reason: 'Thumb across front vs tucked between fingers', dim: 'Dim #76: Thumb-to-Middle PIP', severity: 'high' },
  { from: 'A', to: 'S', label: 'A ⟷ S', reason: 'Thumb resting beside vs wrapped across front', dim: 'Dim #74: Thumb-to-Index MCP', severity: 'medium' },
  { from: 'Q', to: 'P', label: 'Q ⟷ P', reason: 'Downward G pointing vs downward K handshape', dim: 'Dim #88: Middle Downward Vector', severity: 'high' },
  { from: 'G', to: 'P', label: 'G ⟷ P', reason: 'Horizontal index vs downward pitch angle', dim: 'Dim #89: Wrist Pitch Vector', severity: 'medium' },
  { from: 'G', to: 'Q', label: 'G ⟷ Q', reason: 'Horizontal vs downward pointing G pose', dim: 'Dim #87: Hand Normal Pitch', severity: 'medium' },
  { from: 'X', to: 'S', label: 'X ⟷ S', reason: 'Hooked bent knuckle collapses to flat fist', dim: 'Dim #69: Index PIP Cos-Angle', severity: 'high' },
  { from: 'X', to: 'E', label: 'X ⟷ E', reason: 'Hooked index vs all fingers curled onto thumb', dim: 'Dim #64: Finger Curl Ratios', severity: 'medium' },
  { from: 'J', to: 'I', label: 'J ⟷ I', reason: 'Single-frame freeze of J trace looks like I', dim: 'Gating: 4-Frame Temporal Buffer', severity: 'dynamic' },
  { from: 'Z', to: 'D', label: 'Z ⟷ D', reason: 'Freeze-frame of zigzag stroke resembles upright D', dim: 'Gating: Velocity Vector Queue', severity: 'dynamic' },
  { from: 'K', to: 'V', label: 'K ⟷ V', reason: 'Thumb between index/middle vs open V-spread', dim: 'Dim #84: Inter-finger Spread', severity: 'medium' },
  { from: 'E', to: 'O', label: 'E ⟷ O', reason: 'Curled fingertips touch thumb tip radius', dim: 'Dim #72: Fingertip Bounding Circle', severity: 'medium' },
];

export default function SignalFieldCanvas({
  selectedNode,
  onSelectNode,
  activeFilter,
  showFilaments = true,
}) {
  const [hoveredLetter, setHoveredLetter] = useState(null);
  const [hoveredFilament, setHoveredFilament] = useState(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Micro ambient animation phase
  useEffect(() => {
    let animId;
    let t = 0;
    const loop = () => {
      t += 0.03;
      setPulsePhase(t);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const activeFocus = selectedNode?.id || hoveredLetter;

  // Find all collision partners of active letter
  const activeConnectedLetters = new Set();
  if (activeFocus) {
    activeConnectedLetters.add(activeFocus);
    COLLISION_FILAMENTS.forEach((f) => {
      if (f.from === activeFocus) activeConnectedLetters.add(f.to);
      if (f.to === activeFocus) activeConnectedLetters.add(f.from);
    });
  }

  // Node position dictionary for fast link lookup
  const nodeMap = {};
  CONSTELLATION_NODES.forEach((n) => {
    nodeMap[n.id] = n;
  });

  return (
    <div className="relative w-full h-[480px] sm:h-[560px] md:h-[620px] rounded-3xl border border-white/10 bg-[#070A0F] overflow-hidden select-none shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
      {/* Background Laboratory Graticule Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14] bg-[radial-gradient(#00F0FF_1px,transparent_1px)] [background-size:28px_28px]"
        aria-hidden="true"
      />

      {/* Atmospheric Signal Horizon Glow */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[450px] w-[450px] rounded-full bg-[#00F0FF]/10 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[450px] w-[450px] rounded-full bg-[#8B5CF6]/10 blur-[130px]"
        aria-hidden="true"
      />

      {/* Top Signal Coordinates & Precision Watermark */}
      <div className="absolute top-4 left-5 right-5 flex items-center justify-between text-[10px] font-mono tracking-widest text-slate-500 uppercase pointer-events-none z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[#00F0FF]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00F0FF] animate-ping" />
            LIVE SIGNAL FIELD
          </span>
          <span className="text-slate-600">/</span>
          <span>FIELD-DIM: 1000×600 MM</span>
          <span className="hidden sm:inline text-slate-600">/</span>
          <span className="hidden sm:inline">26 CLUSTER NODES</span>
        </div>

        <div className="flex items-center gap-3">
          <span>COLLISION FLUX: {COLLISION_FILAMENTS.length} VECTORS</span>
          <span className="hidden md:inline text-slate-600">/</span>
          <span className="hidden md:inline text-emerald-400">STANDBY ACCREDITED</span>
        </div>
      </div>

      {/* Primary SVG Constellation Canvas */}
      <svg
        viewBox="0 0 1000 600"
        className="w-full h-full relative z-10"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Laser beam gradient for critical collision filaments */}
          <linearGradient id="flux-critical" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="50%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#F43F5E" />
          </linearGradient>

          <linearGradient id="flux-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          {/* Node glow filters */}
          <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="laser-pulse" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Orbit Curves */}
        <ellipse cx="500" cy="300" rx="440" ry="240" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
        <ellipse cx="500" cy="300" rx="280" ry="150" fill="none" stroke="rgba(0,240,255,0.03)" strokeWidth="1" />
        <line x1="500" y1="20" x2="500" y2="580" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
        <line x1="20" y1="300" x2="980" y2="300" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

        {/* 1. Collision Filaments (Filament Vector Lines) */}
        {showFilaments && (
          <g className="transition-all duration-300">
            {COLLISION_FILAMENTS.map((filament) => {
              const startNode = nodeMap[filament.from];
              const endNode = nodeMap[filament.to];
              if (!startNode || !endNode) return null;

              const isDirectlyActive =
                activeFocus && (filament.from === activeFocus || filament.to === activeFocus);
              const isFilamentHovered =
                hoveredFilament?.from === filament.from && hoveredFilament?.to === filament.to;

              // Opacity logic
              let strokeOpacity = 0.18;
              let strokeWidth = 1.2;
              let strokeColor = 'rgba(0, 240, 255, 0.35)';

              if (filament.severity === 'critical') {
                strokeColor = 'rgba(244, 63, 94, 0.45)';
              } else if (filament.severity === 'dynamic') {
                strokeColor = 'rgba(139, 92, 246, 0.4)';
              }

              if (activeFocus) {
                if (isDirectlyActive) {
                  strokeOpacity = 1;
                  strokeWidth = 2.5;
                  strokeColor = filament.severity === 'critical' ? '#F43F5E' : '#00F0FF';
                } else {
                  strokeOpacity = 0.04; // Fade un-involved lines
                }
              }

              if (isFilamentHovered) {
                strokeOpacity = 1;
                strokeWidth = 3;
                strokeColor = '#00F0FF';
              }

              // Compute mid-point for micro label
              const midX = (startNode.x + endNode.x) / 2;
              const midY = (startNode.y + endNode.y) / 2;

              return (
                <g
                  key={`${filament.from}-${filament.to}`}
                  onMouseEnter={() => setHoveredFilament(filament)}
                  onMouseLeave={() => setHoveredFilament(null)}
                  className="cursor-pointer"
                >
                  {/* Invisible thicker hit-box */}
                  <line
                    x1={startNode.x}
                    y1={startNode.y}
                    x2={endNode.x}
                    y2={endNode.y}
                    stroke="transparent"
                    strokeWidth="14"
                  />

                  {/* Visible Laser Filament Line */}
                  <line
                    x1={startNode.x}
                    y1={startNode.y}
                    x2={endNode.x}
                    y2={endNode.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                    strokeDasharray={filament.severity === 'dynamic' ? '3 5' : isDirectlyActive ? 'none' : '4 4'}
                    filter={isDirectlyActive ? 'url(#laser-pulse)' : undefined}
                    className="transition-all duration-300"
                  />

                  {/* Pulsing traveling photon particle on active filaments */}
                  {isDirectlyActive && (
                    <circle
                      cx={startNode.x + (endNode.x - startNode.x) * ((Math.sin(pulsePhase * 2) + 1) / 2)}
                      cy={startNode.y + (endNode.y - startNode.y) * ((Math.sin(pulsePhase * 2) + 1) / 2)}
                      r="2.5"
                      fill="#FFFFFF"
                      filter="url(#neon-glow)"
                    />
                  )}

                  {/* Micro vector tag on hover or direct focus */}
                  {(isDirectlyActive || isFilamentHovered) && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-48"
                        y="-10"
                        width="96"
                        height="20"
                        rx="4"
                        fill="#05080D"
                        stroke="#00F0FF"
                        strokeWidth="1"
                        opacity="0.95"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#00F0FF"
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {filament.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* 2. Typographic Constellation Letter Nodes */}
        <g>
          {CONSTELLATION_NODES.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredLetter === node.id;
            const isTargeted = isSelected || isHovered;
            const isConnected = activeConnectedLetters.has(node.id);
            const isDimmed = activeFocus && !isConnected;

            // Ground truth sample count circle radius (proportional to dataset support)
            const sampleRadius = Math.max(14, Math.min(26, Math.sqrt(node.samples) * 0.95));

            let glyphColor = '#E2E8F0';
            let haloColor = 'rgba(0, 240, 255, 0.2)';
            let borderColor = 'rgba(255, 255, 255, 0.15)';

            if (node.group === 'fist') {
              haloColor = 'rgba(244, 63, 94, 0.25)';
              borderColor = 'rgba(244, 63, 94, 0.5)';
            } else if (node.group === 'pointer') {
              haloColor = 'rgba(245, 158, 11, 0.25)';
              borderColor = 'rgba(245, 158, 11, 0.5)';
            } else if (node.group === 'hooked') {
              haloColor = 'rgba(0, 240, 255, 0.35)';
              borderColor = '#00F0FF';
            } else if (node.group === 'dynamic') {
              haloColor = 'rgba(139, 92, 246, 0.3)';
              borderColor = '#8B5CF6';
            }

            if (isTargeted) {
              glyphColor = '#00F0FF';
              borderColor = '#00F0FF';
              haloColor = 'rgba(0, 240, 255, 0.5)';
            } else if (isDimmed) {
              glyphColor = '#334155';
              borderColor = 'rgba(255, 255, 255, 0.04)';
              haloColor = 'transparent';
            }

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onSelectNode(node)}
                onMouseEnter={() => setHoveredLetter(node.id)}
                onMouseLeave={() => setHoveredLetter(null)}
                className="cursor-pointer transition-all duration-200"
                style={{ opacity: isDimmed ? 0.22 : 1 }}
              >
                {/* Radiant Sample-Support Resonance Halo */}
                <circle
                  cx="0"
                  cy="0"
                  r={sampleRadius + (isTargeted ? 8 : 0)}
                  fill={haloColor}
                  stroke={borderColor}
                  strokeWidth={isTargeted ? 2 : 1}
                  strokeDasharray={isTargeted ? 'none' : '2 3'}
                  className="transition-all duration-300"
                />

                {/* Pulsing Target Ring if selected */}
                {isTargeted && (
                  <circle
                    cx="0"
                    cy="0"
                    r={sampleRadius + 15}
                    fill="none"
                    stroke="#00F0FF"
                    strokeWidth="1"
                    strokeOpacity="0.75"
                    className="animate-ping"
                  />
                )}

                {/* Core Glyph Center Backing */}
                <circle
                  cx="0"
                  cy="0"
                  r={15}
                  fill="#070A0F"
                  stroke={isTargeted ? '#00F0FF' : 'rgba(255,255,255,0.2)'}
                  strokeWidth="1.2"
                />

                {/* Oversized Typographic Letter Glyph */}
                <text
                  x="0"
                  y="5.5"
                  textAnchor="middle"
                  fill={glyphColor}
                  fontSize={isTargeted ? '16' : '14'}
                  fontWeight="900"
                  fontFamily="'Inter', system-ui, sans-serif"
                  filter={isTargeted ? 'url(#neon-glow)' : undefined}
                  className="select-none transition-all duration-200"
                >
                  {node.label}
                </text>

                {/* Sample frequency micro-tag beneath letter */}
                <text
                  x="0"
                  y="26"
                  textAnchor="middle"
                  fill={isTargeted ? '#00F0FF' : '#64748B'}
                  fontSize="7.5"
                  fontFamily="monospace"
                  fontWeight="600"
                  className="select-none"
                >
                  {node.samples}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Tactical Inspection Probe Readout (Bottom Center) */}
      <div className="absolute bottom-4 left-5 right-5 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-white/10 bg-[#090D14]/90 backdrop-blur-xl shadow-2xl font-mono text-xs text-slate-300">
        {activeFocus ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] font-bold text-sm">
              {activeFocus}
            </span>
            <div>
              <span className="font-bold text-white">
                Class '{activeFocus}' — {nodeMap[activeFocus]?.name}
              </span>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Support: <strong className="text-[#00F0FF]">{nodeMap[activeFocus]?.samples}</strong> images · Group: <span className="uppercase text-slate-300">{nodeMap[activeFocus]?.group}</span>
              </div>
            </div>
            {activeConnectedLetters.size > 1 && (
              <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
                {activeConnectedLetters.size - 1} Collision Vector{activeConnectedLetters.size - 1 > 1 ? 's' : ''} Active
              </span>
            )}
          </div>
        ) : hoveredFilament ? (
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">Collision Vector:</span>
            <span className="text-white font-bold">{hoveredFilament.label}</span>
            <span className="text-slate-400">· {hoveredFilament.reason}</span>
            <span className="text-[#00F0FF] bg-[#00F0FF]/10 px-1.5 py-0.2 rounded text-[10px]">
              {hoveredFilament.dim}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <FiActivity className="h-3.5 w-3.5 text-[#00F0FF]" />
            <span>Interactive Constellation: Hover letters or filaments to reveal topological confusion vectors. Click letter to lock probe.</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-[10px] text-slate-500 shrink-0 self-end sm:self-auto">
          <span>Kaggle 11,742 Base</span>
          <span className="text-slate-700">|</span>
          <span className="text-[#00F0FF]">Stratified 70/15/15</span>
        </div>
      </div>
    </div>
  );
}
