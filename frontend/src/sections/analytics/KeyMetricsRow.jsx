import { FiActivity, FiTarget, FiAward, FiClock, FiCheckSquare, FiAlertCircle } from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';
import Counter from '../../components/Counter.jsx';

export default function KeyMetricsRow({ metrics }) {
  const metricItems = [
    {
      key: 'accuracy',
      label: 'Accuracy',
      item: metrics.accuracy,
      icon: FiCheckSquare,
      detail: 'Aggregated top-1 letter recognition accuracy across multi-signer evaluation test batches.',
    },
    {
      key: 'precision',
      label: 'Precision',
      item: metrics.precision,
      icon: FiTarget,
      detail: 'Macro-averaged precision across all 26 classes, evaluating positive prediction accuracy.',
    },
    {
      key: 'recall',
      label: 'Recall',
      item: metrics.recall,
      icon: FiActivity,
      detail: 'Macro-averaged sensitivity capturing true gesture coverage and minimization of false negatives.',
    },
    {
      key: 'f1',
      label: 'F1 Score',
      item: metrics.f1,
      icon: FiAward,
      detail: 'Harmonic mean of precision and recall providing balanced evaluation on class handshapes.',
    },
    {
      key: 'latency',
      label: 'Inference Latency',
      item: metrics.latency,
      icon: FiClock,
      detail: 'End-to-end frame processing delay from camera frame ingestion to model prediction.',
    },
  ];

  return (
    <section className="relative py-8 sm:py-10 border-b border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Trust Label */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-5 sm:mb-6">
          <div>
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              Core Model Benchmarks
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
              Key Performance Metrics
            </h2>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 font-mono text-[10px] text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Status: Awaiting verified test-set evaluation</span>
          </div>
        </div>

        {/* 5-Metric Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {metricItems.map(({ key, label, item, icon: Icon, detail }, index) => {
            const isAvailable = item?.value !== null && item?.value !== undefined;

            return (
              <Reveal key={key} delay={0.04 * index}>
                <div className="glass-card group relative flex h-full flex-col justify-between rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/80 p-4 sm:p-4.5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-cyan-400/40 hover:bg-slate-950/90 hover:shadow-[0_8px_30px_rgba(0,217,255,0.1)]">
                  <div>
                    {/* Header: Icon & Status Tag */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-slate-400">
                        {isAvailable ? 'Measured' : 'Standby'}
                      </span>
                    </div>

                    {/* Metric Label */}
                    <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300/90">
                      {label}
                    </div>

                    {/* Large Value / Status */}
                    <div className="mt-2 min-h-[44px] flex items-baseline">
                      {isAvailable ? (
                        <div className="font-display text-3xl font-bold tracking-tight text-white">
                          <Counter to={item.value} decimals={item.decimals ?? 1} suffix={item.unit ?? '%'} />
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono text-xl font-bold text-cyan-400/50">—</span>
                            <span className="font-display text-sm sm:text-[15px] font-bold tracking-tight text-slate-200">
                              Not Yet Measured
                            </span>
                          </div>
                          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-500">
                            Awaiting Evaluation
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Short Description */}
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                      {detail}
                    </p>
                  </div>

                  {/* Trust Footer */}
                  <div className="mt-4 pt-2.5 border-t border-white/[0.06] flex items-center justify-between font-mono text-[9px] text-slate-500">
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-cyan-400/80 animate-pulse'}`} />
                      {isAvailable ? 'Verified Value' : 'Zero-Fabrication Standby'}
                    </span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
