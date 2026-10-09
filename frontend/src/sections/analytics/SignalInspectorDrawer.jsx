import { useEffect } from 'react';
import { FiX, FiActivity, FiLayers, FiAlertTriangle, FiShield, FiDatabase } from 'react-icons/fi';
import { COLLISION_FILAMENTS } from './SignalFieldCanvas.jsx';

export default function SignalInspectorDrawer({ selectedNode, classItem, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!selectedNode) return null;

  const letter = selectedNode.id;
  const count = selectedNode.samples;
  const total = 11742;
  const pct = ((count / total) * 100).toFixed(2);

  // Find related collision filaments for this specific letter
  const relatedFilaments = COLLISION_FILAMENTS.filter(
    (f) => f.from === letter || f.to === letter
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspector-heading"
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg h-full bg-[#070A0F] border-l border-white/10 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto text-slate-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-2xl border border-[#00F0FF]/50 bg-[#00F0FF]/10 font-mono text-3xl font-black text-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                {letter}
              </span>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#00F0FF] font-bold">
                  SIGNAL PROBE // CLASS {letter}
                </span>
                <h2 id="inspector-heading" className="font-display text-2xl font-black text-white">
                  Letter '{letter}' Topology
                </h2>
                <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                  Cluster Group: <span className="uppercase text-slate-200">{selectedNode.group}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close signal inspector"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Handshape Anatomy Section */}
          <div className="mt-6 space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
              <span className="flex items-center gap-2 text-[10px] uppercase text-[#00F0FF] tracking-wider font-bold">
                <FiLayers className="h-3.5 w-3.5" />
                <span>Kinematic Handshape Specification</span>
              </span>
              <p className="text-sm text-white font-sans leading-relaxed">
                {classItem?.handshape || selectedNode.name}
              </p>
            </div>

            {/* Dataset Support & Partitioning */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                <span className="text-[10px] uppercase text-slate-500 block">Kaggle Support</span>
                <div className="mt-1 text-2xl font-black text-white font-display">
                  {count.toLocaleString()}
                </div>
                <span className="text-[10px] text-[#00F0FF] mt-0.5 block">
                  {pct}% of 11,742 total
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                <span className="text-[10px] uppercase text-slate-500 block">Test Partition</span>
                <div className="mt-1 text-2xl font-black text-white font-display">
                  ~{Math.round(count * 0.15)}
                </div>
                <span className="text-[10px] text-purple-400 mt-0.5 block">
                  15% Held-Out (seed 42)
                </span>
              </div>
            </div>

            {/* Active Collision Filaments */}
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[10px] uppercase text-amber-400 tracking-wider font-bold">
                  <FiAlertTriangle className="h-3.5 w-3.5" />
                  <span>Documented Collision Vectors</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {relatedFilaments.length} Pair{relatedFilaments.length === 1 ? '' : 's'}
                </span>
              </div>

              {relatedFilaments.length > 0 ? (
                <div className="space-y-2">
                  {relatedFilaments.map((f) => (
                    <div
                      key={`${f.from}-${f.to}`}
                      className="p-2.5 rounded-lg border border-white/5 bg-black/40 text-[11px]"
                    >
                      <div className="flex items-center justify-between font-bold text-white mb-1">
                        <span>{f.label}</span>
                        <span className="text-[9px] text-[#00F0FF] uppercase bg-[#00F0FF]/10 px-1.5 py-0.2 rounded">
                          {f.severity}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-snug">
                        {f.reason}
                      </p>
                      <div className="mt-1 text-[10px] text-slate-500 font-mono">
                        Defense: <span className="text-slate-300">{f.dim}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-[11px]">
                  No high-risk topological collision recorded in kinematic baseline.
                </p>
              )}
            </div>

            {/* 90-Feature Encoding Info */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-1 text-[11px] text-slate-400">
              <span className="text-[10px] uppercase text-slate-500 block">Tensor Encoding:</span>
              <p>
                Encoded via 90 Float32 features: 63 coordinates (wrist-centered, palm-normalized) + 5 PIP curl ratios + 5 joint angles + 10 thumb distances + 7 spread vectors.
              </p>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs text-slate-500">
          <span>AI Signal Lab · Observability</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Close Probe
          </button>
        </div>
      </div>
    </div>
  );
}
