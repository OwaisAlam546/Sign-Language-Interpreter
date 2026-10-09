import { useState, useMemo } from 'react';
import {
  FiGrid,
  FiInfo,
  FiAlertCircle,
  FiZoomIn,
  FiZoomOut,
  FiMaximize2,
  FiShield,
  FiHelpCircle,
} from 'react-icons/fi';

export default function ConfusionMatrixSection({ confusionMatrix }) {
  const labels = confusionMatrix?.labels || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const data = confusionMatrix?.data || null;
  const isAvailable = data !== null && Array.isArray(data);

  const [hoveredCell, setHoveredCell] = useState(null);
  const [matrixDensity, setMatrixDensity] = useState('standard'); // 'standard' | 'compact'
  const [highlightDiagonalOnly, setHighlightDiagonalOnly] = useState(false);

  // Cell size based on density
  const cellSizeClass = matrixDensity === 'compact' ? 'h-5 sm:h-6 min-w-[20px] sm:min-w-[24px] text-[8px]' : 'h-6 sm:h-7 min-w-[24px] sm:min-w-[28px] text-[9px]';

  return (
    <section id="confusion" className="relative py-8 sm:py-10 border-b border-[var(--border-subtle)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
                Error Topology
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-sub)]" />
              <span className="font-mono text-[10px] text-[var(--text-sub)] uppercase">
                26 × 26 Classification Tensor
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)] mt-0.5">
              Confusion Matrix
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-sub)] max-w-2xl">
              Cross-entropy prediction distribution mapping true ground-truth gestures against predicted outputs to expose empirical confusion clusters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Density Selector */}
            <div className="flex items-center gap-1 bg-white/[0.02] border border-[var(--border-subtle)] rounded-lg p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setMatrixDensity('compact')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  matrixDensity === 'compact' ? 'bg-cyan-400/20 text-cyan-300 font-semibold' : 'text-[var(--text-sub)]'
                }`}
                title="Compact cell density"
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => setMatrixDensity('standard')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  matrixDensity === 'standard' ? 'bg-cyan-400/20 text-cyan-300 font-semibold' : 'text-[var(--text-sub)]'
                }`}
                title="Standard cell density"
              >
                Standard
              </button>
            </div>

            {/* Diagonal Filter Toggle */}
            <button
              type="button"
              onClick={() => setHighlightDiagonalOnly(!highlightDiagonalOnly)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                highlightDiagonalOnly
                  ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-300 font-semibold'
                  : 'border-[var(--border-subtle)] text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              {highlightDiagonalOnly ? 'Show All Cells' : 'Focus True Positives'}
            </button>
          </div>
        </div>

        {/* Zero-Fabrication Honest Empty State Banner */}
        {!isAvailable && (
          <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/[0.04] p-4 text-xs text-[var(--text-sub)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-start sm:items-center gap-3">
              <FiAlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <div className="font-semibold text-[var(--text-main)]">
                  Evaluation Data Required: 26×26 Confusion Matrix Standby
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-sub)] leading-relaxed">
                  Off-diagonal error counts require running inference over held-out multi-signer test splits. In accordance with our zero-fabrication protocol, matrix cells are never filled with synthetic random values.
                </p>
              </div>
            </div>

            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/25 px-2.5 py-1 rounded-full shrink-0">
              Zero-Fabrication Grid
            </span>
          </div>
        )}

        {/* Matrix Container */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5 shadow-xl overflow-hidden">
          {/* Axis Legend Header */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-400">
              <FiGrid className="h-4 w-4" />
              <span className="font-semibold">Horizontal Axis (X):</span>
              <span className="text-[var(--text-main)]">Predicted Class (Model Classification Output A–Z)</span>
            </div>
            <div className="text-[var(--text-sub)] text-[11px]">
              <span className="font-semibold text-cyan-400">Vertical Axis (Y):</span> Actual Class (Ground Truth A–Z)
            </div>
          </div>

          {/* Scrollable Matrix Table */}
          <div className="overflow-x-auto pb-3 -mx-2 px-2 scrollbar-thin">
            <div className="inline-block min-w-[760px] select-none">
              {/* Predicted Column Labels Header (Top X-Axis) */}
              <div className="flex items-center">
                {/* Corner intersection block */}
                <div className="w-10 sm:w-12 shrink-0 text-center font-mono text-[9px] uppercase font-bold text-[var(--text-sub)] pr-1">
                  ACT \ PRED
                </div>
                {/* Column letters A-Z */}
                {labels.map((col) => {
                  const isHoveredCol = hoveredCell?.predicted === col;
                  return (
                    <div
                      key={col}
                      className={`flex-1 text-center font-mono font-bold py-1 transition-colors ${
                        isHoveredCol
                          ? 'text-cyan-300 bg-cyan-400/10 rounded'
                          : 'text-[var(--text-sub)]'
                      }`}
                      style={{ minWidth: matrixDensity === 'compact' ? '20px' : '24px' }}
                    >
                      {col}
                    </div>
                  );
                })}
              </div>

              {/* Matrix Rows (A-Z Ground Truth) */}
              <div className="space-y-0.5 mt-1">
                {labels.map((rowLabel, rowIndex) => {
                  const isHoveredRow = hoveredCell?.actual === rowLabel;

                  return (
                    <div key={rowLabel} className="flex items-center">
                      {/* Row letter label (Sticky Left Y-Axis) */}
                      <div
                        className={`w-10 sm:w-12 shrink-0 text-center font-mono text-[10px] font-bold pr-1 transition-colors ${
                          isHoveredRow
                            ? 'text-cyan-300 bg-cyan-400/10 rounded'
                            : 'text-[var(--text-sub)]'
                        }`}
                      >
                        {rowLabel}
                      </div>

                      {/* Cells in Row */}
                      <div className="flex flex-1 items-center gap-0.5">
                        {labels.map((colLabel, colIndex) => {
                          const isDiagonal = rowIndex === colIndex;
                          const cellValue = isAvailable ? data[rowIndex][colIndex] : null;
                          const isCrosshair =
                            hoveredCell &&
                            (hoveredCell.actual === rowLabel || hoveredCell.predicted === colLabel);
                          const isExactCell =
                            hoveredCell?.actual === rowLabel && hoveredCell?.predicted === colLabel;

                          // Dim if focusing diagonal only
                          if (highlightDiagonalOnly && !isDiagonal) {
                            return (
                              <div
                                key={colLabel}
                                className={`flex-1 ${cellSizeClass} rounded-sm flex items-center justify-center font-mono opacity-15 border border-transparent`}
                              >
                                ·
                              </div>
                            );
                          }

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
                              className={`flex-1 ${cellSizeClass} rounded-sm flex items-center justify-center font-mono transition-all cursor-pointer ${
                                isExactCell
                                  ? 'ring-2 ring-cyan-400 bg-cyan-400/30 text-white z-10 font-bold scale-110 shadow-lg'
                                  : isCrosshair
                                  ? 'bg-cyan-400/[0.08]'
                                  : isAvailable
                                  ? isDiagonal
                                    ? 'bg-cyan-500/40 text-white font-bold border border-cyan-400/50'
                                    : cellValue > 0
                                    ? 'bg-blue-600/30 text-[var(--text-main)]'
                                    : 'bg-white/[0.02] text-[var(--text-sub)] opacity-30'
                                  : isDiagonal
                                  ? 'bg-cyan-400/15 border border-cyan-400/35 text-cyan-300'
                                  : 'bg-white/[0.02] border border-white/[0.03] text-[var(--text-sub)] opacity-30 hover:opacity-100 hover:border-cyan-400/40'
                              }`}
                            >
                              {isAvailable ? (
                                cellValue > 0 ? (
                                  cellValue
                                ) : (
                                  '·'
                                )
                              ) : isDiagonal ? (
                                <span className="font-bold">✓</span>
                              ) : (
                                '·'
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Inspection Footbar */}
          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
            {hoveredCell ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-cyan-300">
                  Actual: '{hoveredCell.actual}' → Predicted: '{hoveredCell.predicted}'
                </span>
                <span className="text-[var(--text-sub)]">|</span>
                <span className="text-[var(--text-main)]">
                  {hoveredCell.value !== null
                    ? `Count: ${hoveredCell.value}`
                    : 'Count: Unmeasured (Awaiting test run)'}
                </span>
                {hoveredCell.isDiagonal ? (
                  <span className="rounded bg-emerald-400/15 border border-emerald-400/30 px-2 py-0.5 text-[9px] text-emerald-300 font-semibold">
                    True Positive (Agreement)
                  </span>
                ) : (
                  <span className="rounded bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[9px] text-amber-300 font-semibold">
                    Off-Diagonal Misclassification Risk
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[var(--text-sub)] text-[11px]">
                <FiInfo className="h-3.5 w-3.5 text-cyan-400" />
                <span>Hover over any coordinate to inspect pair-wise actual vs predicted classification rate.</span>
              </div>
            )}

            {/* Color Scale Legend */}
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-sub)] shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-cyan-400/20 border border-cyan-400/50" />
                <span>Diagonal (True Positives)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-white/[0.04] border border-white/[0.08]" />
                <span>Off-Diagonal (Confusion)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
