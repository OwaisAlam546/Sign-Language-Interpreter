import { useState } from 'react';
import {
  FiCpu,
  FiTerminal,
  FiCopy,
  FiCheck,
  FiLayers,
  FiDatabase,
  FiActivity,
} from 'react-icons/fi';

export default function TensorArchitecturePod({ modelSpecs, dataset }) {
  const [copied, setCopied] = useState(false);
  const evalCmd = 'python backend/ai-service/scripts/evaluate_alphabet_landmark_model.py';

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(evalCmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const featureDimensions = [
    { label: '3D Landmarks', dims: 63, pct: 70, color: 'bg-cyan-400' },
    { label: 'Finger Curls', dims: 5, pct: 6, color: 'bg-blue-400' },
    { label: 'Joint Angles', dims: 5, pct: 6, color: 'bg-purple-400' },
    { label: 'Thumb Geometry', dims: 10, pct: 11, color: 'bg-amber-400' },
    { label: 'Spread Vectors', dims: 7, pct: 7, color: 'bg-emerald-400' },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5 backdrop-blur-2xl shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] font-mono text-xs">
        <div className="flex items-center gap-2">
          <FiCpu className="h-4 w-4 text-cyan-400" />
          <span className="font-bold uppercase tracking-wider text-[var(--text-main)]">
            Tensor Engine &amp; Feature Decomposition
          </span>
        </div>
        <span className="text-[10px] text-cyan-400">
          90-Dimensional Pipeline
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: 90D Feature Stream Vector */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-3.5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-cyan-300">Feature Vector Composition</span>
            <span className="text-[var(--text-sub)]">90 Float32 Values</span>
          </div>

          {/* Stacked bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-white/[0.04] border border-white/5">
            {featureDimensions.map((fd) => (
              <div
                key={fd.label}
                className={`${fd.color} h-full transition-all`}
                style={{ width: `${fd.pct}%` }}
                title={`${fd.label}: ${fd.dims} dimensions (${fd.pct}%)`}
              />
            ))}
          </div>

          {/* Breakdown legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] pt-1">
            {featureDimensions.map((fd) => (
              <div key={fd.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-xs ${fd.color} shrink-0`} />
                <span className="text-[var(--text-sub)] truncate">
                  {fd.label}: <strong className="text-[var(--text-main)]">{fd.dims}D</strong>
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-sub)]">
            Model: 3-Layer MLP (Dense 128 → 128 → 64 → 26) · ONNX WASM SIMD (159 KB)
          </div>
        </div>

        {/* Right: Benchmark Terminal Execution Launcher */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-black/40 p-3.5 space-y-2 font-mono text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-sub)] mb-2">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <FiTerminal className="h-3.5 w-3.5" />
                <span>Verification Pipeline CLI</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[var(--text-sub)] hover:text-cyan-300 transition-colors cursor-pointer"
              >
                {copied ? <FiCheck className="h-3.5 w-3.5 text-emerald-400" /> : <FiCopy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-2 rounded bg-black/70 border border-white/5 text-cyan-300 text-[11px] overflow-x-auto">
              <code>{evalCmd}</code>
            </div>

            <p className="mt-2 text-[10px] text-[var(--text-sub)] leading-relaxed">
              Executes validation on held-out test split (1,762 un-augmented samples) and records empirical accuracy, macro F1, and confusion matrix into the registry ledger.
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-sub)]">
            <span>Partition: 70% Train · 15% Val · 15% Test</span>
            <span className="text-emerald-400 font-semibold">Seed = 42</span>
          </div>
        </div>
      </div>
    </div>
  );
}
