import { useEffect, useState } from 'react';
import SpinningGlobe from './analytics/SpinningGlobe.jsx';
import ModelStatusHUD from './analytics/ModelStatusHUD.jsx';
import TacticalControlsBar from './analytics/TacticalControlsBar.jsx';
import ModelPerformanceCard from './analytics/ModelPerformanceCard.jsx';
import AlphabetPerformanceList from './analytics/AlphabetPerformanceList.jsx';
import AlphabetBarChart from './analytics/AlphabetBarChart.jsx';
import PerformanceGraph from './analytics/PerformanceGraph.jsx';
import { ANALYTICS_DATA } from '../lib/analyticsData.js';
import { useRouter } from '../context/RouterContext.jsx';
import {
  FiArrowLeft,
  FiCamera,
  FiMaximize2,
} from 'react-icons/fi';

export default function AnalyticsPage() {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedLetter, setSelectedLetter] = useState('A');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    document.title = 'SignSpeak AI — Model Performance // Neural Command Center';

    if (window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative min-h-screen text-slate-100 bg-[#02050A] selection:bg-cyan-500/30 overflow-x-hidden font-sans">
      {/* Deep Space Background Glow & Star Dust */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,217,255,0.07)_0%,rgba(14,116,244,0.03)_40%,transparent_75%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.03)_0%,transparent_60%)]"
        aria-hidden="true"
      />

      {/* Main Command Center Container */}
      <div className="relative z-10 mx-auto max-w-[1600px] px-3 sm:px-5 lg:px-7 pt-20 sm:pt-24 pb-10 flex flex-col gap-4 sm:gap-5">
        {/* ------------------------------------------------------------- */}
        {/* 1. Cyber Command Navigation Header (matching Reference Top Bar) */}
        {/* ------------------------------------------------------------- */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3 border-b border-white/10 font-mono text-xs">
          {/* Left: Brand & Telemetry Identification */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-white/10 bg-slate-950/80 hover:border-cyan-400/50 hover:text-cyan-300 transition-all cursor-pointer text-slate-300"
              title="Return to Home"
            >
              <FiArrowLeft className="h-3.5 w-3.5" />
              <span className="font-bold text-[11px]">HOME</span>
            </button>

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00D9FF]" />
                <h1 className="font-display text-sm sm:text-base font-black tracking-wider text-white uppercase flex items-center gap-1.5">
                  <span>SIGNSPEAK AI</span>
                  <span className="text-slate-500 font-mono font-normal">//</span>
                  <span className="text-cyan-400 font-mono font-semibold text-xs tracking-widest">
                    NEURAL OBSERVABILITY COMMAND
                  </span>
                </h1>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Autonomous Hand Landmark &amp; Temporal Gating Telemetry Core · ONNX SIMD Runtime
              </p>
            </div>
          </div>

          {/* Center: Cyber Pill Tabs (Overview, Inference, Diagnostics, Telemetry) */}
          <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-md self-start lg:self-center">
            {['Overview', 'Inference', 'Diagnostics', 'Telemetry'].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(0,217,255,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl border border-white/10 bg-slate-950/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/40 transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              <FiMaximize2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/', 'demo')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-3.5 py-1.5 font-sans font-bold text-slate-950 shadow-[0_0_20px_rgba(0,217,255,0.35)] hover:brightness-110 transition-all cursor-pointer text-xs"
            >
              <FiCamera className="h-3.5 w-3.5" />
              <span>Launch Live Demo</span>
            </button>
          </div>
        </header>

        {/* ------------------------------------------------------------- */}
        {/* 2. Central 3D Earth Globe & Floating Technical Panels */}
        {/* (Directly matching Spatial Composition of Reference Image) */}
        {/* ------------------------------------------------------------- */}
        <section className="relative rounded-3xl border border-white/10 bg-slate-950/90 backdrop-blur-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden min-h-[560px] lg:min-h-[640px] flex items-center justify-center">
          {/* Subtle Cyber Radar Backdrop Pattern */}
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,217,255,0.04)_0%,transparent_65%)]"
            aria-hidden="true"
          />

          {/* Top-Left Floating Panel: Model Status & Sensor Telemetry HUD */}
          <div className="hidden lg:block absolute top-4 left-4 z-20">
            <ModelStatusHUD />
          </div>

          {/* Left-Side Vertical Technical Controls Bar */}
          <div className="hidden lg:block absolute top-64 left-4 z-20">
            <TacticalControlsBar />
          </div>

          {/* Right-Side Floating Panel: Model Architecture & Key Metrics */}
          <div className="hidden lg:block absolute top-4 right-4 z-20">
            <ModelPerformanceCard />
          </div>

          {/* Center Stage Dominant 3D Glowing Earth */}
          <div className="w-full flex items-center justify-center p-2 sm:p-4">
            <SpinningGlobe highlightIndia={true} showControls={true} />
          </div>

          {/* Mobile Fallback: Technical summary row on small screens where absolute panels are hidden */}
          <div className="lg:hidden w-full px-4 pb-4 flex flex-col gap-3 z-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ModelStatusHUD />
              <ModelPerformanceCard />
            </div>
            <TacticalControlsBar />
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* 3. Bottom Technical Dock (3 Cohesive Translucent Panels) */}
        {/* (Matching bottom row in Reference Image) */}
        {/* ------------------------------------------------------------- */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
          {/* Bottom-Left: Compact A–Z Recognition Performance List (4 cols) */}
          <div className="lg:col-span-4 h-full">
            <AlphabetPerformanceList
              selectedLetter={selectedLetter}
              onSelectLetter={setSelectedLetter}
            />
          </div>

          {/* Bottom-Center: A–Z Accuracy Bar Chart (4 cols) */}
          <div className="lg:col-span-4 h-full">
            <AlphabetBarChart
              classPerformance={ANALYTICS_DATA.classPerformance}
              datasetSamples={ANALYTICS_DATA.dataset?.samplesPerClass}
            />
          </div>

          {/* Bottom-Right: Rich Performance Line Graph (4 cols) */}
          <div className="lg:col-span-4 h-full">
            <PerformanceGraph inference={ANALYTICS_DATA.inference} />
          </div>
        </section>
      </div>
    </div>
  );
}
