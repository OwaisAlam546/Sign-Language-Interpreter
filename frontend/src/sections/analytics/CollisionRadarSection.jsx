import { useState } from 'react';
import {
  FiAlertTriangle,
  FiActivity,
  FiLayers,
  FiShield,
  FiInfo,
  FiMaximize2,
  FiRefreshCw,
  FiCheckCircle,
} from 'react-icons/fi';

const COLLISION_PAIRS = [
  {
    id: 'mn',
    pair: ['M', 'N'],
    cluster: 'Fist Occlusion',
    severity: 'Critical Collision',
    severityColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    vectorDifference: 'Thumb tucked under 3 fingers (M) vs under 2 fingers (N). Distinguishable via thumb tip Euclidean distance to Ring PIP joint (norm_dist: 0.18 vs 0.42).',
    defenseFeature: 'Thumb-to-Ring PIP Euclidean Metric (Dim #78)',
  },
  {
    id: 'am',
    pair: ['A', 'M'],
    cluster: 'Fist Silhouette',
    severity: 'High Collision',
    severityColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    vectorDifference: 'Thumb alongside index outer edge (A) vs tucked underneath 3 fingers (M). Distinguishable via thumb z-depth coordinate relative to palm plane.',
    defenseFeature: 'Thumb Z-Depth Invariant (Dim #82)',
  },
  {
    id: 'st',
    pair: ['S', 'T'],
    cluster: 'Thumb Placement',
    severity: 'High Collision',
    severityColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    vectorDifference: 'Thumb wrapped across front of fist (S) vs thumb thrust between index & middle fingers (T). Distinguishable via thumb tip to Middle PIP distance.',
    defenseFeature: 'Thumb-to-Middle PIP Distance (Dim #76)',
  },
  {
    id: 'qp',
    pair: ['Q', 'P'],
    cluster: 'Downward Pitch',
    severity: 'High Collision',
    severityColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    vectorDifference: 'Downward pointing index/thumb (Q) vs downward K handshape (P). Disambiguated by middle finger downward extension vector.',
    defenseFeature: 'Middle Finger Downward Extension (Dim #88)',
  },
  {
    id: 'gp',
    pair: ['G', 'P'],
    cluster: 'Horizontal vs Down',
    severity: 'Medium Collision',
    severityColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    vectorDifference: 'Horizontal pointing G handshape vs downward angled P handshape. Resolved by wrist-to-index angle pitch vector.',
    defenseFeature: 'Wrist-to-Index Direction Angle (Dim #89)',
  },
  {
    id: 'xs',
    pair: ['X', 'S'],
    cluster: 'Knuckle Collapse',
    severity: 'High Collision',
    severityColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    vectorDifference: 'Hooked bent index finger (X) visually collapses into closed fist (S) from front angles. Resolved by index PIP joint angle cosine.',
    defenseFeature: 'Index PIP Joint Angle Cosine (Dim #69)',
  },
  {
    id: 'ji',
    pair: ['J', 'I'],
    cluster: 'Motion Freeze',
    severity: 'Dynamic Ambiguity',
    severityColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    vectorDifference: 'Single-frame capture of dynamic J trace resembles static upright pinky (I). Resolved by temporal motion queue sliding window (size=4).',
    defenseFeature: 'Temporal Hysteresis Smoothing (Window: 4)',
  },
];

