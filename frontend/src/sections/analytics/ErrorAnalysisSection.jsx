import { FiAlertTriangle, FiAlertCircle, FiInfo, FiLayers, FiHelpCircle } from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';

export default function ErrorAnalysisSection({ errors }) {
  const isAvailable = errors.mostChallengingClasses !== null && errors.commonConfusions !== null;

  return (
    <section className="relative py-10 sm:py-12 border-b border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              Diagnostic Insights
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
              Error Analysis
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              Identification of difficult hand gestures and frequent pair-wise misclassifications.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 font-mono text-[10px] text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Status: Awaiting test-set evaluation</span>
          </div>
        </div>

        {/* Empty State Banner */}
        {!isAvailable && (
          <div className="glass-card mb-5 rounded-xl border border-amber-400/30 bg-slate-950/90 p-4 backdrop-blur-xl shadow-lg">
            <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 text-amber-300">
                <FiAlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-display text-sm font-bold text-white">
                  Error analysis unavailable until test-set evaluation is completed.
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                Zero-Fabrication Policy
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed max-w-3xl">
              Empirical failure modes must be mathematically derived from verified test predictions rather than fabricated. Error analytics will populate immediately once multi-signer evaluation scripts conclude.
            </p>
          </div>
        )}

        {/* Two Clean Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Panel 1: Most Challenging Classes */}
          <div className="glass-card flex flex-col justify-between rounded-2xl border border-white/12 bg-slate-950/90 p-5 backdrop-blur-xl shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300">
                    <FiAlertTriangle className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-display text-base font-bold text-white">
                    Most Challenging Classes
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-slate-400 uppercase">
                  Lowest Verified F1 / Accuracy
                </span>
              </div>

              {/* Body */}
              <div className="my-6 min-h-[140px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-white/5 bg-slate-900/40">
                {isAvailable ? (
                  <div>{/* Real challenging classes */}</div>
                ) : (
                  <div className="flex flex-col items-center max-w-xs">
                    <FiHelpCircle className="h-7 w-7 text-slate-500 mb-2" />
                    <div className="font-display text-sm font-bold text-slate-300">
                      Error analysis unavailable
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Awaiting test-set evaluation. Rankings will reflect ground truth recall and precision deficits.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] text-xs text-slate-500 font-mono">
              Benchmark Target: 26 Classes evaluated across multi-signer validation sets
            </div>
          </div>

          {/* Panel 2: Common Confusions */}
          <div className="glass-card flex flex-col justify-between rounded-2xl border border-white/12 bg-slate-950/90 p-5 backdrop-blur-xl shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300">
                    <FiLayers className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-display text-base font-bold text-white">
                    Common Confusions
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-slate-400 uppercase">
                  Most Frequent Error Pairs
                </span>
              </div>

              {/* Body */}
              <div className="my-6 min-h-[140px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-white/5 bg-slate-900/40">
                {isAvailable ? (
                  <div>{/* Real frequent pairs */}</div>
                ) : (
                  <div className="flex flex-col items-center max-w-xs">
                    <FiHelpCircle className="h-7 w-7 text-slate-500 mb-2" />
                    <div className="font-display text-sm font-bold text-slate-300">
                      Error analysis unavailable
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Off-diagonal confusion matrix pair tallies will be automatically listed here upon evaluation.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] text-xs text-slate-500 font-mono">
              Classification Metric: Off-diagonal frequency rank
            </div>
          </div>
        </div>

        {/* Theoretical Kinematic Ambiguities Note (Informational Research Context) */}
        <div className="mt-4 glass-card rounded-xl border border-white/8 bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-300 font-semibold mb-2">
            <FiInfo className="h-3.5 w-3.5" />
            <span>Documented Topological Handshape Challenges (Kinematics Reference)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {errors.knownTopologicalChallenges.map(({ pair, reason }) => (
              <div key={pair.join('-')} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <div className="font-mono font-bold text-white text-xs mb-1">
                  Classes '{pair[0]}' ↔ '{pair[1]}'
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
