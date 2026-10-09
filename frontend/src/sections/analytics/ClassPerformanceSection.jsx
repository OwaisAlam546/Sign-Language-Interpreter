import { useState, useMemo } from 'react';
import {
  FiSliders,
  FiSearch,
  FiInfo,
  FiAlertCircle,
  FiGrid,
  FiList,
  FiArrowUp,
  FiArrowDown,
  FiMaximize2,
  FiActivity,
  FiDatabase,
  FiCheckCircle,
} from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';

export default function ClassPerformanceSection({
  classPerformance,
  datasetSamples = {},
  onSelectClass,
}) {
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('label_asc'); // 'label_asc' | 'label_desc' | 'samples_desc' | 'samples_asc' | 'f1_desc' | 'recall_desc' | 'precision_desc'
  const [filterDifficulty, setFilterDifficulty] = useState('all'); // 'all' | 'critical' | 'standard'

  // Difficult class sets
  const criticalClasses = new Set(['A', 'M', 'N', 'S', 'T', 'Q', 'P', 'G', 'X', 'J', 'Z']);

  // Check if any class has measured data
  const hasEvaluatedData = useMemo(() => {
    return classPerformance.some(
      (c) => c.f1 !== null || c.precision !== null || c.recall !== null
    );
  }, [classPerformance]);

  // Filtered and sorted class list
  const processedClasses = useMemo(() => {
    return classPerformance
      .filter((item) => {
        const matchesSearch =
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.handshape.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (filterDifficulty === 'critical') {
          return criticalClasses.has(item.label);
        }
        if (filterDifficulty === 'standard') {
          return !criticalClasses.has(item.label);
        }
        return true;
      })
      .sort((a, b) => {
        const aSamples = datasetSamples[a.label] || 0;
        const bSamples = datasetSamples[b.label] || 0;

        switch (sortBy) {
          case 'label_desc':
            return b.label.localeCompare(a.label);
          case 'samples_desc':
            return bSamples - aSamples;
          case 'samples_asc':
            return aSamples - bSamples;
          case 'f1_desc':
            return (b.f1 ?? -1) - (a.f1 ?? -1);
          case 'precision_desc':
            return (b.precision ?? -1) - (a.precision ?? -1);
          case 'recall_desc':
            return (b.recall ?? -1) - (a.recall ?? -1);
          case 'label_asc':
          default:
            return a.label.localeCompare(b.label);
        }
      });
  }, [classPerformance, searchQuery, sortBy, filterDifficulty, datasetSamples]);

  return (
    <section id="classes" className="relative py-8 sm:py-10 border-b border-[var(--border-subtle)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
                Fine-Grained Classification
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-sub)]" />
              <span className="font-mono text-[10px] text-[var(--text-sub)] uppercase">
                26 Alphabet Letters
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)] mt-0.5">
              Alphabet Class Performance (A–Z)
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-sub)] max-w-2xl">
              Per-class precision, recall, and F1-score breakdown across all 26 American Sign Language handshapes. Click any class to inspect anatomical and feature specifications.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-cyan-400/25 bg-[var(--bg-card)] px-3 py-1 font-mono text-[10px] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>26 Classes Calibrated</span>
          </div>
        </div>

        {/* Toolbar: Search, Filters, Sorters, View Switcher */}
        <div className="mb-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3.5 sm:p-4 backdrop-blur-xl space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-sub)]" />
              <input
                type="text"
                placeholder="Filter class by letter (e.g. A, M) or handshape keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] pl-9 pr-3 py-1.5 font-mono text-xs text-[var(--text-main)] placeholder-[var(--text-sub)] focus:border-cyan-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[var(--text-sub)] hover:text-[var(--text-main)]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Controls: Difficulty Filter, Sort Selector, View Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Difficulty Filter */}
              <div className="flex items-center gap-1 bg-white/[0.02] border border-[var(--border-subtle)] rounded-lg p-0.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setFilterDifficulty('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterDifficulty === 'all'
                      ? 'bg-cyan-400/15 text-cyan-300 font-semibold'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                  }`}
                >
                  All (26)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDifficulty('critical')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterDifficulty === 'critical'
                      ? 'bg-amber-400/15 text-amber-300 font-semibold'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                  }`}
                  title="A, M, N, S, T, Q, P, G, X, J, Z"
                >
                  Critical (11)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDifficulty('standard')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterDifficulty === 'standard'
                      ? 'bg-cyan-400/15 text-cyan-300 font-semibold'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Standard (15)
                </button>
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1.5 font-mono text-xs text-[var(--text-main)] focus:border-cyan-400 focus:outline-none cursor-pointer"
                aria-label="Sort alphabet classes"
              >
                <option value="label_asc">Sort: Letter (A → Z)</option>
                <option value="label_desc">Sort: Letter (Z → A)</option>
                <option value="samples_desc">Sort: Dataset Samples (High → Low)</option>
                <option value="samples_asc">Sort: Dataset Samples (Low → High)</option>
                <option value="f1_desc">Sort: F1-Score (High → Low)</option>
                <option value="precision_desc">Sort: Precision (High → Low)</option>
                <option value="recall_desc">Sort: Recall (High → Low)</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center gap-0.5 bg-white/[0.02] border border-[var(--border-subtle)] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-cyan-400/20 text-cyan-300'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                  }`}
                  title="Dense Table View"
                  aria-label="Table view"
                >
                  <FiList className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-cyan-400/20 text-cyan-300'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                  }`}
                  title="Grid Cards View"
                  aria-label="Grid view"
                >
                  <FiGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Unmeasured notice when test evaluation is standby */}
          {!hasEvaluatedData && (
            <div className="pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-sub)]">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Zero-Fabrication Mode:</span>
                <span className="text-[var(--text-main)]">
                  Per-class test metrics display 'Standby' until verified test run execution.
                </span>
              </div>
              <span className="font-mono text-[11px] text-cyan-400">
                Click any row/card to inspect handshape anatomy &amp; 90D features →
              </span>
            </div>
          )}
        </div>

        {/* View Mode 1: Dense Data Table */}
        {viewMode === 'table' ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-white/[0.02] font-mono text-[10px] uppercase tracking-wider text-[var(--text-sub)]">
                    <th scope="col" className="py-3 px-4 font-bold text-cyan-400 w-16">Class</th>
                    <th scope="col" className="py-3 px-4">Handshape Anatomy</th>
                    <th scope="col" className="py-3 px-3 text-right">Dataset Support</th>
                    <th scope="col" className="py-3 px-3 text-right">Precision</th>
                    <th scope="col" className="py-3 px-3 text-right">Recall</th>
                    <th scope="col" className="py-3 px-3 text-right">F1-Score</th>
                    <th scope="col" className="py-3 px-3 text-center">Difficulty / Status</th>
                    <th scope="col" className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {processedClasses.map((item) => {
                    const sampleCount = datasetSamples[item.label] ?? '—';
                    const isCritical = criticalClasses.has(item.label);

                    return (
                      <tr
                        key={item.label}
                        onClick={() => onSelectClass && onSelectClass(item)}
                        className="hover:bg-cyan-500/[0.04] transition-colors cursor-pointer group"
                      >
                        {/* Letter Class */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 font-mono text-sm font-bold text-cyan-300 group-hover:border-cyan-400/60 group-hover:bg-cyan-400/20 transition-all">
                              {item.label}
                            </span>
                          </div>
                        </td>

                        {/* Handshape Anatomy */}
                        <td className="py-3 px-4">
                          <div className="text-[var(--text-main)] font-medium leading-snug line-clamp-2">
                            {item.handshape}
                          </div>
                        </td>

                        {/* Dataset Support */}
                        <td className="py-3 px-3 text-right font-mono text-[var(--text-main)] whitespace-nowrap">
                          {typeof sampleCount === 'number' ? sampleCount.toLocaleString() : sampleCount}
                          <span className="text-[10px] text-[var(--text-sub)] ml-1">imgs</span>
                        </td>

                        {/* Precision */}
                        <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                          {item.precision !== null ? (
                            <span className="font-semibold text-emerald-400">{item.precision}%</span>
                          ) : (
                            <span className="text-[var(--text-sub)] opacity-70">Standby</span>
                          )}
                        </td>

                        {/* Recall */}
                        <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                          {item.recall !== null ? (
                            <span className="font-semibold text-emerald-400">{item.recall}%</span>
                          ) : (
                            <span className="text-[var(--text-sub)] opacity-70">Standby</span>
                          )}
                        </td>

                        {/* F1-Score */}
                        <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                          {item.f1 !== null ? (
                            <span className="font-semibold text-emerald-400">{item.f1}%</span>
                          ) : (
                            <span className="text-[var(--text-sub)] opacity-70">Standby</span>
                          )}
                        </td>

                        {/* Difficulty / Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isCritical ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300 font-semibold">
                              Critical Group
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-white/[0.02] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--text-sub)]">
                              Standard
                            </span>
                          )}
                        </td>

                        {/* Action: Inspect */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectClass && onSelectClass(item);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-400/10 transition-colors"
                          >
                            <FiMaximize2 className="h-3 w-3" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* View Mode 2: Responsive Grid Cards */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {processedClasses.map((item) => {
              const sampleCount = datasetSamples[item.label] ?? '—';
              const isCritical = criticalClasses.has(item.label);

              return (
                <div
                  key={item.label}
                  onClick={() => onSelectClass && onSelectClass(item)}
                  className="group relative flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3.5 hover:border-cyan-400/50 hover:bg-cyan-500/[0.03] transition-all cursor-pointer shadow-sm hover:shadow-[0_4px_20px_rgba(0,217,255,0.1)]"
                >
                  <div>
                    {/* Header: Letter + Status pill */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 font-mono text-base font-bold text-cyan-300 group-hover:scale-105 transition-transform">
                        {item.label}
                      </span>
                      {isCritical && (
                        <span className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/25">
                          Critical
                        </span>
                      )}
                    </div>

                    {/* Handshape description */}
                    <p className="text-[11px] text-[var(--text-sub)] leading-snug line-clamp-2 min-h-[30px]">
                      {item.handshape}
                    </p>
                  </div>

                  {/* Metrics & Samples footer */}
                  <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between font-mono text-[10px] text-[var(--text-sub)]">
                    <span>{typeof sampleCount === 'number' ? `${sampleCount} imgs` : sampleCount}</span>
                    <span className="text-cyan-400 group-hover:underline">Inspect →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty Search Result Fallback */}
        {processedClasses.length === 0 && (
          <div className="mt-4 p-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-center">
            <FiInfo className="h-6 w-6 text-[var(--text-sub)] mx-auto mb-2" />
            <div className="font-display text-sm font-semibold text-[var(--text-main)]">
              No classes matching '{searchQuery}'
            </div>
            <p className="text-xs text-[var(--text-sub)] mt-1">
              Try searching for a different letter or clear the search filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterDifficulty('all');
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1 text-xs text-cyan-300"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
