import { FiBookOpen, FiCheckCircle, FiAlertCircle, FiCamera, FiCpu, FiCode } from 'react-icons/fi';
import Reveal from '../../components/Reveal.jsx';

export default function EvaluationMethodologySection({ methodology }) {
  const items = [
    {
      title: 'Dataset Ingestion',
      icon: FiBookOpen,
      desc: methodology.dataset,
      spec: methodology.datasetSize,
      status: 'Verified',
      isRecorded: true,
    },
    {
      title: 'Train / Validation / Test Splits',
      icon: FiAlertCircle,
      desc: 'Stratified signer partitioning methodology',
      spec: methodology.trainSplit, // 'Not recorded'
      status: 'Not recorded',
      isRecorded: false,
    },
    {
      title: 'Target Gestures',
      icon: FiCheckCircle,
      desc: methodology.classesCount,
      spec: '26 Alphabet Classes (A–Z)',
      status: 'Verified',
      isRecorded: true,
    },
    {
      title: 'Evaluation Metrics',
      icon: FiCode,
      desc: methodology.metrics,
      spec: 'Multi-class macro evaluation',
      status: 'Standardized',
      isRecorded: true,
    },
    {
      title: 'Webcam Testing Pipeline',
      icon: FiCamera,
      desc: methodology.webcamTesting,
      spec: 'Client WASM execution (Privacy-preserving)',
      status: 'Verified',
      isRecorded: true,
    },
    {
      title: 'Real-Time Inference Profiling',
      icon: FiCpu,
      desc: methodology.realTimeEvaluation,
      spec: 'Frame capture → MediaPipe → ONNX → Temporal Gating',
      status: 'Verified',
      isRecorded: true,
    },
  ];

  return (
    <section className="relative py-10 sm:py-12 border-b border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              Research Standards
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
              Evaluation Methodology
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              Evaluation protocols, runtime environment, and benchmark specifications using the project's actual pipeline.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-cyan-400/25 bg-slate-950/80 px-3 py-1 font-mono text-[10px] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Source: Verified project architecture</span>
          </div>
        </div>

        {/* 6-Grid Protocol Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {items.map(({ title, icon: Icon, desc, spec, status, isRecorded }) => (
            <div
              key={title}
              className="glass-card flex flex-col justify-between rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/80 p-4 sm:p-4.5 backdrop-blur-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400/10 border border-cyan-400/25 text-cyan-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                      isRecorded
                        ? 'bg-emerald-400/10 border border-emerald-400/30 text-emerald-300'
                        : 'bg-amber-400/10 border border-amber-400/30 text-amber-300'
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <h3 className="font-display text-sm sm:text-[15px] font-bold text-white">
                  {title}
                </h3>

                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  {desc}
                </p>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between font-mono text-[10px]">
                <span className="text-slate-500">Specification:</span>
                <span className={isRecorded ? 'text-cyan-300 font-semibold truncate max-w-[180px]' : 'text-amber-400 font-bold'}>
                  {spec}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
