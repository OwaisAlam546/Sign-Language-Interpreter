import { useState } from 'react';
import { FiSliders, FiHelpCircle, FiSearch, FiInfo, FiAlertCircle } from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';

export default function ClassPerformanceSection({ classPerformance }) {
  const [selectedMetric, setSelectedMetric] = useState('accuracy'); // 'accuracy' | 'precision' | 'recall' | 'f1'
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredClass, setHoveredClass] = useState(null);

  const metricLabels = {
    accuracy: 'Accuracy',
    precision: 'Precision',
    recall: 'Recall',
    f1: 'F1 Score',
  };

  const filteredClasses = classPerformance.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.handshape.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if any class has real evaluation data
  const hasEvaluatedData = classPerformance.some((c) => c[selectedMetric] !== null && c[selectedMetric] !== undefined);

  return (
    <section className="relative py-10 sm:py-12 border-b border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              Fine-Grained Classification
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
              Recognition Performance by Class
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              Per-class gesture recognition metrics across all 26 ASL alphabet handshapes (A–Z).
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-cyan-400/25 bg-slate-950/80 px-3 py-1 font-mono text-[10px] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Status: Awaiting multi-signer evaluation</span>
          </div>
        </div>

        {/* Toolbar: Metric Tabs + Search + Status Banner */}
        <div className="glass-card mb-5 rounded-2xl border border-white/10 bg-slate-950/80 p-3.5 sm:p-4 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Metric Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                <FiSliders className="h-3 w-3" /> Metric:
              </span>
              {Object.entries(metricLabels).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedMetric(key)}
                  className={`rounded-lg px-3 py-1 font-mono text-xs transition-all cursor-pointer ${
                    selectedMetric === key
                      ? 'bg-cyan-400/20 border border-cyan-400/50 text-cyan-200 shadow-[0_0_10px_rgba(0,217,255,0.2)] font-semibold'
                      : 'bg-white/[0.03] border border-white/8 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Class Search Filter */}
            <div className="relative w-full md:w-56">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter class (e.g. A, B)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/90 pl-8 pr-3 py-1 font-mono text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
              />
            </div>
          </div>

          {/* Empty / Calibration State Banner when data is unmeasured */}
          {!hasEvaluatedData && (
            <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <FiAlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-semibold">Evaluation data required:</span>
                <span className="text-slate-300">
                  Awaiting verified test-set execution. Handshape classes are calibrated and ready for benchmark ingestion.
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                26 Classes Standby
              </span>
            </div>
          )}
        </div>

        {/* 2-Column Horizontal Bar Chart Grid (A–Z) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
          {filteredClasses.map((item, idx) => {
            const val = item[selectedMetric];
            const isEvaluated = val !== null && val !== undefined;
            const isHovered = hoveredClass?.label === item.label;

            return (
              <div
                key={item.label}
                onMouseEnter={() => setHoveredClass(item)}
                onMouseLeave={() => setHoveredClass(null)}
                className={`glass-card group relative flex flex-col justify-between rounded-xl border p-3 sm:p-3.5 transition-all duration-200 ${
                  isHovered
                    ? 'border-cyan-400/50 bg-slate-900/90 shadow-[0_4px_20px_rgba(0,217,255,0.12)]'
                    : 'border-white/8 bg-slate-950/70 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2.5">
                    {/* Class Letter Box */}
                    <span className="grid h-7 w-7 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 font-mono text-xs font-bold text-cyan-200 shadow-sm">
                      {item.label}
                    </span>
                    <span className="text-xs text-slate-300 truncate max-w-[200px] sm:max-w-xs" title={item.handshape}>
                      {item.handshape}
                    </span>
                  </div>

                  {/* Value / Empty State Label */}
                  <div className="font-mono text-xs shrink-0">
                    {isEvaluated ? (
                      <span className="font-bold text-white">{val.toFixed(1)}%</span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Evaluation data required
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar / Standby Graticule Track */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-white/5">
                  {isEvaluated ? (
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                    />
                  ) : (
                    /* Subtle neutral calibration graticule */
                    <div className="h-full w-full bg-gradient-to-r from-cyan-500/10 via-white/5 to-cyan-500/10 opacity-70 animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hover / Tooltip Detail Drawer */}
        {hoveredClass && (
          <div className="mt-4 rounded-xl border border-cyan-400/30 bg-slate-950/95 p-3 font-mono text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-300 text-sm">Class '{hoveredClass.label}'</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">{hoveredClass.handshape}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-400">{metricLabels[selectedMetric]}:</span>
              <span className="font-bold text-cyan-200">
                {hoveredClass[selectedMetric] !== null ? `${hoveredClass[selectedMetric]}%` : 'Evaluation data required'}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
