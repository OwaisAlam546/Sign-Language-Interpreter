import { useState, useRef, useCallback, useEffect } from 'react';
import {
  COUNTRIES,
  INDIA_PATH,
  GLOBAL_HUBS,
  BENGALURU_HUB,
  NETWORK_CONNECTIONS,
} from '../lib/worldMapData.js';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  FiZoomIn,
  FiZoomOut,
  FiRotateCcw,
  FiMapPin,
  FiMaximize2,
  FiActivity,
} from 'react-icons/fi';

export default function GlobalWorldMap() {
  const { isDark } = useTheme();
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredHub, setHoveredHub] = useState(null);
  const [activeContinent, setActiveContinent] = useState('All');

  // Continents list for quick filter highlight
  const continents = ['All', 'Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania'];

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom((z) => Math.min(Number((z * 1.3).toFixed(2)), 4.5));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(Number((z / 1.3).toFixed(2)), 0.8));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFocusIndia = () => {
    // Bengaluru coordinates: x: 708.84, y: 205.37
    // In a 1000x500 box, centering Bengaluru with zoom ~ 2.4x:
    // targetCenterX = 500, targetCenterY = 250
    // newX = 500 - (708.84 * 2.4), newY = 250 - (205.37 * 2.4)
    const targetZoom = 2.4;
    const targetPanX = 500 - 708.84 * targetZoom;
    const targetPanY = 250 - 205.37 * targetZoom;
    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
  };

  // Drag / Pan handlers
  const handlePointerDown = (e) => {
    // Only drag with left mouse button or touch
    if (e.button && e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    // Restrain pan bounds based on zoom
    const maxPanX = 500 * zoom;
    const minPanX = -500 * zoom;
    const maxPanY = 250 * zoom;
    const minPanY = -250 * zoom;
    setPan({
      x: Math.max(minPanX, Math.min(maxPanX, newX)),
      y: Math.max(minPanY, Math.min(maxPanY, newY)),
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Wheel zoom with full scroll isolation
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      e.lenisStopPropagation = true;

      if (!e.deltaY) return;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
      setZoom((prevZoom) => {
        const nextZoom = Math.max(0.8, Math.min(4.5, Number((prevZoom * zoomFactor).toFixed(2))));
        return nextZoom;
      });
    },
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div
      ref={containerRef}
      data-lenis-prevent
      data-lenis-prevent-wheel
      className="relative w-full rounded-3xl border border-[var(--border-subtle)] bg-[var(--map-card-bg)] shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl overflow-hidden select-none transition-colors duration-500 flex flex-col overscroll-contain"
      style={{ minHeight: '520px', overscrollBehavior: 'contain' }}
    >
      {/* Top Map Bar with Title & Connectivity Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/70 backdrop-blur-md z-20">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D9FF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00D9FF]"></span>
          </span>
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent-cyan)] font-semibold">
            Global AI Telemetry Network
          </span>
          <span className="hidden sm:inline-flex items-center rounded-full bg-[var(--accent-cyan)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20">
            6 Continents Connected
          </span>
        </div>

        {/* Quick Continent Filter Badges */}
        <div className="hidden md:flex items-center gap-1">
          {continents.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveContinent(c)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[10px] transition-all cursor-pointer ${
                activeContinent === c
                  ? 'bg-[var(--accent-cyan)] text-slate-950 font-bold shadow-[0_0_10px_var(--glow-cyan)]'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-white/5'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-sub)]">
          <span className="hidden lg:inline text-[10px] tracking-widest uppercase opacity-75">
            HQ:
          </span>
          <span className="font-semibold text-[var(--text-main)] flex items-center gap-1">
            <FiMapPin className="text-[#00D9FF] inline h-3.5 w-3.5" />
            Bengaluru, India
          </span>
        </div>
      </div>

      {/* Main Interactive SVG Map Viewport */}
      <div
        className={`relative flex-1 w-full overflow-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1000 500"
          className="w-full h-full block"
          style={{ minHeight: '440px', touchAction: 'none' }}
        >
          <defs>
            {/* Dark & Light Gradients */}
            <linearGradient id="mapOceanGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#05080D" />
              <stop offset="50%" stopColor="#081522" />
              <stop offset="100%" stopColor="#0B2634" />
            </linearGradient>

            <linearGradient id="mapOceanGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F1F5F9" />
              <stop offset="50%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>

            {/* India Gradient Fill */}
            <linearGradient id="indiaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D9FF" stopOpacity={isDark ? '0.35' : '0.28'} />
              <stop offset="100%" stopColor="#168BFF" stopOpacity={isDark ? '0.20' : '0.15'} />
            </linearGradient>

            {/* Glow Filter for Cyber Neon Lines */}
            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="intenseGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle Graticule Grid Pattern */}
            <pattern id="graticuleGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke={isDark ? '#00D9FF' : '#0284C7'}
                strokeWidth="0.3"
                strokeOpacity={isDark ? '0.07' : '0.12'}
              />
            </pattern>
          </defs>

          {/* Ocean Background */}
          <rect
            width="1000"
            height="500"
            fill={isDark ? 'url(#mapOceanGradDark)' : 'url(#mapOceanGradLight)'}
          />

          {/* Cyber Graticule Overlay */}
          <rect width="1000" height="500" fill="url(#graticuleGrid)" />

          {/* Latitude & Longitude Reference Lines */}
          <g opacity={isDark ? '0.15' : '0.22'} stroke={isDark ? '#00D9FF' : '#0891B2'} strokeDasharray="3 4" strokeWidth="0.5">
            {/* Equator */}
            <line x1="0" y1="250" x2="1000" y2="250" />
            {/* Tropic of Cancer */}
            <line x1="0" y1="185" x2="1000" y2="185" />
            {/* Tropic of Capricorn */}
            <line x1="0" y1="315" x2="1000" y2="315" />
            {/* Prime Meridian approx */}
            <line x1="500" y1="0" x2="500" y2="500" />
          </g>

          {/* TRANSFORMED WORLD GROUP (Zooms and pans all map elements together) */}
          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            style={{
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* 1. All Geographically Accurate Country Paths */}
            <g id="world-countries">
              {COUNTRIES.map((c) => {
                if (c.isIndia) return null; // India is rendered separately with distinct highlight
                return (
                  <path
                    key={c.id}
                    d={c.d}
                    fill={isDark ? '#0A1826' : '#E2E8F0'}
                    stroke={isDark ? '#16384C' : '#94A3B8'}
                    strokeWidth="0.65"
                    strokeLinejoin="round"
                    className="transition-colors duration-300 hover:fill-cyan-900/30"
                  />
                );
              })}
            </g>

            {/* 2. Highlighted India (Geographically Accurate boundary, cyan fill, glowing outline) */}
            <g id="india-highlight">
              {/* India Glow Halo Underlay */}
              <path
                d={INDIA_PATH}
                fill="none"
                stroke="#00D9FF"
                strokeWidth="4"
                strokeOpacity={isDark ? '0.35' : '0.4'}
                filter="url(#cyanGlow)"
              />
              {/* India Main Land Body */}
              <path
                d={INDIA_PATH}
                fill="url(#indiaGrad)"
                stroke="#00D9FF"
                strokeWidth="1.6"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            </g>

            {/* 3. Global Intercontinental Network Lines */}
            <g id="network-connections">
              {NETWORK_CONNECTIONS.map((conn) => {
                const isIndiaConn = conn.from.id === 'blr' || conn.to.id === 'blr';

                return (
                  <g key={conn.id}>
                    {/* Subtle glow shadow line */}
                    <path
                      d={conn.path}
                      fill="none"
                      stroke={isIndiaConn ? '#00D9FF' : '#168BFF'}
                      strokeWidth={isIndiaConn ? '1.5' : '1'}
                      strokeOpacity={isDark ? (isIndiaConn ? '0.5' : '0.25') : isIndiaConn ? '0.65' : '0.4'}
                      strokeLinecap="round"
                    />

                    {/* Traveling Light Pulse on primary routes */}
                    {conn.hasPulse && (
                      <circle r={isIndiaConn ? '2.8' : '2'} fill="#00D9FF" filter="url(#cyanGlow)">
                        <animateMotion
                          path={conn.path}
                          dur={`${conn.duration}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                  </g>
                );
              })}
            </g>

            {/* 4. Global Network Hubs (24 worldwide hubs) */}
            <g id="global-hubs">
              {GLOBAL_HUBS.map((hub) => {
                if (hub.id === 'blr') return null; // Bengaluru handled with primary marker below
                const isFiltered =
                  activeContinent === 'All' || hub.continent === activeContinent;
                const isHovered = hoveredHub === hub.id;

                return (
                  <g
                    key={hub.id}
                    transform={`translate(${hub.x}, ${hub.y})`}
                    className="cursor-pointer group"
                    opacity={isFiltered ? 1 : 0.35}
                    onMouseEnter={() => setHoveredHub(hub.id)}
                    onMouseLeave={() => setHoveredHub(null)}
                  >
                    {/* Pulsing ring on hover / active */}
                    <circle
                      r="5.5"
                      fill="none"
                      stroke={isDark ? '#00D9FF' : '#0284C7'}
                      strokeWidth="1"
                      strokeOpacity="0.4"
                      className="animate-ping"
                      style={{ animationDuration: '3s' }}
                    />

                    {/* Hub Outer Ring */}
                    <circle
                      r="3.5"
                      fill={isDark ? '#081522' : '#FFFFFF'}
                      stroke={isDark ? '#00D9FF' : '#0284C7'}
                      strokeWidth="1.2"
                    />

                    {/* Hub Center Dot */}
                    <circle
                      r="1.8"
                      fill={isDark ? '#00D9FF' : '#0284C7'}
                    />

                    {/* Mini Tooltip Label on Hover */}
                    {isHovered && (
                      <g transform="translate(0, -10)" className="pointer-events-none z-30">
                        <rect
                          x="-48"
                          y="-18"
                          width="96"
                          height="18"
                          rx="4"
                          fill={isDark ? '#081522' : '#FFFFFF'}
                          stroke={isDark ? '#00D9FF' : '#0284C7'}
                          strokeWidth="1"
                          filter="url(#cyanGlow)"
                        />
                        <text
                          x="0"
                          y="-6"
                          textAnchor="middle"
                          fill={isDark ? '#FFFFFF' : '#0F172A'}
                          fontSize="8.5"
                          fontFamily="sans-serif"
                          fontWeight="bold"
                        >
                          {hub.name}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* 5. Prominent Bengaluru, India Marker with Radar Pulse & Holographic Callout */}
            <g
              id="bengaluru-marker"
              transform={`translate(${BENGALURU_HUB.x}, ${BENGALURU_HUB.y})`}
              className="z-30"
            >
              {/* Outer Radar Wave 1 */}
              <circle
                r="18"
                fill="none"
                stroke="#00D9FF"
                strokeWidth="1.5"
                opacity="0.3"
                className="animate-ping"
                style={{ animationDuration: '2.4s' }}
              />

              {/* Outer Radar Wave 2 */}
              <circle
                r="10"
                fill="none"
                stroke="#00D9FF"
                strokeWidth="1.2"
                opacity="0.5"
                className="animate-ping"
                style={{ animationDuration: '1.6s' }}
              />

              {/* Central Glowing Shield Ring */}
              <circle
                r="6"
                fill={isDark ? '#05080D' : '#FFFFFF'}
                stroke="#00D9FF"
                strokeWidth="2.2"
                filter="url(#cyanGlow)"
              />

              {/* Radiant Hub Core */}
              <circle r="3" fill="#00D9FF" filter="url(#intenseGlow)" />

              {/* Floating Holographic Badge for Bengaluru, India */}
              <g transform="translate(14, -28)" className="pointer-events-none select-none">
                {/* Connecting Pin Line */}
                <path
                  d="M -14 28 L -4 10 L 0 10"
                  fill="none"
                  stroke="#00D9FF"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />

                {/* Badge Card Background */}
                <rect
                  x="0"
                  y="-1"
                  width="118"
                  height="34"
                  rx="6"
                  fill={isDark ? '#081522' : '#FFFFFF'}
                  fillOpacity={isDark ? '0.92' : '0.96'}
                  stroke="#00D9FF"
                  strokeWidth="1.2"
                  filter="url(#cyanGlow)"
                />

                {/* Pulse Indicator in Badge */}
                <circle cx="10" cy="11" r="3.2" fill="#00D9FF" />
                <circle cx="10" cy="11" r="6" fill="none" stroke="#00D9FF" strokeWidth="0.8" opacity="0.6" />

                {/* Badge Text */}
                <text
                  x="20"
                  y="14"
                  fill={isDark ? '#FFFFFF' : '#0F172A'}
                  fontSize="9.5"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="bold"
                  letterSpacing="0.2px"
                >
                  Bengaluru, India
                </text>
                <text
                  x="20"
                  y="26"
                  fill={isDark ? '#83E8F5' : '#0284C7'}
                  fontSize="7.5"
                  fontFamily="monospace"
                  fontWeight="600"
                  letterSpacing="0.4px"
                >
                  AI CORE HUB · ACTIVE
                </text>
              </g>
            </g>
          </g>
        </svg>

        {/* Floating Zoom & Map Controls (Bottom Left inside map) */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/90 p-1.5 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-main)] transition-colors hover:bg-[var(--accent-cyan)]/20 hover:text-[var(--accent-cyan)]"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <FiZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-main)] transition-colors hover:bg-[var(--accent-cyan)]/20 hover:text-[var(--accent-cyan)]"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <FiZoomOut className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-[var(--border-subtle)]" />
          <button
            type="button"
            onClick={handleReset}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-main)] transition-colors hover:bg-[var(--accent-cyan)]/20 hover:text-[var(--accent-cyan)]"
            title="Reset View"
            aria-label="Reset view"
          >
            <FiRotateCcw className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-[var(--border-subtle)]" />
          <button
            type="button"
            onClick={handleFocusIndia}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-mono font-semibold text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 hover:bg-[var(--accent-cyan)]/25 transition-all"
            title="Focus India (Bengaluru)"
            aria-label="Focus India"
          >
            <FiMaximize2 className="h-3 w-3" />
            <span>Focus India</span>
          </button>
        </div>

        {/* Zoom Level Indicator (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-20 hidden sm:flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/80 px-3 py-1 font-mono text-[10px] text-[var(--text-sub)] backdrop-blur-md">
          <span>Zoom:</span>
          <span className="font-bold text-[var(--accent-cyan)]">
            {Math.round(zoom * 100)}%
          </span>
          <span className="opacity-40">|</span>
          <span className="text-[9px] uppercase tracking-wider">Drag to Pan</span>
        </div>
      </div>

      {/* Map Footer Bar with Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]/60 backdrop-blur-md z-20 font-mono text-[11px] text-[var(--text-sub)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00D9FF] shadow-[0_0_8px_#00D9FF]"></span>
            <span>Bengaluru Primary Node</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#168BFF]"></span>
            <span>Global Continent Nodes (6)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-gradient-to-r from-[#00D9FF] to-[#168BFF]"></span>
            <span>Active Sync Streams</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[var(--accent-cyan)] font-medium">
          <FiActivity className="h-3.5 w-3.5 animate-pulse" />
          <span>99.98% Latency Reliability</span>
        </div>
      </div>
    </div>
  );
}
