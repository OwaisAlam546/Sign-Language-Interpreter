import { useState } from 'react';
import {
  FiCheckCircle,
  FiTarget,
  FiActivity,
  FiAward,
  FiHash,
  FiClock,
  FiHelpCircle,
  FiInfo,
  FiAlertCircle,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';
import Counter from '../../components/Counter.jsx';

export default function ModelOverviewSection({ metrics, status, onNavigateToTab }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  const overviewCards = [
    {
      id: 'accuracy',
      label: 'Overall Test Accuracy',
      shortLabel: 'Top-1 Accuracy',
      value: metrics.accuracy?.value ?? null,
      unit: '%',
      decimals: 1,
      icon: FiCheckCircle,
      status: metrics.accuracy?.status || 'Not Yet Measured',
      formula: 'True Positives / Total Test Samples',
      description:
        'Proportion of held-out test frames where the highest probability prediction corresponds exactly to the ground truth ASL letter.',
      whyItMatters:
        'Primary baseline indicator of overall classification correctness across the full alphabet vocabulary.',
    },
    {
      id: 'macroF1',
      label: 'Macro F1-Score',
      shortLabel: 'Macro F1',
      value: metrics.f1?.value ?? null,
      unit: '%',
      decimals: 1,
      icon: FiAward,
      status: metrics.f1?.status || 'Not Yet Measured',
      formula: '(1 / 26) * ∑ F1_class',
      description:
        'Unweighted arithmetic mean of F1-scores across all 26 alphabet classes, weighting every letter equally regardless of its frequency.',
      whyItMatters:
        'Crucial for detecting failure on under-represented gestures (e.g. N with 166 samples vs S with 500 samples).',
    },
    {
      id: 'weightedF1',
      label: 'Weighted F1-Score',
      shortLabel: 'Weighted F1',
      value: metrics.weightedF1?.value ?? null,
      unit: '%',
      decimals: 1,
      icon: FiTrendingUp,
      status: metrics.weightedF1?.status || 'Not Yet Measured',
      formula: '∑ (Support_class / Total_Samples) * F1_class',
      description:
        'Harmonic mean of precision and recall weighted by each class’s natural support in the held-out evaluation dataset.',
      whyItMatters:
        'Reflects aggregate model reliability weighted by real-world class occurrence frequencies.',
    },
    {
      id: 'precision',
      label: 'Macro Precision',
      shortLabel: 'Precision',
      value: metrics.precision?.value ?? null,
      unit: '%',
      decimals: 1,
      icon: FiTarget,
      status: metrics.precision?.status || 'Not Yet Measured',
      formula: 'True Positives / (True Positives + False Positives)',
      description:
        'Measures positive prediction trustworthiness: when the model predicts letter X, how often is the user actually signing X.',
      whyItMatters:
        'Suppresses false alarms and prevents the interpreter from committing erroneous character keystrokes.',
    },
    {
      id: 'recall',
      label: 'Macro Recall',
      shortLabel: 'Recall (Sensitivity)',
      value: metrics.recall?.value ?? null,
      unit: '%',
      decimals: 1,
      icon: FiActivity,
      status: metrics.recall?.status || 'Not Yet Measured',
      formula: 'True Positives / (True Positives + False Negatives)',
      description:
        'Measures gesture coverage sensitivity: of all times letter X was actually signed, how often did the model recognize it.',
      whyItMatters:
        'Ensures the user does not have to repeatedly sign the same gesture because the detector missed it.',
    },
    {
      id: 'samples',
      label: 'Evaluation Sample Count',
      shortLabel: 'Evaluation Samples',
      value: metrics.samplesCount?.value ?? null,
      fallbackDisplay: '1,762 (Held-out Test Split)',
      unit: '',
      decimals: 0,
      icon: FiHash,
      status: 'Partition Verified · Run Standby',
      formula: '15% Stratified Partition of 11,742 Dataset',
      description:
        'Number of un-augmented, held-out test frames reserved strictly for validation across multi-signer runs.',
      whyItMatters:
        'Prevents data leakage. Guarantees that evaluation results reflect generalization rather than memorized training images.',
    },
  ];

  return (
    <section id="overview" className="relative py-8 sm:py-10 border-b border-[var(--border-subtle)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Title & Integrity Notice */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
                Evaluation Telemetry
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-sub)]" />
              <span className="font-mono text-[10px] text-[var(--text-sub)] uppercase">
                Model Observability
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)] mt-0.5">
              Model Overview
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-sub)] max-w-2xl">
              High-level observability metrics quantifying generalization, accuracy, precision, and sensitivity across all classes.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-cyan-400/25 bg-[var(--bg-card)] px-3 py-1 font-mono text-[10px] text-cyan-300">
            <FiShield className="h-3 w-3 text-cyan-400" />
            <span>Integrity: Zero-Fabrication Protocol</span>
          </div>
        </div>

        {/* Zero-Fabrication Transparency Banner */}
        <div className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3.5 sm:p-4 text-xs leading-relaxed text-[var(--text-sub)] flex items-start gap-3">
          <FiInfo className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[var(--text-main)]">
              Formal Benchmark Standby:
            </span>{' '}
            To guarantee absolute scientific integrity, test metrics display honest empty states (
            <span className="font-mono text-cyan-400 font-medium">Not measured</span>) until executed against independent multi-signer evaluation datasets. Training accuracy is never misrepresented as test accuracy.
          </div>
        </div>

        {/* 6-Card Overview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {overviewCards.map((card, idx) => {
            const isAvailable = card.value !== null && card.value !== undefined;
            const Icon = card.icon;
            const isTooltipOpen = activeTooltip === card.id;

            return (
              <Reveal key={card.id} delay={idx * 0.04}>
                <div className="relative group flex h-full flex-col justify-between rounded-xl sm:rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5 backdrop-blur-xl shadow-md hover:border-cyan-400/40 hover:shadow-[0_8px_30px_rgba(0,217,255,0.08)] transition-all">
                  <div>
                    {/* Top Row: Icon + Tooltip button + Status pill */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                          {card.shortLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveTooltip(isTooltipOpen ? null : card.id)}
                          className="rounded p-1 text-[var(--text-sub)] hover:text-cyan-300 transition-colors cursor-pointer"
                          aria-label={`Explain ${card.label}`}
                          title="Click for explanation"
                        >
                          <FiHelpCircle className="h-3.5 w-3.5" />
                        </button>
                        <span className="rounded-full border border-[var(--border-subtle)] bg-white/[0.04] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[var(--text-sub)]">
                          {isAvailable ? 'Measured' : 'Standby'}
                        </span>
                      </div>
                    </div>

                    {/* Metric Label */}
                    <div className="font-display text-sm font-semibold text-[var(--text-main)]">
                      {card.label}
                    </div>

                    {/* Metric Value Display */}
                    <div className="mt-2 min-h-[46px] flex items-baseline">
                      {isAvailable ? (
                        <div className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-main)]">
                          <Counter to={card.value} decimals={card.decimals} suffix={card.unit} />
                        </div>
                      ) : card.fallbackDisplay ? (
                        <div className="flex flex-col">
                          <div className="font-mono text-base sm:text-lg font-bold text-cyan-300">
                            {card.fallbackDisplay}
                          </div>
                          <span className="text-[10px] text-[var(--text-sub)] font-mono mt-0.5">
                            Stratified 15% seed=42
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-2xl font-bold text-cyan-400/50">—</span>
                          <div className="flex flex-col">
                            <span className="font-sans text-sm font-semibold text-[var(--text-main)]">
                              Not measured
                            </span>
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-sub)]">
                              Awaiting test run
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="mt-2 text-xs text-[var(--text-sub)] leading-relaxed line-clamp-2">
                      {card.description}
                    </p>

                    {/* Tooltip Accordion Panel */}
                    {isTooltipOpen && (
                      <div className="mt-3 p-3 rounded-lg border border-cyan-400/30 bg-cyan-400/5 text-xs text-[var(--text-main)] space-y-1.5 animate-fadeIn">
                        <div className="font-mono text-[10px] uppercase text-cyan-300 font-semibold">
                          Mathematical Definition
                        </div>
                        <div className="font-mono text-[11px] bg-slate-900/60 p-1.5 rounded border border-white/5 text-slate-200">
                          {card.formula}
                        </div>
                        <div className="text-[11px] text-[var(--text-sub)] pt-1">
                          <span className="font-semibold text-cyan-300">SignSpeak AI Context:</span>{' '}
                          {card.whyItMatters}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Provenance */}
                  <div className="mt-4 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between font-mono text-[9px] text-[var(--text-sub)]">
                    <span className="flex items-center gap-1">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isAvailable ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'
                        }`}
                      />
                      <span>{card.status}</span>
                    </span>
                    <span className="text-slate-500">26 Classes</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Quick Navigation Anchor Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-sub)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>Deep Dive Sections:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab('classes')}
              className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-white/[0.02] hover:border-cyan-400/40 hover:text-cyan-300 transition-colors font-mono text-[11px]"
            >
              Alphabet Performance (A–Z) →
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('confusion')}
              className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-white/[0.02] hover:border-cyan-400/40 hover:text-cyan-300 transition-colors font-mono text-[11px]"
            >
              26×26 Confusion Matrix →
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('diagnostics')}
              className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-white/[0.02] hover:border-cyan-400/40 hover:text-cyan-300 transition-colors font-mono text-[11px]"
            >
              Critical Classes →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
