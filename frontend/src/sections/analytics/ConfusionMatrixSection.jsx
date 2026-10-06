import { useState } from 'react';
import { FiGrid, FiInfo, FiAlertCircle } from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';

export default function ConfusionMatrixSection({ confusionMatrix }) {
  const labels = confusionMatrix.labels; // 26 letters A-Z
  const data = confusionMatrix.data; // null or 2D array [26][26]
  const isAvailable = data !== null && Array.isArray(data);

  const [hoveredCell, setHoveredCell] = useState(null);

  return (
    <section className="relative py-10 sm:py-12 border-b border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              Error Topology
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
              Confusion Matrix
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              Visualizing where similar handshapes are incorrectly classified.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-cyan-400/25 bg-slate-950/80 px-3 py-1 font-mono text-[10px] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Status: Awaiting test-set evaluation</span>
          </div>
        </div>

        {/* Empty State Banner when unmeasured */}
        {!isAvailable && (
          <div className="glass-card mb-5 rounded-xl border border-amber-400/30 bg-slate-950/90 p-4 backdrop-blur-xl shadow-lg">
            <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 text-amber-300">
                <FiAlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-display text-sm font-bold tracking-tight text-white">
                  Confusion matrix will appear after verified test-set evaluation.
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                Zero-Fabrication Grid Standby
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed max-w-3xl">
              To preserve scientific integrity, cell values are not fabricated. Once test-set inference is run across multi-signer video recordings, this 26×26 matrix will map pair-wise classification distributions.
            </p>
          </div>
        )}

        {/* Matrix Container with Horizontal Scroll Support */}
        <div className="glass-card rounded-2xl border border-white/12 bg-slate-950/95 p-4 sm:p-6 backdrop-blur-xl shadow-xl overflow-hidden">
          {/* Axis Labels Header */}
          <div className="mb-3 flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <FiGrid className="h-3.5 w-3.5 text-cyan-400" />
              <span>Horizontal Axis: Predicted Class (A–Z)</span>
            </div>
            <div className="hidden sm:block text-[11px] text-slate-500">
              Vertical Axis: Actual Ground Truth (A–Z)
            </div>
          </div>

          {/* Scrollable Grid Table */}
          <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
            <div className="inline-block min-w-[780px]">
              {/* Predicted Axis Top Column Header */}
              <div className="flex items-center">
                {/* Empty corner for row label axis */}
                <div className="w-8 shrink-0 text-center font-mono text-[9px] uppercase font-bold text-slate-500">
                  ACT \ PRED
                </div>
                {labels.map((col) => (
                  <div
                    key={col}
                    className="flex-1 text-center font-mono text-[10px] font-bold text-cyan-300 py-1"
                  >
                    {col}
                  </div>
                ))}
              </div>

              {/* Matrix Rows (A-Z) */}
              <div className="space-y-0.5 mt-1">
                {labels.map((rowLabel, rowIndex) => (
                  <div key={rowLabel} className="flex items-center">
                    {/* Actual Class Row Label */}
                    <div className="w-8 shrink-0 text-center font-mono text-[10px] font-bold text-cyan-300 pr-1">
                      {rowLabel}
                    </div>

                    {/* Cells */}
                    <div className="flex flex-1 items-center gap-0.5">
                      {labels.map((colLabel, colIndex) => {
                        const isDiagonal = rowIndex === colIndex;
                        const cellValue = isAvailable ? data[rowIndex][colIndex] : null;

                        return (
                          <div
                            key={colLabel}
                            onMouseEnter={() =>
                              setHoveredCell({
                                actual: rowLabel,
                                predicted: colLabel,
                                isDiagonal,
                                value: cellValue,
                              })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`flex-1 h-6 sm:h-7 rounded-sm flex items-center justify-center font-mono text-[9px] transition-all cursor-pointer ${
                              isAvailable
                                ? isDiagonal
                                  ? 'bg-cyan-500/40 text-white font-bold border border-cyan-400/50'
                                  : cellValue > 0
                                  ? 'bg-blue-600/30 text-slate-200'
                                  : 'bg-white/[0.02] text-slate-600'
                                : isDiagonal
                                ? 'bg-cyan-400/15 border border-cyan-400/30 text-cyan-300/80'
                                : 'bg-white/[0.02] border border-white/[0.03] text-slate-700 hover:border-cyan-400/40 hover:bg-cyan-400/10'
                            }`}
                          >
                            {isAvailable ? (
                              cellValue > 0 ? cellValue : '·'
                            ) : (
                              <span className="opacity-40">{isDiagonal ? '—' : '·'}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hover Status Footer */}
          <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between flex-wrap gap-2 font-mono text-xs text-slate-400">
            {hoveredCell ? (
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 font-bold">
                  Actual: '{hoveredCell.actual}' → Predicted: '{hoveredCell.predicted}'
                </span>
                <span className="text-slate-500">|</span>
                <span>
                  {hoveredCell.value !== null
                    ? `Count: ${hoveredCell.value}`
                    : 'Count: Unmeasured (Awaiting verified test-set evaluation)'}
                </span>
                {hoveredCell.isDiagonal && (
                  <span className="rounded bg-cyan-400/10 border border-cyan-400/30 px-1.5 py-0.2 text-[9px] text-cyan-300">
                    True Positive Diagonal
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                <FiInfo className="h-3 w-3" />
                <span>Hover over any matrix coordinate to inspect predicted vs actual class associations.</span>
              </div>
            )}

            <span className="text-slate-500 text-[10px]">
              26 × 26 Classification Tensor
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
