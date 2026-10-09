import { useState } from 'react';
import {
  FiCpu,
  FiDatabase,
  FiLayers,
  FiShield,
  FiCheckCircle,
  FiBarChart2,
  FiActivity,
  FiExternalLink,
} from 'react-icons/fi';

export default function ModelSpecsSection({ modelSpecs, dataset }) {
  const [activeTab, setActiveTab] = useState('architecture'); // 'architecture' | 'dataset'

  const totalSamples = dataset?.totalSamples || 11742;
  const samplesPerClass = dataset?.samplesPerClass || {};
  const maxSamples = Math.max(...Object.values(samplesPerClass), 500);

  const layerItems = modelSpecs?.layerStructure || [
    { layer: 'Input Tensor', spec: 'Shape: [1, 90] — 90-dimensional normalized geometric handshape features' },
    { layer: 'Dense Block 1', spec: '128 units, ReLU activation, Batch Normalization, Dropout (rate = 0.2)' },
    { layer: 'Dense Block 2', spec: '128 units, ReLU activation, Batch Normalization, Dropout (rate = 0.2)' },
    { layer: 'Dense Block 3', spec: '64 units, ReLU activation, Batch Normalization, Dropout (rate = 0.1)' },
    { layer: 'Softmax Output', spec: '26 units, Softmax activation (Normalized probability distribution over A–Z)' },
  ];

  const featureItems = modelSpecs?.featureBreakdown || [
    { category: 'Base 3D Coordinates', count: '63 dims', detail: '21 MediaPipe hand landmarks (x, y, z) centered at wrist and normalized by palm radius' },
    { category: 'Finger Curl Ratios', count: '5 dims', detail: 'Tip-to-MCP Euclidean span normalized by bone chain length (thumb, index, middle, ring, pinky)' },
    { category: 'Finger Joint Angles', count: '5 dims', detail: 'Cosine of PIP joint bending angle between MCP->PIP and PIP->DIP bone vectors' },
    { category: 'Thumb Relative Distances', count: '9 dims', detail: 'Thumb tip Euclidean distance to index, middle, ring, and pinky MCP, PIP, and Tip landmarks' },
    { category: 'Thumb Z-Depth', count: '1 dim', detail: 'Relative depth of thumb tip compared to mean finger plane (tucked under vs in front)' },
    { category: 'Inter-finger Spreads', count: '7 dims', detail: 'Adjacent fingertip spans, peace sign V-spread, hooked X knuckle span, and palm normal vector' },
  ];

  return (
    <section id="specs" className="relative py-8 sm:py-10 border-b border-[var(--border-subtle)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
                Engineering Blueprint
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-sub)]" />
              <span className="font-mono text-[10px] text-[var(--text-sub)] uppercase">
                Technical Specifications
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)] mt-0.5">
              Model &amp; Dataset Specifications
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-sub)] max-w-2xl">
              Architecture documentation for the 90-feature Multi-Layer Perceptron, landmark geometry representations, and dataset partition distribution.
            </p>
          </div>

          {/* Sub-tab switcher */}
          <div className="flex items-center gap-1 bg-white/[0.02] border border-[var(--border-subtle)] rounded-lg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-cyan-400/20 text-cyan-300 font-semibold'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              Model Architecture
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dataset')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeTab === 'dataset'
                  ? 'bg-cyan-400/20 text-cyan-300 font-semibold'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              Dataset Distribution
            </button>
          </div>
        </div>

        {/* Tab 1: Architecture & Feature Engineering */}
        {activeTab === 'architecture' ? (
          <div className="space-y-5">
            {/* Quick Specs Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 font-mono text-xs">
                <span className="text-[10px] uppercase text-[var(--text-sub)]">Model Architecture</span>
                <div className="font-bold text-[var(--text-main)] mt-0.5">3-Layer MLP</div>
                <div className="text-[10px] text-cyan-400 mt-0.5">37,018 Parameters</div>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 font-mono text-xs">
                <span className="text-[10px] uppercase text-[var(--text-sub)]">Input Tensor</span>
                <div className="font-bold text-[var(--text-main)] mt-0.5">[1, 90] Float32</div>
                <div className="text-[10px] text-cyan-400 mt-0.5">Geometric Invariants</div>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 font-mono text-xs">
                <span className="text-[10px] uppercase text-[var(--text-sub)]">Output Tensor</span>
                <div className="font-bold text-[var(--text-main)] mt-0.5">[1, 26] Softmax</div>
                <div className="text-[10px] text-cyan-400 mt-0.5">Alphabet Classes A–Z</div>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 font-mono text-xs">
                <span className="text-[10px] uppercase text-[var(--text-sub)]">Runtime Engine</span>
                <div className="font-bold text-[var(--text-main)] mt-0.5">ONNX Web SIMD</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">159 KB Client WASM</div>
              </div>
            </div>

            {/* Neural Network Layer Sequence */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  <FiCpu className="h-4 w-4" />
                  <span>Sequential Layer Pipeline (AlphabetLandmarkMLP)</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--text-sub)]">
                  Feedforward Forward Pass
                </span>
              </div>

              <div className="space-y-2">
                {layerItems.map((item, index) => (
                  <div
                    key={item.layer}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded bg-cyan-400/10 text-cyan-300 font-bold text-[11px]">
                        0{index + 1}
                      </span>
                      <span className="font-bold text-[var(--text-main)]">{item.layer}</span>
                    </div>
                    <span className="text-[var(--text-sub)] text-[11px] sm:text-right">
                      {item.spec}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 90-Dimensional Feature Engineering Breakdown */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  <FiActivity className="h-4 w-4" />
                  <span>90-Dimensional Feature Decomposition</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--text-sub)]">
                  Scale &amp; Translation Invariant
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {featureItems.map((f) => (
                  <div
                    key={f.category}
                    className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[var(--text-main)]">{f.category}</span>
                        <span className="font-mono text-[10px] text-cyan-400 font-bold bg-cyan-400/10 px-1.5 py-0.2 rounded border border-cyan-400/25">
                          {f.count}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-sub)] leading-snug mt-1">
                        {f.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: Dataset Breakdown & Per-Class Sample Distribution */
          <div className="space-y-5">
            {/* Dataset Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 font-mono text-xs">
                <span className="text-[10px] uppercase text-[var(--text-sub)]">Total Dataset Samples</span>
                <div className="font-bold text-[var(--text-main)] mt-0.5 text-base sm:text-lg">
                  {totalSamples.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                  <FiCheckCircle className="h-3 w-3" />
                  <span>Kaggle ASL Alphabet</span>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 font-mono text-xs">
                <span className="text-[10px] uppercase text-[var(--text-sub)]">Target Classes</span>
                <div className="font-bold text-[var(--text-main)] mt-0.5 text-base sm:text-lg">
                  26 Classes
                </div>
                <div className="text-[10px] text-cyan-400 mt-0.5">Alphabet A through Z</div>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 font-mono text-xs">
                <span className="text-[10px] uppercase text-[var(--text-sub)]">Stratified Split</span>
                <div className="font-bold text-[var(--text-main)] mt-0.5 text-base sm:text-lg">
                  70 / 15 / 15%
                </div>
                <div className="text-[10px] text-cyan-400 mt-0.5">Seed = 42 reproducible</div>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 font-mono text-xs">
                <span className="text-[10px] uppercase text-[var(--text-sub)]">Held-Out Test Set</span>
                <div className="font-bold text-[var(--text-main)] mt-0.5 text-base sm:text-lg">
                  1,762 Samples
                </div>
                <div className="text-[10px] text-cyan-400 mt-0.5">Un-augmented benchmark</div>
              </div>
            </div>

            {/* 26-Class Sample Distribution Chart */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  <FiBarChart2 className="h-4 w-4" />
                  <span>Ground Truth Sample Frequency Distribution (A–Z)</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--text-sub)]">
                  Dataset Range: 166 (N) to 500 (S)
                </span>
              </div>

              <div className="space-y-1.5 pt-2">
                {Object.entries(samplesPerClass).map(([letter, count]) => {
                  const pct = ((count / maxSamples) * 100).toFixed(0);
                  const isUnderRepresented = count < 300;

                  return (
                    <div key={letter} className="flex items-center gap-2 text-xs font-mono">
                      <span className="w-6 shrink-0 font-bold text-cyan-300 text-center">
                        {letter}
                      </span>
                      <div className="flex-1 bg-white/[0.04] rounded-full h-4 overflow-hidden border border-white/5 relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isUnderRepresented
                              ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right font-medium text-[var(--text-main)]">
                        {count.toLocaleString()}
                        <span className="text-[9px] text-[var(--text-sub)] ml-1">imgs</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-sub)]">
                <span>Amber bars denote classes with sample counts &lt; 300 (e.g. N: 166, M: 290).</span>
                <span className="font-mono text-[10px]">Source: Kaggle grassknoted/asl-alphabet</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
