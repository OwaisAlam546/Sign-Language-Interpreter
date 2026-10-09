import { useState } from 'react';
import { FiGrid, FiSearch, FiSliders, FiMaximize2, FiInfo, FiLayers } from 'react-icons/fi';

export default function TacticalAlphabetGrid({
  classPerformance,
  datasetSamples = {},
  onSelectClass,
}) {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'critical' | 'standard'

  const criticalLetters = new Set(['A', 'M', 'N', 'S', 'T', 'Q', 'P', 'G', 'X', 'J', 'Z']);

  // Class difficulty categorization for colorful matrix zoning
  const getZoning = (letter) => {
    if (['A', 'M', 'N', 'S', 'T'].includes(letter)) {
      return {
        badge: 'Fist',
        color: 'border-rose-400/50 bg-rose-500/10 text-rose-300 hover:border-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]',
        glow: 'rgba(244,63,94,0.4)',
      };
    }
    if (['Q', 'P', 'G'].includes(letter)) {
      return {
        badge: 'Angle',
        color: 'border-amber-400/50 bg-amber-500/10 text-amber-300 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]',
        glow: 'rgba(245,158,11,0.4)',
      };
    }
    if (letter === 'X') {
      return {
        badge: 'Hook',
        color: 'border-cyan-400/50 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,217,255,0.35)]',
        glow: 'rgba(0,217,255,0.4)',
      };
    }
    if (['J', 'Z'].includes(letter)) {
      return {
        badge: 'Motion',
        color: 'border-purple-400/50 bg-purple-500/10 text-purple-300 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]',
        glow: 'rgba(168,85,247,0.4)',
      };
    }
    return {
      badge: 'Pose',
      color: 'border-[var(--border-subtle)] bg-white/[0.03] text-[var(--text-main)] hover:border-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/10 hover:shadow-[0_0_12px_rgba(0,217,255,0.2)]',
      glow: 'rgba(0,217,255,0.2)',
    };
  };

  const filteredList = classPerformance.filter((item) => {
    const matchesText =
      item.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.handshape.toLowerCase().includes(filterQuery.toLowerCase());
    if (!matchesText) return false;
    if (activeFilter === 'critical') return criticalLetters.has(item.label);
    if (activeFilter === 'standard') return !criticalLetters.has(item.label);
    return true;
  });

  return (
    <div className="flex flex-col justify-between h-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5 backdrop-blur-2xl shadow-2xl">
      {/* Header & Mini Toolbar */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] font-mono text-xs">
          <div className="flex items-center gap-2">
            <FiGrid className="h-4 w-4 text-cyan-400" />
            <span className="font-bold uppercase tracking-wider text-[var(--text-main)]">
              Tactical Alphabet Matrix (A–Z)
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-sub)]">
            26 Classes Active
          </span>
        </div>

        {/* Search & Filter Strip */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-sub)]" />
            <input
              type="text"
              placeholder="Search letter / handshape..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] pl-8 pr-2 py-1 font-mono text-[11px] text-[var(--text-main)] placeholder-[var(--text-sub)] focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-white/[0.03] border border-[var(--border-subtle)] rounded-lg p-0.5 text-[10px] font-mono shrink-0">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-cyan-400/20 text-cyan-300 font-bold'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('critical')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                activeFilter === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 font-bold'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              Critical
            </button>
          </div>
        </div>

        {/* 26-Letter Periodic/Tactical Grid Chips */}
        <div className="mt-3.5 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {filteredList.map((item) => {
            const zoning = getZoning(item.label);
            const count = datasetSamples[item.label];

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onSelectClass && onSelectClass(item)}
                className={`group relative rounded-xl border p-2 flex flex-col justify-between items-start transition-all cursor-pointer text-left ${zoning.color}`}
                title={`Inspect Class ${item.label}: ${item.handshape}`}
              >
                {/* Letter Header + Micro Tag */}
                <div className="w-full flex items-center justify-between">
                  <span className="font-mono text-base font-bold tracking-tight">
                    {item.label}
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-wider opacity-75">
                    {zoning.badge}
                  </span>
                </div>

                {/* Sample count & probe indicator */}
                <div className="w-full mt-2 pt-1 border-t border-white/[0.08] flex items-center justify-between font-mono text-[9px] opacity-80 group-hover:opacity-100">
                  <span>{count ? `${count}` : '—'}</span>
                  <span className="text-[8px] uppercase opacity-70 group-hover:text-cyan-300">
                    Info →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Legend & Inspection Hint */}
      <div className="mt-4 pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[var(--text-sub)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span>Fist Ambiguity</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Angle Distortion</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>Knuckle Hook</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <span>Dynamic Path</span>
          </span>
        </div>
        <span className="text-cyan-400">Click any cell to inspect anatomy</span>
      </div>
    </div>
  );
}
