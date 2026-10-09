import { useEffect } from 'react';
import { FiX, FiCheckCircle, FiAlertTriangle, FiLayers, FiInfo, FiActivity, FiDatabase } from 'react-icons/fi';

export default function ClassDetailModal({ classItem, datasetSamples, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!classItem) return null;

  const letter = classItem.label;
  const count = datasetSamples?.[letter] ?? null;
  const totalDataset = 11742;
  const pctOfDataset = count ? ((count / totalDataset) * 100).toFixed(2) : null;

  // Determine kinematic difficulty category based on known challenging groups
  const isFistGroup = ['A', 'M', 'N', 'S', 'T'].includes(letter);
  const isDownwardGroup = ['Q', 'P', 'G'].includes(letter);
  const isHookedGroup = letter === 'X';
  const isDynamicGroup = ['J', 'Z'].includes(letter);

  let difficultyLevel = 'Standard';
  let difficultyColor = 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
  let kinematicNote = 'Standard static handshape with distinct finger extension pattern.';

  if (isFistGroup) {
    difficultyLevel = 'Critical — Fist Variation';
    difficultyColor = 'text-amber-400 border-amber-400/30 bg-amber-400/10';
    kinematicNote = 'Closed fist silhouette where thumb placement (beside, under, front, or tucked) is the sole distinguishing feature.';
  } else if (isDownwardGroup) {
    difficultyLevel = 'High — Angled / Downward';
    difficultyColor = 'text-amber-400 border-amber-400/30 bg-amber-400/10';
    kinematicNote = 'Downward-pointing handshape with sensitivity to camera pitch and perspective foreshortening.';
  } else if (isHookedGroup) {
    difficultyLevel = 'High — Knuckle Hook';
    difficultyColor = 'text-rose-400 border-rose-400/30 bg-rose-400/10';
    kinematicNote = 'Index finger curled at knuckle joint in fist; prone to planar silhouette collapse in 2D projection.';
  } else if (isDynamicGroup) {
    difficultyLevel = 'Motion-Dependent (Dynamic)';
    difficultyColor = 'text-purple-400 border-purple-400/30 bg-purple-400/10';
    kinematicNote = 'Natural ASL sign incorporates spatial trajectory; static freeze-frame requires temporal smoothing.';
  }

  // Confusion risk partners
  const confusionMap = {
    A: ['M', 'S', 'T', 'N'],
    B: ['D', '4'],
    C: ['O'],
    D: ['1', 'Z', 'B'],
    E: ['S', 'O', 'X'],
    F: ['9', 'D'],
    G: ['P', 'Q', 'H'],
    H: ['G', 'U'],
    I: ['J', 'Y'],
    J: ['I', 'Z'],
    K: ['V', 'P'],
    L: ['D'],
    M: ['N', 'A', 'S'],
    N: ['M', 'A', 'T', 'X'],
    O: ['C', 'E'],
    P: ['Q', 'K', 'G'],
    Q: ['P', 'G'],
    R: ['U', 'V'],
    S: ['A', 'T', 'E', 'X'],
    T: ['S', 'A', 'N', 'M'],
    U: ['V', 'H', 'R'],
    V: ['U', 'K', 'W'],
    W: ['V', '3'],
    X: ['S', 'E', 'N'],
    Y: ['I'],
    Z: ['D', 'J'],
  };

  const confusionPartners = confusionMap[letter] || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="class-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6 shadow-2xl text-[var(--text-main)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3.5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-cyan-400/40 bg-gradient-to-br from-cyan-400/20 to-blue-500/10 font-mono text-2xl font-bold text-cyan-300 shadow-[0_0_15px_rgba(0,217,255,0.2)]">
              {letter}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="class-modal-title" className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)]">
                  Class '{letter}' Details
                </h3>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${difficultyColor}`}>
                  {difficultyLevel}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-sub)]">
                ASL Alphabet Gesture Class · Index {letter.charCodeAt(0) - 65} of 26
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close details modal"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Handshape Description */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-cyan-400 font-semibold mb-1.5">
              <FiLayers className="h-3.5 w-3.5" />
              <span>Handshape Anatomy</span>
            </div>
            <p className="text-sm text-[var(--text-main)] leading-relaxed">
              {classItem.handshape}
            </p>
            <p className="mt-2 text-xs text-[var(--text-sub)] leading-normal">
              {kinematicNote}
            </p>
          </div>

          {/* Dataset Support & Feature Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Dataset Support */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-sub)] font-semibold mb-2">
                <FiDatabase className="h-3.5 w-3.5 text-cyan-400" />
                <span>Dataset Ground Truth</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-[var(--text-main)]">
                  {count !== null ? count.toLocaleString() : '—'}
                </span>
                <span className="text-xs text-[var(--text-sub)]">samples</span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-[var(--text-sub)]">
                {pctOfDataset ? `${pctOfDataset}% of total Kaggle dataset` : 'Kaggle ASL Alphabet stills'}
              </div>
              <div className="mt-2 text-[11px] text-[var(--text-sub)] pt-2 border-t border-[var(--border-subtle)]">
                Split: ~{Math.round((count || 0) * 0.70)} train · ~{Math.round((count || 0) * 0.15)} val · ~{Math.round((count || 0) * 0.15)} test
              </div>
            </div>

            {/* 90D Feature Representation */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-sub)] font-semibold mb-2">
                <FiActivity className="h-3.5 w-3.5 text-cyan-400" />
                <span>Feature Vector Encoding</span>
              </div>
              <div className="font-display text-2xl font-bold text-[var(--text-main)]">
                90-Dim
              </div>
              <div className="mt-1 font-mono text-[11px] text-[var(--text-sub)]">
                Geometric Invariants
              </div>
              <div className="mt-2 text-[11px] text-[var(--text-sub)] pt-2 border-t border-[var(--border-subtle)]">
                21 3D Landmarks (63D) + 5 Curls + 5 Angles + 10 Thumb + 7 Spreads
              </div>
            </div>
          </div>

          {/* Known Confusion Partners */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
                <FiAlertTriangle className="h-3.5 w-3.5" />
                <span>Topological Confusion Risks</span>
              </div>
              <span className="font-mono text-[10px] text-[var(--text-sub)]">
                Kinematic Similarity
              </span>
            </div>
            {confusionPartners.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--text-sub)]">Frequent confusion pairs:</span>
                {confusionPartners.map((partner) => (
                  <span
                    key={partner}
                    className="inline-flex items-center gap-1 rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-300"
                  >
                    '{letter}' ↔ '{partner}'
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-sub)]">
                No high-risk topological collision recorded in kinematic baseline.
              </p>
            )}
          </div>

          {/* Evaluation Metrics Honest Empty State */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-400 font-semibold">
                Benchmark Evaluation Metrics
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Awaiting Evaluation
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-2.5">
                <div className="font-mono text-[10px] uppercase text-[var(--text-sub)]">Precision</div>
                <div className="mt-1 font-mono text-base font-bold text-[var(--text-main)]">
                  {classItem.precision !== null ? `${classItem.precision}%` : '—'}
                </div>
                <div className="text-[9px] text-[var(--text-sub)] mt-0.5">Not measured</div>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-2.5">
                <div className="font-mono text-[10px] uppercase text-[var(--text-sub)]">Recall</div>
                <div className="mt-1 font-mono text-base font-bold text-[var(--text-main)]">
                  {classItem.recall !== null ? `${classItem.recall}%` : '—'}
                </div>
                <div className="text-[9px] text-[var(--text-sub)] mt-0.5">Not measured</div>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-2.5">
                <div className="font-mono text-[10px] uppercase text-[var(--text-sub)]">F1 Score</div>
                <div className="mt-1 font-mono text-base font-bold text-[var(--text-main)]">
                  {classItem.f1 !== null ? `${classItem.f1}%` : '—'}
                </div>
                <div className="text-[9px] text-[var(--text-sub)] mt-0.5">Not measured</div>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] text-[var(--text-sub)] text-center leading-normal">
              Per-class test metrics will be computed upon formal multi-signer test set execution.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-sub)]">
          <span className="font-mono text-[10px]">SignSpeak AI · Model Observability</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.04] px-4 py-1.5 font-sans font-medium text-[var(--text-main)] hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