export default function CollisionRadarSection({ confusionMatrix, onSelectClassLetter }) {
  const [selectedPair, setSelectedPair] = useState(COLLISION_PAIRS[0]);
  const [showFullMatrix, setShowFullMatrix] = useState(false);

  const labels = confusionMatrix?.labels || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5 backdrop-blur-2xl shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)] font-mono text-xs">
        <div className="flex items-center gap-2">
          <FiAlertTriangle className="h-4 w-4 text-amber-400" />
          <span className="font-bold uppercase tracking-wider text-[var(--text-main)]">
            Kinematic Collision Radar
          </span>
          <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/25">
            Topological Confusion Topology
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowFullMatrix(!showFullMatrix)}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer self-start sm:self-auto"
        >
          {showFullMatrix ? '← Collapse to Collision Radar' : 'View Full 26×26 Matrix Tensor →'}
        </button>
      </div>

      {showFullMatrix ? (
        /* Full 26x26 Matrix Tensor Mode */
        <div className="space-y-3">
          <div className="text-xs text-[var(--text-sub)] flex items-center justify-between">
            <span>26×26 Classification Cross-Entropy Tensor (X: Predicted, Y: Actual)</span>
            <span className="font-mono text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded">
              Zero-Fabrication Standby
            </span>
          </div>

          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="inline-block min-w-[620px]">
              {/* Header col */}
              <div className="flex items-center text-[9px] font-mono text-[var(--text-sub)] font-bold">
                <div className="w-8 shrink-0 text-center">Y \ X</div>
                {labels.map((c) => (
                  <div key={c} className="flex-1 text-center py-0.5">{c}</div>
                ))}
              </div>

              {/* Rows */}
              <div className="space-y-0.5 mt-0.5">
                {labels.map((r, rIdx) => (
                  <div key={r} className="flex items-center text-[8px] font-mono">
                    <div className="w-8 shrink-0 text-center font-bold text-cyan-400">{r}</div>
                    <div className="flex flex-1 items-center gap-0.5">
                      {labels.map((c, cIdx) => {
                        const isDiag = rIdx === cIdx;
                        return (
                          <div
                            key={c}
                            className={`flex-1 h-5 rounded-xs flex items-center justify-center ${
                              isDiag
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold'
                                : 'bg-white/[0.02] text-slate-700 hover:bg-cyan-400/10 hover:text-white cursor-pointer'
                            }`}
                            title={`Actual '${r}' → Predicted '${c}' (Standby for test run)`}
                          >
                            {isDiag ? '✓' : '·'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Collision Radar Chord Pod Mode */
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] gap-4">
          {/* Collision Pair Selector Grid */}
          <div className="space-y-2">
            <span className="block font-mono text-[10px] uppercase text-[var(--text-sub)] tracking-wider">
              Documented Misclassification Vortexes
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {COLLISION_PAIRS.map((cp) => {
                const isSelected = selectedPair.id === cp.id;
                return (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => setSelectedPair(cp)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-cyan-400/50 bg-cyan-400/15 shadow-[0_0_15px_rgba(0,217,255,0.15)]'
                        : 'border-[var(--border-subtle)] bg-white/[0.02] hover:border-cyan-400/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1 font-mono text-xs font-bold">
                        <span className="grid h-6 w-6 place-items-center rounded bg-cyan-400/20 text-cyan-300">
                          {cp.pair[0]}
                        </span>
                        <span className="text-[var(--text-sub)]">↔</span>
                        <span className="grid h-6 w-6 place-items-center rounded bg-purple-400/20 text-purple-300">
                          {cp.pair[1]}
                        </span>
                      </div>
                      <div>
                        <div className="font-mono text-xs font-semibold text-[var(--text-main)]">
                          {cp.cluster}
                        </div>
                      </div>
                    </div>

                    <span className={`font-mono text-[9px] uppercase px-2 py-0.5 rounded border font-semibold ${cp.severityColor}`}>
                      {cp.severity}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deep Dive Collision Disambiguation Panel */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/90 p-4 font-mono text-xs flex flex-col justify-between space-y-3">
            <div>
              {/* Pair Banner */}
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[var(--text-main)]">
                    Collision Collision: '{selectedPair.pair[0]}' versus '{selectedPair.pair[1]}'
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectClassLetter && onSelectClassLetter(selectedPair.pair[0])}
                    className="px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400/30 text-[10px]"
                  >
                    Inspect '{selectedPair.pair[0]}'
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectClassLetter && onSelectClassLetter(selectedPair.pair[1])}
                    className="px-2 py-0.5 rounded bg-purple-400/20 text-purple-300 hover:bg-purple-400/30 text-[10px]"
                  >
                    Inspect '{selectedPair.pair[1]}'
                  </button>
                </div>
              </div>

              {/* Vector Difference Description */}
              <div className="mt-3 space-y-2">
                <span className="text-[10px] uppercase text-cyan-400 font-semibold block">
                  Topological Boundary Analysis:
                </span>
                <p className="text-xs text-[var(--text-main)] leading-relaxed">
                  {selectedPair.vectorDifference}
                </p>
              </div>

              {/* Engineered 90D Defense */}
              <div className="mt-3 p-3 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] space-y-1">
                <span className="text-[10px] uppercase text-emerald-400 font-semibold block">
                  Disambiguating Feature Metric:
                </span>
                <div className="text-xs text-white font-bold">
                  {selectedPair.defenseFeature}
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-sub)]">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Zero-Fabrication State: Quantitative counts pending multi-signer test run</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
