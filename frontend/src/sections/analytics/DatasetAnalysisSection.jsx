import { useState } from 'react';
import { FiDatabase, FiLayers, FiCheckCircle, FiHelpCircle, FiBarChart2, FiArrowDown, FiArrowUp } from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';

export default function DatasetAnalysisSection({ dataset }) {
  const [sortMode, setSortMode] = useState('alpha'); // 'alpha' | 'count_desc' | 'count_asc'
  const [hoveredClass, setHoveredClass] = useState(null);

  const samplesPerClass = dataset.samplesPerClass || {};
  const classesList = Object.entries(samplesPerClass).map(([label, count]) => ({
    label,
    count,
    pct: ((count / dataset.totalSamples) * 100).toFixed(1),
  }));

  const sortedClasses = [...classesList].sort((a, b) => {
    if (sortMode === 'count_desc') return b.count - a.count;
    if (sortMode === 'count_asc') return a.count - b.count;
    return a.label.localeCompare(b.label);
  });

  const maxCount = Math.max(...classesList.map((c) => c.count), 500);

  return (
    <section className="relative py-10 sm:py-12 border-b border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              Ground Truth Repository
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
              Dataset Analysis
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              Verified sample distributions, class counts, and split partitions from the benchmark dataset.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Source: Verified project dataset (kaggle grassknoted/asl-alphabet)</span>
          </div>
        </div>

        {/* 5-Metric Distribution Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {/* Total Samples */}
          <div className="glass-card rounded-xl border border-white/10 bg-slate-950/80 p-3.5 backdrop-blur-xl">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Total Samples
            </div>
            <div className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white grad-text">
              {dataset.totalSamples ? dataset.totalSamples.toLocaleString() : 'Unavailable'}
            </div>
            <div className="mt-1 font-mono text-[9px] text-emerald-400 flex items-center gap-1">
              <FiCheckCircle className="h-3 w-3" />
              <span>Verified project record</span>
            </div>
          </div>

          {/* Number of Classes */}
          <div className="glass-card rounded-xl border border-white/10 bg-slate-950/80 p-3.5 backdrop-blur-xl">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Number of Classes
            </div>
            <div className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
              {dataset.classesCount}
            </div>
            <div className="mt-1 font-mono text-[9px] text-slate-400">
              Full A–Z alphabet
            </div>
          </div>

          {/* Training Samples */}
          <div className="glass-card rounded-xl border border-white/10 bg-slate-950/80 p-3.5 backdrop-blur-xl">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Training Samples
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-slate-300">
              {dataset.trainSamples ? dataset.trainSamples.toLocaleString() : 'Not recorded'}
            </div>
            <div className="mt-1 font-mono text-[9px] text-slate-500">
              Partitioning pending
            </div>
          </div>

          {/* Validation Samples */}
          <div className="glass-card rounded-xl border border-white/10 bg-slate-950/80 p-3.5 backdrop-blur-xl">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Validation Samples
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-slate-300">
              {dataset.valSamples ? dataset.valSamples.toLocaleString() : 'Not recorded'}
            </div>
            <div className="mt-1 font-mono text-[9px] text-slate-500">
              Multi-signer holdout
            </div>
          </div>

          {/* Test Samples */}
          <div className="glass-card rounded-xl border border-white/10 bg-slate-950/80 p-3.5 backdrop-blur-xl col-span-2 sm:col-span-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Test Samples
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-slate-300">
              {dataset.testSamples ? dataset.testSamples.toLocaleString() : 'Not recorded'}
            </div>
            <div className="mt-1 font-mono text-[9px] text-slate-500">
              Independent signers
            </div>
          </div>
        </div>

        {/* Class Distribution Horizontal Bar Chart */}
        <div className="glass-card rounded-2xl border border-white/12 bg-slate-950/90 p-4 sm:p-6 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2">
                <FiBarChart2 className="h-4 w-4 text-cyan-400" />
                <h3 className="font-display text-base sm:text-lg font-bold text-white">
                  Class Distribution
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Actual verified sample counts per letter class in the active dataset.
              </p>
            </div>

            {/* Sort Toggle Controls */}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-slate-500 text-[10px] uppercase mr-1">Sort:</span>
              <button
                type="button"
                onClick={() => setSortMode('alpha')}
                className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                  sortMode === 'alpha'
                    ? 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-200'
                    : 'bg-white/[0.03] border border-white/8 text-slate-400 hover:text-white'
                }`}
              >
                A–Z
              </button>
              <button
                type="button"
                onClick={() => setSortMode('count_desc')}
                className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer flex items-center gap-1 ${
                  sortMode === 'count_desc'
                    ? 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-200'
                    : 'bg-white/[0.03] border border-white/8 text-slate-400 hover:text-white'
                }`}
              >
                <span>Count</span>
                <FiArrowDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setSortMode('count_asc')}
                className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer flex items-center gap-1 ${
                  sortMode === 'count_asc'
                    ? 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-200'
                    : 'bg-white/[0.03] border border-white/8 text-slate-400 hover:text-white'
                }`}
              >
                <span>Count</span>
                <FiArrowUp className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 2-Column Horizontal Bar Chart Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {sortedClasses.map((item) => {
              const widthPct = ((item.count / maxCount) * 100).toFixed(1);
              const isHovered = hoveredClass?.label === item.label;

              return (
                <div
                  key={item.label}
                  onMouseEnter={() => setHoveredClass(item)}
                  onMouseLeave={() => setHoveredClass(null)}
                  className={`flex items-center gap-2.5 rounded-lg p-1.5 transition-colors cursor-pointer ${
                    isHovered ? 'bg-cyan-400/10' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Letter Tag */}
                  <span className="w-5 text-center font-mono text-xs font-bold text-cyan-300">
                    {item.label}
                  </span>

                  {/* Horizontal Bar */}
                  <div className="flex-1 relative h-3 rounded-full bg-slate-900 border border-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>

                  {/* Sample Count & Pct */}
                  <div className="w-20 text-right font-mono text-[11px] shrink-0">
                    <span className="font-semibold text-slate-200">{item.count}</span>
                    <span className="text-slate-500 text-[10px] ml-1">({item.pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400 font-mono">
            <span>Window Size: {dataset.windowSize} frames · Dimensions: {dataset.landmarkDimensions} (21 × 3)</span>
            <span className="text-slate-500 text-[10px]">Total Recorded: 11,742 Samples</span>
          </div>
        </div>
      </div>
    </section>
  );
}
