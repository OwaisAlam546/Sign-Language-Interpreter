import { useState } from 'react';
import {
  FiClock,
  FiTerminal,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiPlay,
  FiCopy,
  FiCheck,
} from 'react-icons/fi';

export default function EvaluationHistorySection({ evaluationHistory = [] }) {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const evalCommand = 'python backend/ai-service/scripts/evaluate_alphabet_landmark_model.py';

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(evalCommand);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  const hasRuns = Array.isArray(evaluationHistory) && evaluationHistory.length > 0;

  return (
    <section id="history" className="relative py-8 sm:py-10 border-b border-[var(--border-subtle)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
                Version Observability
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-sub)]" />
              <span className="font-mono text-[10px] text-[var(--text-sub)] uppercase">
                Run Registry
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)] mt-0.5">
              Evaluation History
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-sub)] max-w-2xl">
              Chronological log of formal evaluation runs, validation splits, and version-over-version benchmark comparisons.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-cyan-400/25 bg-[var(--bg-card)] px-3 py-1 font-mono text-[10px] text-cyan-300">
            <FiShield className="h-3 w-3 text-cyan-400" />
            <span>Zero Synthetic Runs Policy</span>
          </div>
        </div>

        {/* If historical records exist: Table */}
        {hasRuns ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-white/[0.02] text-[10px] uppercase tracking-wider text-[var(--text-sub)]">
                    <th scope="col" className="py-3 px-4">Run ID</th>
                    <th scope="col" className="py-3 px-4">Evaluation Date</th>
                    <th scope="col" className="py-3 px-4">Model Version</th>
                    <th scope="col" className="py-3 px-4 text-right">Test Accuracy</th>
                    <th scope="col" className="py-3 px-4 text-right">Macro F1</th>
                    <th scope="col" className="py-3 px-4 text-right">Sample Count</th>
                    <th scope="col" className="py-3 px-4 text-center">Δ vs Previous</th>
                    <th scope="col" className="py-3 px-4 text-right">Environment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {evaluationHistory.map((run) => (
                    <tr key={run.id} className="hover:bg-cyan-500/[0.03] transition-colors">
                      <td className="py-3 px-4 text-cyan-300 font-bold">{run.id}</td>
                      <td className="py-3 px-4 text-[var(--text-main)]">{run.date}</td>
                      <td className="py-3 px-4 text-[var(--text-sub)]">{run.version}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">{run.accuracy}%</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">{run.macroF1}%</td>
                      <td className="py-3 px-4 text-right text-[var(--text-main)]">{run.sampleCount}</td>
                      <td className="py-3 px-4 text-center">{run.diff || '—'}</td>
                      <td className="py-3 px-4 text-right text-[var(--text-sub)]">{run.environment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Clean, Honest ML Platform Empty State */
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8 backdrop-blur-xl shadow-lg">
            <div className="max-w-2xl mx-auto text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-400 mb-3.5 shadow-[0_0_20px_rgba(0,217,255,0.15)]">
                <FiClock className="h-6 w-6" />
              </div>

              <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--text-main)]">
                No Historical Evaluation Runs Recorded
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[var(--text-sub)] leading-relaxed">
                The repository does not store historical evaluation logs in its public client bundle. Past runs or phantom trend lines are never simulated.
              </p>

              {/* Execution Registry Guide */}
              <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-slate-900/80 p-4 text-left font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-sub)]">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <FiTerminal className="h-3.5 w-3.5" />
                    <span>Run Verification Pipeline</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[var(--text-sub)] hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {copiedCmd ? <FiCheck className="h-3.5 w-3.5 text-emerald-400" /> : <FiCopy className="h-3.5 w-3.5" />}
                    <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="bg-black/50 p-2.5 rounded-lg border border-white/5 text-cyan-300 overflow-x-auto">
                  <code>{evalCommand}</code>
                </div>

                <p className="text-[11px] text-[var(--text-sub)] leading-normal pt-1">
                  Executing this command runs Keras &amp; ONNX evaluation against the 1,762 held-out test samples and logs classification metrics, macro F1, and critical pair diagnostics into the registry ledger.
                </p>
              </div>

              {/* Active Model Specification Card */}
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-3 font-mono text-xs">
                  <div className="text-[10px] uppercase text-[var(--text-sub)]">Active Artifact</div>
                  <div className="font-bold text-[var(--text-main)] mt-0.5 truncate">alphabet_landmark_model.onnx</div>
                  <div className="text-[10px] text-cyan-400 mt-0.5">159 KB · Version v1.0.0</div>
                </div>

                <div className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-3 font-mono text-xs">
                  <div className="text-[10px] uppercase text-[var(--text-sub)]">Held-Out Test Set</div>
                  <div className="font-bold text-[var(--text-main)] mt-0.5">1,762 Samples</div>
                  <div className="text-[10px] text-cyan-400 mt-0.5">Stratified (15% of 11,742)</div>
                </div>

                <div className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-3 font-mono text-xs">
                  <div className="text-[10px] uppercase text-[var(--text-sub)]">Registry Status</div>
                  <div className="font-bold text-[var(--text-main)] mt-0.5">Standby for Run #01</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Schema Validated</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
