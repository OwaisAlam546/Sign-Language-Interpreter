import { useState } from 'react';
import {
  FiAlertTriangle,
  FiShield,
  FiInfo,
  FiLayers,
  FiCheckCircle,
  FiActivity,
  FiChevronRight,
  FiMaximize2,
} from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';

export default function CriticalDiagnosticsSection({
  criticalDiagnostics,
  onSelectClassLetter,
}) {
  const [activeGroup, setActiveGroup] = useState('fist');

  const groups = criticalDiagnostics || [
    {
      id: 'fist',
      title: 'Fist Group Variations',
      classes: ['A', 'M', 'N', 'S', 'T'],
      kinematicChallenge:
        'Closed fist silhouette where distinguishing feature is subtle thumb tucking: resting beside index (A), under 3 fingers (M), under 2 fingers (N), folded in front across fingers (S), or tucked between index and middle (T).',
      topologicalMarkers:
        'Thumb tip distances to index/middle/ring PIP joints and thumb relative z-depth coordinate.',
      confusionPairs: [
        { pair: 'A / M', risk: 'High', description: 'Thumb resting beside index vs folded under 3 fingers; easily confused if camera viewpoint hides thumb knuckle.' },
        { pair: 'M / N', risk: 'Critical', description: 'Thumb under 3 fingers vs 2 fingers; often indistinguishable in 2D silhouette without precise landmark depth.' },
        { pair: 'S / T', risk: 'High', description: 'Thumb across front of fingers vs tucked specifically between index and middle finger knuckles.' },
        { pair: 'A / S', risk: 'Medium', description: 'Thumb alongside index edge vs thumb wrapped across the front face of the fingers.' },
      ],
      status: 'Calibration Active · Formal Test Benchmark Awaiting Ingestion',
    },
    {
      id: 'pointing',
      title: 'Downward & Angled Signs',
      classes: ['Q', 'P', 'G'],
      kinematicChallenge:
        'G and Q share index finger pointing forward/downward with thumb parallel. P is downward-pointing K handshape. Camera pitch angle and hand tilt create significant perspective distortion.',
      topologicalMarkers:
        'Wrist-to-index angle vector, palm normal z-plane orientation, and middle-finger downward extension.',
      confusionPairs: [
        { pair: 'Q / P', risk: 'High', description: 'Downward pointing G handshape vs downward K handshape; dependent on middle finger angle.' },
        { pair: 'G / P', risk: 'High', description: 'Horizontal index/thumb pointing vs downward angled handshape.' },
        { pair: 'G / J', risk: 'Medium', description: 'Static horizontal index pose vs starting posture of dynamic J trace.' },
      ],
      status: 'Calibration Active · Formal Test Benchmark Awaiting Ingestion',
    },
    {
      id: 'hooked',
      title: 'Hooked Knuckle Finger',
      classes: ['X'],
      kinematicChallenge:
        'Index finger hooked/bent at knuckle in otherwise closed fist. In front-facing camera views, the hooked index finger can visually collapse into a flat fist (S), curled fingers (E), or tucked thumb (N).',
      topologicalMarkers:
        'Index PIP joint angle cosine and tip-to-MCP span curl ratio vs middle finger curl.',
      confusionPairs: [
        { pair: 'X / S', risk: 'High', description: 'Hooked index finger vs full fist with thumb wrapped across.' },
        { pair: 'X / E', risk: 'Medium', description: 'Single hooked index vs all four fingertips curled tightly onto thumb.' },
        { pair: 'X / N', risk: 'Medium', description: 'Hooked index knuckle silhouette vs two fingers folded forward.' },
      ],
      status: 'Calibration Active · Formal Test Benchmark Awaiting Ingestion',
    },
    {
      id: 'dynamic',
      title: 'Dynamic Trajectory Signs',
      classes: ['J', 'Z'],
      kinematicChallenge:
        'In natural American Sign Language, J and Z are movement-based signs (J traces a curved hook in the air, Z traces a zigzag with index finger). Single-frame static image classifiers capture only an arbitrary temporal freeze-frame of the motion path.',
      topologicalMarkers:
        'Multi-frame temporal motion vector and spatial landmark trajectory tracking.',
      confusionPairs: [
        { pair: 'J / I', risk: 'High', description: 'J freeze-frame often looks like static pinky upright (I).' },
        { pair: 'Z / D', risk: 'High', description: 'Z freeze-frame resembles index pointing upright (D) before or during the zigzag stroke.' },
      ],
      status: 'Motion Dependent · Multi-frame Temporal Gating Required',
    },
  ];

  const currentGroup = groups.find((g) => g.id === activeGroup) || groups[0];

  return (
    <section id="diagnostics" className="relative py-8 sm:py-10 border-b border-[var(--border-subtle)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
                Anatomical Challenges
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-sub)]" />
              <span className="font-mono text-[10px] text-[var(--text-sub)] uppercase">
                Kinematic Disambiguation
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)] mt-0.5">
              Critical-Class Diagnostics
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-sub)] max-w-2xl">
              Specialized analysis of historically ambiguous ASL handshapes where subtle knuckle angles or thumb positions create high misclassification risk.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 font-mono text-[10px] text-amber-300">
            <FiShield className="h-3 w-3 text-amber-400" />
            <span>Empirical Measurements Strictly Distinguished from Theory</span>
          </div>
        </div>

        {/* Diagnostic Group Selector Tabs */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {groups.map((group) => {
            const isSelected = activeGroup === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveGroup(group.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_15px_rgba(0,217,255,0.1)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-cyan-400/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {group.classes.map((c) => (
                      <span
                        key={c}
                        className={`font-mono text-xs font-bold rounded px-1.5 py-0.2 ${
                          isSelected ? 'bg-cyan-400/30 text-white' : 'bg-white/[0.04] text-[var(--text-main)]'
                        }`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
                </div>
                <div className="font-display text-xs sm:text-sm font-semibold text-[var(--text-main)] truncate">
                  {group.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Group Deep Dive Display */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6 shadow-xl space-y-5">
          {/* Top Panel: Group Title + Class Quick Links */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                  {currentGroup.title}
                </h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 font-semibold">
                  High Ambiguity Cluster
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-sub)]">
                Target Alphabet Classes: {currentGroup.classes.join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-sub)] mr-1">Inspect:</span>
              {currentGroup.classes.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => onSelectClassLetter && onSelectClassLetter(cls)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border-subtle)] bg-white/[0.04] font-mono text-sm font-bold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-400/20 transition-all cursor-pointer"
                  title={`Inspect class ${cls}`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          {/* Kinematic Challenge & Engineered 90D Defense */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-amber-400 font-semibold mb-2">
                <FiAlertTriangle className="h-4 w-4" />
                <span>Kinematic Root Cause</span>
              </div>
              <p className="text-xs text-[var(--text-main)] leading-relaxed">
                {currentGroup.kinematicChallenge}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-cyan-400 font-semibold mb-2">
                <FiActivity className="h-4 w-4" />
                <span>90-Feature Vector Safeguard</span>
              </div>
              <p className="text-xs text-[var(--text-main)] leading-relaxed">
                {currentGroup.topologicalMarkers}
              </p>
              <div className="mt-2 text-[11px] text-[var(--text-sub)] font-mono">
                Engineered in <code className="text-cyan-400">prepare_alphabet_landmark_dataset.py</code>
              </div>
            </div>
          </div>

          {/* Documented Confusion Pairs Table */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-cyan-400 font-semibold">
                <FiLayers className="h-4 w-4" />
                <span>Documented Confusion Pairs</span>
              </div>
              <span className="font-mono text-[10px] text-[var(--text-sub)]">
                Observed in Literature &amp; Scripts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentGroup.confusionPairs.map((pairItem) => (
                <div
                  key={pairItem.pair}
                  className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-3 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-white text-sm">
                      {pairItem.pair}
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase px-2 py-0.5 rounded font-semibold ${
                        pairItem.risk === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : pairItem.risk === 'High'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {pairItem.risk} Risk
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-sub)] leading-snug">
                    {pairItem.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Status Banner */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-sub)]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Status: {currentGroup.status}</span>
            </div>
            <span className="font-mono text-[10px] text-cyan-400">
              No arbitrary claims made without verified benchmark data
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
