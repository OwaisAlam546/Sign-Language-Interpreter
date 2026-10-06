import { useState, useRef, useCallback } from 'react';
import { COUNTRIES, INDIA_PATH } from '../../lib/worldMapData.js';
import {
  FiZoomIn,
  FiZoomOut,
  FiRotateCcw,
  FiMaximize2,
  FiBookOpen,
  FiGlobe,
  FiInfo,
  FiLayers,
} from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';

export default function GlobalLandscapeSection({ landscape }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Zoom and pan bounds
  const MIN_ZOOM = 1.0;
  const MAX_ZOOM = 4.0;
  const MAP_WIDTH = 1000;
  const MAP_HEIGHT = 500;

  const clampPan = useCallback((px, py, z) => {
    const minX = MAP_WIDTH * (1 - z);
    const maxX = 0;
    const minY = MAP_HEIGHT * (1 - z);
    const maxY = 0;
    return {
      x: Math.min(maxX, Math.max(minX, px)),
      y: Math.min(maxY, Math.max(minY, py)),
    };
  }, []);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedLang, setSelectedLang] = useState(landscape.primaryHub);
  const [hoveredLang, setHoveredLang] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originPan: { x: 0, y: 0 },
    hasMoved: false,
  });

  const zoomTo = useCallback(
    (targetZoom, focusSvgX = MAP_WIDTH / 2, focusSvgY = MAP_HEIGHT / 2) => {
      const curZoom = zoomRef.current;
      const curPan = panRef.current;
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(targetZoom.toFixed(2))));

      const mapX = (focusSvgX - curPan.x) / curZoom;
      const mapY = (focusSvgY - curPan.y) / curZoom;

      const desiredPanX = focusSvgX - mapX * nextZoom;
      const desiredPanY = focusSvgY - mapY * nextZoom;

      const clamped = clampPan(desiredPanX, desiredPanY, nextZoom);
      setZoom(nextZoom);
      setPan(clamped);
    },
    [clampPan]
  );

  const handleZoomIn = (e) => {
    e?.stopPropagation?.();
    zoomTo(zoomRef.current * 1.35);
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation?.();
    zoomTo(zoomRef.current / 1.35);
  };

  const handleReset = (e) => {
    e?.stopPropagation?.();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFocusIndia = (e) => {
    e?.stopPropagation?.();
    const hub = landscape.primaryHub;
    setSelectedLang(hub);
    zoomTo(2.4, hub.x, hub.y);
  };

  // Drag interaction
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originPan: { ...panRef.current },
      hasMoved: false,
    };
    containerRef.current?.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 4) {
      dragRef.current.hasMoved = true;
    }
    const nextPanX = dragRef.current.originPan.x + dx;
    const nextPanY = dragRef.current.originPan.y + dy;
    setPan(clampPan(nextPanX, nextPanY, zoomRef.current));
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      containerRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * MAP_WIDTH;
    const mouseSvgY = ((e.clientY - rect.top) / rect.height) * MAP_HEIGHT;
    const delta = e.deltaY < 0 ? 1.15 : 0.87;
    zoomTo(zoomRef.current * delta, mouseSvgX, mouseSvgY);
  };

  // Filtered languages
  const filteredLanguages = landscape.languages.filter((l) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Asia') return l.id === 'isl' || l.id === 'jsl';
    if (activeFilter === 'Americas') return l.id === 'asl' || l.id === 'libras';
    if (activeFilter === 'Europe') return l.id === 'bsl' || l.id === 'lsf' || l.id === 'dgs';
    if (activeFilter === 'Africa') return l.id === 'sasl' || l.id === 'csla';
    if (activeFilter === 'Oceania') return l.id === 'auslan';
    return true;
  });

  const activeLangDisplay = hoveredLang || selectedLang || landscape.primaryHub;

  return (
    <section className="relative py-10 sm:py-14 border-b border-white/[0.08] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              <FiGlobe className="h-3 w-3" />
              <span>GLOBAL LINGUISTIC ATLAS</span>
            </div>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
              Global Sign Language Landscape
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Sign languages are diverse linguistic systems used across communities worldwide.
            </p>
          </div>

          {/* Source Trust Label */}
          <div className="flex flex-col items-start md:items-end gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-slate-950/80 px-3 py-1 font-mono text-[10px] text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Source: World Federation of the Deaf (WFD)
            </span>
            <span className="font-mono text-[9px] text-slate-500">
              Linguistic Facts &amp; Context · Not User Analytics
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4 font-mono text-[11px]">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider mr-1">Region:</span>
          {['All', 'Asia', 'Americas', 'Europe', 'Africa', 'Oceania'].map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => setActiveFilter(region)}
              className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                activeFilter === region
                  ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200 shadow-[0_0_10px_rgba(0,217,255,0.25)]'
                  : 'border border-white/10 bg-slate-950/60 text-slate-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {/* Map Container + Interactive Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-stretch">
          {/* World Map Container */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            className={`glass-card relative flex flex-col justify-between rounded-2xl border border-white/12 bg-slate-950/95 overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.7)] select-none touch-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ minHeight: '440px' }}
          >
            {/* SVG Canvas */}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              className="w-full h-auto block select-none"
              style={{ maxHeight: '520px' }}
              aria-label="Interactive Global Sign Language Landscape map"
            >
              <defs>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="intenseCyanGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#83E8F5" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#168BFF" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Map Group with Dynamic Zoom & Pan */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* 1. Country Outlines */}
                <g id="continent-layer" opacity="0.85">
                  {COUNTRIES.map((c, i) => (
                    <path
                      key={c.id || i}
                      d={c.d}
                      fill="#0d1f33"
                      stroke="#183654"
                      strokeWidth="0.65"
                      className="transition-colors duration-200 hover:fill-[#132d47]"
                    />
                  ))}
                  {/* Highlight India Outline */}
                  {INDIA_PATH && (
                    <path
                      d={INDIA_PATH}
                      fill="#0a324a"
                      stroke="#00D9FF"
                      strokeWidth="1.1"
                      opacity="0.95"
                    />
                  )}
                </g>

                {/* 2. Linguistic Historical / Research Connection Arcs */}
                <g id="lineage-arcs" opacity="0.65">
                  {/* LSF (Paris) -> ASL (New York) */}
                  <path
                    d="M 505.63 92.68 Q 410 70 315.4 117.9"
                    fill="none"
                    stroke="url(#pathGradient)"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                  />
                  {/* BSL (London) -> Auslan (Sydney) */}
                  <path
                    d="M 499.7 84.64 Q 690 220 887.66 352.78"
                    fill="none"
                    stroke="url(#pathGradient)"
                    strokeWidth="1.1"
                    strokeDasharray="3 5"
                  />
                  {/* ISL (Bengaluru) -> ASL (New York - Model Benchmark Crosswalk) */}
                  <path
                    d="M 708.84 205.37 Q 512 80 315.4 117.9"
                    fill="none"
                    stroke="#00D9FF"
                    strokeWidth="1.2"
                    strokeDasharray="2 4"
                    opacity="0.75"
                  />
                </g>

                {/* 3. Global Sign Language Nodes */}
                {filteredLanguages.map((lang) => {
                  const isSelected = selectedLang?.id === lang.id;
                  const isHovered = hoveredLang?.id === lang.id;
                  const isPrimary = lang.isPrimary;

                  return (
                    <g
                      key={lang.id}
                      transform={`translate(${lang.x}, ${lang.y})`}
                      className="cursor-pointer transition-transform duration-200"
                      onMouseEnter={() => setHoveredLang(lang)}
                      onMouseLeave={() => setHoveredLang(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLang(lang);
                      }}
                    >
                      {/* Outer pulse wave */}
                      <circle
                        r={isPrimary ? '14' : '9'}
                        fill="none"
                        stroke={isPrimary ? '#00D9FF' : '#38BDF8'}
                        strokeWidth="1.2"
                        opacity={isPrimary ? '0.45' : '0.3'}
                        className="animate-ping"
                        style={{ animationDuration: isPrimary ? '2s' : '3s' }}
                      />

                      {/* Middle halo ring */}
                      <circle
                        r={isPrimary ? '7.5' : '5'}
                        fill="#05080D"
                        stroke={isSelected || isHovered ? '#00D9FF' : '#38BDF8'}
                        strokeWidth={isSelected || isHovered ? '2.4' : '1.5'}
                        filter="url(#softGlow)"
                      />

                      {/* Inner solid core */}
                      <circle
                        r={isPrimary ? '3.8' : '2.6'}
                        fill={isPrimary ? '#00D9FF' : '#EAF6FA'}
                      />

                      {/* Label badge */}
                      <g
                        transform={`translate(${lang.x > 750 ? -60 : 8}, ${lang.y > 300 ? -12 : 12})`}
                        className="pointer-events-none select-none"
                      >
                        <rect
                          x="0"
                          y="-8"
                          width={lang.isPrimary ? 86 : 64}
                          height="16"
                          rx="4"
                          fill="#081522"
                          fillOpacity="0.88"
                          stroke={isSelected || isHovered ? '#00D9FF' : '#168BFF'}
                          strokeWidth="0.8"
                        />
                        <text
                          x="4"
                          y="3"
                          fill="#FFFFFF"
                          fontSize="7.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {lang.code.toUpperCase()} · {lang.name}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Map Controls Toolbar (Bottom Left) */}
            <div
              className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/85 p-1.5 shadow-xl backdrop-blur-xl"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleZoomIn}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-cyan-400/20 hover:text-cyan-300 transition-colors cursor-pointer"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <FiZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-cyan-400/20 hover:text-cyan-300 transition-colors cursor-pointer"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <FiZoomOut className="h-3.5 w-3.5" />
              </button>
              <div className="h-3.5 w-px bg-white/10" />
              <button
                type="button"
                onClick={handleReset}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-cyan-400/20 hover:text-cyan-300 transition-colors cursor-pointer"
                title="Reset map view"
                aria-label="Reset map view"
              >
                <FiRotateCcw className="h-3.5 w-3.5" />
              </button>
              <div className="h-3.5 w-px bg-white/10" />
              <button
                type="button"
                onClick={handleFocusIndia}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/25 transition-all cursor-pointer"
                title="Focus Bengaluru / India research base"
              >
                <FiMaximize2 className="h-3 w-3" />
                <span>Focus Bengaluru</span>
              </button>
            </div>

            {/* Map Legend Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t border-white/10 bg-slate-950/90 font-mono text-[10px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00D9FF]" />
                  <span>Bengaluru (R&amp;D Root)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-300" />
                  <span>Global Natural Sign Languages</span>
                </span>
              </div>
              <span className="text-slate-500">
                Zoom: {Math.round(zoom * 100)}% · Drag to Pan
              </span>
            </div>
          </div>

          {/* Interactive Language Detail Card (Right Panel) */}
          <div className="glass-card flex flex-col justify-between rounded-2xl border border-white/12 bg-slate-950/90 p-4 sm:p-5 backdrop-blur-xl shadow-xl">
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300">
                    <FiBookOpen className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                      Linguistic Dossier
                    </div>
                    <div className="font-display text-sm font-bold text-white">
                      {activeLangDisplay.name}
                    </div>
                  </div>
                </div>

                <span className="rounded-full bg-cyan-400/10 border border-cyan-400/30 px-2.5 py-0.5 font-mono text-[9px] font-semibold text-cyan-300">
                  {activeLangDisplay.code.toUpperCase()}
                </span>
              </div>

              {/* Language Name & Family */}
              <div className="mt-3.5">
                <div className="font-display text-base sm:text-lg font-bold text-white leading-snug">
                  {activeLangDisplay.language}
                </div>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
                  <FiLayers className="h-3 w-3 shrink-0" />
                  <span>{activeLangDisplay.family}</span>
                </div>
              </div>

              {/* Signer Community Estimate (Informational Demographic) */}
              <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
                <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                  Global Deaf Community
                </div>
                <div className="mt-0.5 font-display text-base font-bold text-slate-200">
                  {activeLangDisplay.signersApprox || '~1M - 3M users'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Natural sign language with full grammar and syntax.
                </div>
              </div>

              {/* Notes & Project Connection */}
              <div className="mt-3 text-xs text-slate-300 leading-relaxed">
                <p>{activeLangDisplay.notes || activeLangDisplay.context}</p>
              </div>
            </div>

            {/* Bottom Disclaimer */}
            <div className="mt-4 pt-3 border-t border-white/[0.08]">
              <div className="flex items-start gap-2 text-[11px] text-slate-400">
                <FiInfo className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  Sign languages are complete natural languages, not translations of spoken speech. SignSpeak AI targets universal accessibility principles.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Informational Global Facts Ribbon */}
        <Reveal delay={0.1}>
          <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {landscape.globalFacts.map((fact, idx) => (
              <div key={idx} className="glass-card rounded-xl border border-white/8 bg-slate-950/60 p-3 backdrop-blur-md">
                <div className="font-display text-xl sm:text-2xl font-bold text-white grad-text">
                  {fact.value}
                </div>
                <div className="mt-0.5 font-sans text-xs font-semibold text-slate-200">
                  {fact.label}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-slate-400">
                  {fact.note}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
