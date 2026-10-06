import { FiTrendingUp, FiActivity, FiLayers, FiAlertCircle, FiCpu } from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';

export default function TrainingPerformanceSection({ trainingHistory }) {
  const isAvailable = trainingHistory.history !== null && trainingHistory.epochs !== null;

  return (
    <section className="relative py-10 sm:py-12 border-b border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              Optimization History
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
              Training Performance
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              Convergence trajectory across optimization epochs for accuracy and crossentropy loss.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 font-mono text-[10px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>Status: Training history not available</span>
          </div>
        </div>

        {/* Two Clean Charts: Accuracy & Loss */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* 1. Accuracy Panel */}
          <div className="glass-card flex flex-col justify-between rounded-2xl border border-white/12 bg-slate-950/90 p-5 backdrop-blur-xl shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300">
                    <FiTrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-display text-base font-bold text-white">
                    Accuracy Trajectory
                  </h3>
                </div>

                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <span className="h-1.5 w-3 bg-cyan-400 rounded-full" />
                    <span>Train</span>
                  </span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <span className="h-1.5 w-3 bg-blue-500 rounded-full" />
                    <span>Validation</span>
                  </span>
                </div>
              </div>

              {/* Chart Body / Standby State */}
              <div className="my-6 min-h-[180px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-white/5 bg-slate-900/40">
                {isAvailable ? (
                  <div>{/* Real Chart Line SVG */}</div>
                ) : (
                  <div className="flex flex-col items-center max-w-xs">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-white/5 border border-white/10 text-slate-400 mb-2">
                      <FiAlertCircle className="h-4 w-4" />
                    </div>
                    <div className="font-display text-sm font-bold text-slate-200">
                      Training history not available
                    </div>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Epoch convergence history is not serialized inside the standalone ONNX weights file. Zero artificial curves are rendered.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Panel Footer */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between font-mono text-[10px] text-slate-500">
              <span>Metric: Top-1 Categorical Accuracy</span>
              <span>X-Axis: Epoch (Standby)</span>
            </div>
          </div>

          {/* 2. Loss Panel */}
          <div className="glass-card flex flex-col justify-between rounded-2xl border border-white/12 bg-slate-950/90 p-5 backdrop-blur-xl shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300">
                    <FiActivity className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-display text-base font-bold text-white">
                    Loss Trajectory
                  </h3>
                </div>

                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <span className="h-1.5 w-3 bg-cyan-400 rounded-full" />
                    <span>Train</span>
                  </span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <span className="h-1.5 w-3 bg-blue-500 rounded-full" />
                    <span>Validation</span>
                  </span>
                </div>
              </div>

              {/* Chart Body / Standby State */}
              <div className="my-6 min-h-[180px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-white/5 bg-slate-900/40">
                {isAvailable ? (
                  <div>{/* Real Loss Line SVG */}</div>
                ) : (
                  <div className="flex flex-col items-center max-w-xs">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-white/5 border border-white/10 text-slate-400 mb-2">
                      <FiAlertCircle className="h-4 w-4" />
                    </div>
                    <div className="font-display text-sm font-bold text-slate-200">
                      Training history not available
                    </div>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Crossentropy loss per epoch is not recorded in the distributed client model. No synthetic loss curves fabricated.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Panel Footer */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between font-mono text-[10px] text-slate-500">
              <span>Loss: {trainingHistory.lossFunction}</span>
              <span>Optimizer: {trainingHistory.optimizer}</span>
            </div>
          </div>
        </div>

        {/* Architecture Specs Ribbon */}
        <div className="mt-4 glass-card rounded-xl border border-white/8 bg-slate-950/70 p-3.5 backdrop-blur-md flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <FiLayers className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="font-mono text-slate-400">Model Topology:</span>
            <span className="font-mono text-cyan-200">{trainingHistory.architecture}</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            Source: SignSpeak AI Architecture Config
          </span>
        </div>
      </div>
    </section>
  );
}
