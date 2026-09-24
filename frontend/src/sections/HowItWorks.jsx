// HOW SIGNS BECOME MEANING — Compact AI Processing Pipeline.
// Scaled +10-15% with subtle, premium tracking & landmark extraction animations for Phase 2 & Phase 3.
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiVideo,
  FiEye,
  FiGrid,
  FiCpu,
  FiType,
  FiVolume2,
  FiArrowRight,
  FiArrowLeft,
  FiCheck,
  FiActivity,
} from 'react-icons/fi';
import HandSkeleton from '../components/HandSkeleton.jsx';

const LANDMARK_NAMES = [
  'P00: WRIST',
  'P01: THUMB CMC',
  'P02: THUMB MCP',
  'P03: THUMB IP',
  'P04: THUMB TIP',
  'P05: INDEX MCP',
  'P06: INDEX PIP',
  'P07: INDEX DIP',
  'P08: INDEX TIP',
  'P09: MIDDLE MCP',
  'P10: MIDDLE PIP',
  'P11: MIDDLE DIP',
  'P12: MIDDLE TIP',
  'P13: RING MCP',
  'P14: RING PIP',
  'P15: RING DIP',
  'P16: RING TIP',
  'P17: PINKY MCP',
  'P18: PINKY PIP',
  'P19: PINKY DIP',
  'P20: PINKY TIP',
];

const STEPS = [
  {
    n: '01',
    shortTitle: 'Capture',
    tag: 'Webcam input',
    headline: 'Real-Time Webcam Feed Capture',
    desc: 'The browser requests local video input via navigator.mediaDevices.getUserMedia. Frames are rate-limited to 30 FPS to ensure low-latency inference without blocking the rendering thread.',
    icon: FiVideo,
    color: 'from-sky-400 to-cyan-400',
    accent: '#38bdf8',
    meta: 'Client WebRTC Stream',
    metrics: [
      { label: 'Input', value: 'WebRTC' },
      { label: 'Framerate', value: '30 FPS' },
      { label: 'Latency', value: '< 8ms' },
    ],
  },
  {
    n: '02',
    shortTitle: 'Track',
    tag: 'Hand detection',
    headline: 'Neural Palm & Hand Localization',
    desc: 'Google MediaPipe HandLandmarker localizes hand presence in the video stream. It detects palm orientation and defines a localized bounding box around the active signing hand.',
    icon: FiEye,
    color: 'from-cyan-400 to-teal-400',
    accent: '#22d3ee',
    meta: 'Spatial Segmentation',
    metrics: [
      { label: 'Detector', value: 'Palm SSD' },
      { label: 'Confidence', value: '99.4%' },
      { label: 'Anchors', value: 'Single Hand' },
    ],
  },
  {
    n: '03',
    shortTitle: 'Landmarks',
    tag: '21-point hand landmarks',
    headline: '21-Point 3D Coordinate Extraction',
    desc: '21 three-dimensional (X, Y, Z) landmark points are extracted per frame across wrist, knuckles, and fingertips. Coordinates are normalized relative to wrist origin for scale invariance.',
    icon: FiGrid,
    color: 'from-teal-400 to-emerald-400',
    accent: '#34d399',
    meta: 'Kinematic Topology',
    metrics: [
      { label: 'Points', value: '21 × (X,Y,Z)' },
      { label: 'Bones', value: '21 Segments' },
      { label: 'Scale', value: 'Normalized' },
    ],
  },
  {
    n: '04',
    shortTitle: 'Recognize',
    tag: 'LSTM model',
    headline: 'Temporal Sequence Classification',
    desc: 'A rolling buffer of 12 landmark frames is fed to the server bidirectional LSTM model. It evaluates temporal finger trajectories to distinguish gestures across 27 sign classes.',
    icon: FiCpu,
    color: 'from-emerald-400 to-cyan-500',
    accent: '#10b981',
    meta: 'Bi-LSTM Temporal Voting',
    metrics: [
      { label: 'Sequence', value: '12 Frames' },
      { label: 'Classes', value: '27 Signs' },
      { label: 'Inference', value: '11.2ms' },
    ],
  },
  {
    n: '05',
    shortTitle: 'Interpret',
    tag: 'Sign → meaning',
    headline: 'Hysteresis Debouncing & Token Assembly',
    desc: 'High-confidence predictions must remain stable across consecutive frames before commitment. A neutral hand pose re-arms repetition, and a natural pause commits word tokens.',
    icon: FiType,
    color: 'from-cyan-400 to-violet-500',
    accent: '#8b5cf6',
    meta: 'Debounce State Machine',
    metrics: [
      { label: 'Threshold', value: '> 0.85 Conf' },
      { label: 'Debounce', value: '3 Frames' },
      { label: 'Output', value: 'Word Tokens' },
    ],
  },
  {
    n: '06',
    shortTitle: 'Speak',
    tag: 'Text + speech output',
    headline: 'Acoustic Synthesis & Transcription',
    desc: 'Committed words trigger instant audio synthesis through the browser Web Speech API. The UI renders synchronized wrapping word chips with zero character overlap.',
    icon: FiVolume2,
    color: 'from-violet-400 to-rose-400',
    accent: '#f43f5e',
    meta: 'Audio Synthesis Engine',
    metrics: [
      { label: 'Engine', value: 'Web Speech API' },
      { label: 'Voice', value: 'Natural Speech' },
      { label: 'Latency', value: '< 12ms' },
    ],
  },
];

// Phase 2: Animated Hand Detection HUD with subtle tracking, soft pulse, and landmark activation
function Phase2Visual() {
  const [phase, setPhase] = useState(0); // 0: scanning, 1: detecting, 2: locked, 3: reset
  const [conf, setConf] = useState(68);

  useEffect(() => {
    const CYCLE = 4200;
    const start = Date.now();

    const id = setInterval(() => {
      const elapsed = (Date.now() - start) % CYCLE;
      if (elapsed < 1400) {
        setPhase(0);
        setConf(Math.round(68 + (elapsed / 1400) * 26));
      } else if (elapsed < 2400) {
        setPhase(1);
        setConf(99.4);
      } else if (elapsed < 3700) {
        setPhase(2);
        setConf(99.4);
      } else {
        setPhase(3);
        setConf(99.4);
      }
    }, 60);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-2.5 font-mono select-none overflow-hidden">
      {/* Dynamic Hand Detection Bounding Box */}
      <div
        className={`absolute inset-5 sm:inset-6 rounded-2xl border transition-all duration-500 flex items-center justify-center overflow-hidden ${
          phase === 0
            ? 'border-dashed border-teal-400/35 bg-teal-400/[0.02]'
            : phase === 1
            ? 'border-solid border-teal-400/70 bg-teal-400/[0.06] shadow-[0_0_20px_rgba(45,212,191,0.25)]'
            : phase === 2
            ? 'border-solid border-teal-400/50 bg-teal-400/[0.04]'
            : 'border-dashed border-teal-400/20 bg-transparent'
        }`}
      >
        {/* Soft vertical scan line during scanning stage */}
        {phase === 0 && (
          <div className="pointer-events-none absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-teal-400/25 to-transparent animate-scan" />
        )}

        {/* Pulse ripple wave on detection lock */}
        {phase === 1 && (
          <div className="pointer-events-none absolute h-24 w-24 rounded-full border border-teal-400/60 animate-ping" />
        )}

        {/* Corner brackets with responsive tracking feel */}
        <div
          className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 transition-all duration-300 ${
            phase > 0 ? 'border-teal-300 scale-105' : 'border-teal-400/60'
          }`}
        />
        <div
          className={`absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 transition-all duration-300 ${
            phase > 0 ? 'border-teal-300 scale-105' : 'border-teal-400/60'
          }`}
        />
        <div
          className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 transition-all duration-300 ${
            phase > 0 ? 'border-teal-300 scale-105' : 'border-teal-400/60'
          }`}
        />
        <div
          className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 transition-all duration-300 ${
            phase > 0 ? 'border-teal-300 scale-105' : 'border-teal-400/60'
          }`}
        />

        {/* Exact existing HandSkeleton component */}
        <style>{`
          .p2-skeleton line {
            transition: opacity 0.5s ease;
            opacity: ${phase === 0 ? 0 : phase === 1 ? 0.35 : phase === 2 ? 0.55 : 0.1} !important;
          }
          .p2-skeleton circle {
            transition: opacity 0.5s ease, transform 0.3s ease;
            opacity: ${phase === 0 ? 0.2 : phase === 1 ? 0.95 : phase === 2 ? 0.8 : 0.15} !important;
          }
        `}</style>
        <HandSkeleton
          pose="OPEN"
          className={`h-full max-h-[195px] sm:max-h-[220px] w-auto mx-auto p2-skeleton pointer-events-none transition-all duration-500 ${
            phase === 0
              ? 'opacity-35 filter brightness-75'
              : phase === 1
              ? 'opacity-90 filter brightness-110 drop-shadow-[0_0_12px_rgba(45,212,191,0.5)]'
              : phase === 2
              ? 'opacity-70'
              : 'opacity-25'
          }`}
          glow={false}
        />
      </div>

      {/* Top HUD */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-3.5 pt-1 z-10">
        <span className="flex items-center gap-1.5 text-teal-300 font-medium">
          <span
            className={`h-2 w-2 rounded-full ${
              phase === 0 ? 'bg-amber-400 animate-pulse' : 'bg-teal-400 status-dot'
            }`}
          />
          {phase === 0 ? 'SCANNING PALM ROI...' : phase === 1 ? 'TARGET LOCKED: HAND_0' : 'PALM DETECTED: HAND_0'}
        </span>
        <span
          className={`rounded px-2.5 py-0.5 text-xs font-semibold border transition-all ${
            phase === 0
              ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
              : 'bg-teal-400/15 text-teal-300 border-teal-400/40 shadow-[0_0_8px_rgba(45,212,191,0.3)]'
          }`}
        >
          CONFIDENCE: {conf}%
        </span>
      </div>

      {/* Center Target Tracker Reticle */}
      <div className="relative flex flex-col items-center justify-center my-auto z-10 pointer-events-none">
        <div className="relative grid h-24 w-24 sm:h-28 sm:w-28 place-items-center">
          <div
            className={`absolute inset-0 rounded-full border transition-all duration-500 ${
              phase === 0
                ? 'border-teal-400/30 animate-spin-slow scale-110'
                : phase === 1
                ? 'border-teal-300/80 scale-95 shadow-[0_0_12px_#2dd4bf]'
                : 'border-teal-400/40 scale-100'
            }`}
          />
          <div
            className={`h-4.5 w-4.5 rounded-full border-2 transition-all duration-300 ${
              phase > 0
                ? 'border-teal-200 bg-teal-400/60 shadow-[0_0_14px_#2dd4bf] scale-110'
                : 'border-teal-400/60 bg-teal-400/20'
            }`}
          />
          <div
            className={`absolute text-[10px] -bottom-4 px-2 py-0.5 rounded border font-semibold transition-all ${
              phase > 0
                ? 'text-teal-300 bg-slate-900/95 border-teal-400/50 shadow-[0_0_8px_rgba(45,212,191,0.2)]'
                : 'text-slate-400 bg-slate-900/80 border-slate-700'
            }`}
          >
            {phase === 0 ? 'SEARCHING...' : 'X: 0.482 · Y: 0.614'}
          </div>
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 px-3.5 pb-1 z-10">
        <span>MODEL: MEDIAPIPE PALM</span>
        <span className="hidden sm:inline">ANCHOR: 7 KEYPOINTS</span>
        <span className={`font-medium transition-colors ${phase > 0 ? 'text-teal-400 font-semibold' : 'text-slate-500'}`}>
          {phase === 0 ? 'STATUS: ACQUIRING' : 'TRACKING: STABLE'}
        </span>
      </div>
    </div>
  );
}

// Phase 3: Animated Landmark Extraction HUD with progressive points, connecting bones, and complete topology
function Phase3Visual() {
  const [pointCount, setPointCount] = useState(0);
  const [stage, setStage] = useState('points'); // 'points' | 'bones' | 'complete' | 'reset'

  useEffect(() => {
    const CYCLE = 4800;
    const start = Date.now();

    const id = setInterval(() => {
      const elapsed = (Date.now() - start) % CYCLE;
      if (elapsed < 1700) {
        // Points appearing progressively (0 to 21 points over 1700ms)
        const pts = Math.min(21, Math.floor((elapsed / 1700) * 22));
        setPointCount(pts);
        setStage('points');
      } else if (elapsed < 2800) {
        // Connecting bones drawing in
        setPointCount(21);
        setStage('bones');
      } else if (elapsed < 4200) {
        // Complete 21-point skeleton settled
        setPointCount(21);
        setStage('complete');
      } else {
        // Smooth reset before next loop
        setStage('reset');
      }
    }, 50);

    return () => clearInterval(id);
  }, []);

  const activePointLabel =
    pointCount === 0
      ? 'INITIALIZING...'
      : pointCount <= 21
      ? LANDMARK_NAMES[pointCount - 1] || '21 CANONICAL LANDMARKS'
      : '21 CANONICAL LANDMARKS';

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-2.5 font-mono select-none overflow-hidden">
      {/* Top HUD */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-3.5 pt-1 z-10">
        <span className="text-emerald-300 flex items-center gap-1.5 font-medium">
          <span
            className={`h-2 w-2 rounded-full ${
              stage === 'complete' ? 'bg-emerald-400 status-dot' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          {stage === 'points'
            ? `EXTRACTING 3D LANDMARKS (${pointCount}/21)`
            : stage === 'bones'
            ? 'CONNECTING BONE TOPOLOGY (21 SEGMENTS)'
            : '21 3D LANDMARKS EXTRACTED'}
        </span>
        <span className="text-emerald-400/90 text-xs font-semibold">
          {stage === 'points' ? `PTS: ${pointCount}/21` : 'TOPOLOGY: 21 BONES'}
        </span>
      </div>

      {/* Center Hand Visualization using EXACT existing HandSkeleton component */}
      <div className="relative flex-1 flex items-center justify-center my-1 z-10 w-full overflow-hidden">
        <style>{`
          .p3-skeleton line {
            transition: stroke-dashoffset 0.85s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
            stroke-dasharray: 40;
            stroke-dashoffset: ${stage === 'points' ? 40 : 0};
            opacity: ${stage === 'points' ? 0 : stage === 'reset' ? 0.2 : 0.85} !important;
          }
          .p3-skeleton circle {
            transition: opacity 0.25s ease;
          }
          .p3-skeleton circle:nth-child(n + ${pointCount + 1}) {
            opacity: 0 !important;
          }
          .p3-skeleton ellipse {
            transition: opacity 0.6s ease;
            opacity: ${stage === 'complete' ? 1 : stage === 'bones' ? 0.5 : 0} !important;
          }
        `}</style>
        <HandSkeleton
          pose="OPEN"
          className={`h-full max-h-[210px] sm:max-h-[235px] md:max-h-[250px] w-auto mx-auto p3-skeleton transition-opacity duration-500 ${
            stage === 'reset' ? 'opacity-20' : 'opacity-100'
          }`}
          glow={true}
        />
      </div>

      {/* Bottom HUD */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 px-3.5 pb-1 z-10">
        <span className="text-cyan-400/90 font-medium">{activePointLabel}</span>
        <span className="text-emerald-400 font-semibold hidden sm:inline">
          {stage === 'complete'
            ? 'VECTOR TOPOLOGY LOCKED'
            : stage === 'bones'
            ? 'DRAWING KINEMATICS'
            : 'SAMPLING COORD VECTORS'}
        </span>
        <span>WRIST-NORMALIZED</span>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const containerRef = useRef(null);
  const isClickScrollingRef = useRef(false);
  const clickTimeoutRef = useRef(null);

  // Synchronize active step with window scroll as user traverses the section
  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrollingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRef.current.offsetHeight;
      const viewportHeight = window.innerHeight;
      const scrollableDistance = containerHeight - viewportHeight;

      if (scrollableDistance <= 0) return;

      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
      const stepIndex = Math.min(5, Math.floor(progress * 6));
      setActiveStep(stepIndex);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const handleStepClick = (idx) => {
    setActiveStep(idx);
    isClickScrollingRef.current = true;
    clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 750);

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentScroll = window.scrollY || window.pageYOffset;
    const containerTop = currentScroll + rect.top;
    const containerHeight = containerRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollableDistance = containerHeight - viewportHeight;

    if (scrollableDistance > 0) {
      const targetY = containerTop + (idx / 5) * scrollableDistance;
      if (window.__lenis) {
        window.__lenis.scrollTo(targetY, { duration: 0.6 });
      } else {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    }
  };

  const handleSpeakSample = () => {
    setIsSpeaking(true);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Hello');
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsSpeaking(false), 1200);
    }
  };

  const currentStep = STEPS[activeStep];

  // Visual simulation HUD for each pipeline step
  const renderStepVisual = (stepIdx) => {
    switch (stepIdx) {
      case 0:
        return (
          <div className="relative w-full h-full flex flex-col justify-between p-2.5 font-mono select-none">
            {/* Viewfinder corner brackets */}
            <div className="absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 border-cyan-400" />

            {/* Sweeping scanline beam */}
            <div className="pointer-events-none absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-scan" />

            {/* Top HUD */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-3.5 pt-1">
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                ● REC [LIVE_FEED]
              </span>
              <span className="text-cyan-400 font-medium">1280×720 @ 30 FPS</span>
            </div>

            {/* Center viewfinder reticle */}
            <div className="relative flex flex-col items-center justify-center my-auto">
              <div className="relative grid h-28 w-28 sm:h-32 sm:w-32 place-items-center rounded-full border border-dashed border-cyan-400/40">
                <div className="absolute h-16 w-16 sm:h-18 sm:w-18 rounded-full border border-cyan-400/60 animate-pulse" />
                <div className="absolute h-full w-[1px] bg-cyan-400/20" />
                <div className="absolute h-[1px] w-full bg-cyan-400/20" />
                <FiVideo className="h-8 w-8 sm:h-9 sm:w-9 text-cyan-300" />
              </div>
              <div className="mt-2.5 text-xs text-cyan-300/90 bg-cyan-950/70 px-3 py-0.5 rounded-full border border-cyan-500/30">
                CAMERA STREAM CONNECTED · BUFFER: 33ms
              </div>
            </div>

            {/* Bottom HUD */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-3.5 pb-1">
              <span>EXPOSURE: AUTO-LOCKED</span>
              <span className="hidden sm:inline">ENCODING: RAW YUV/RGB</span>
              <span>ZERO-COPY BUFFER</span>
            </div>
          </div>
        );

      case 1:
        return <Phase2Visual />;

      case 2:
        return <Phase3Visual />;

      case 3:
        return (
          <div className="relative w-full h-full flex flex-col justify-between p-2.5 font-mono select-none">
            {/* Top HUD */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-3.5 pt-1">
              <span className="text-cyan-300 font-medium">12-FRAME SEQUENCE BUFFER</span>
              <span className="text-slate-400">BI-LSTM CLASSIFIER</span>
            </div>

            {/* Sequence Frame Slots */}
            <div className="flex items-center justify-between gap-1 sm:gap-1.5 px-2 my-1.5">
              {[...Array(12)].map((_, fi) => (
                <div
                  key={fi}
                  className={`flex-1 py-1 sm:py-1.5 rounded text-center text-[9px] sm:text-[10px] border transition-all ${
                    fi === 11
                      ? 'bg-cyan-400 text-slate-950 font-bold border-cyan-300 shadow-[0_0_10px_#22d3ee]'
                      : fi >= 8
                      ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40'
                      : 'bg-white/5 text-slate-500 border-white/10'
                  }`}
                >
                  {String(fi + 1).padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* Classification probability distribution */}
            <div className="my-auto space-y-2 px-3 sm:px-4">
              {[
                { char: 'H', conf: 97.4, active: true },
                { char: 'W', conf: 1.8, active: false },
                { char: 'B', conf: 0.5, active: false },
                { char: 'A', conf: 0.3, active: false },
              ].map((item) => (
                <div key={item.char} className="flex items-center gap-2.5 text-xs sm:text-sm">
                  <span className={`w-4 font-bold text-center ${item.active ? 'text-cyan-300' : 'text-slate-500'}`}>
                    {item.char}
                  </span>
                  <div className="flex-1 h-3.5 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.active
                          ? 'bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 shadow-[0_0_10px_#22d3ee]'
                          : 'bg-slate-700/60'
                      }`}
                      style={{ width: `${item.conf}%` }}
                    />
                  </div>
                  <span
                    className={`w-14 text-right font-mono text-xs ${
                      item.active ? 'text-cyan-300 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {item.conf}%
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom HUD */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-3.5 pb-1">
              <span>INFERENCE: 11.2ms</span>
              <span className="text-cyan-400 font-semibold">PREDICTION: 'H'</span>
              <span>27 CLASSES</span>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="relative w-full h-full flex flex-col justify-between p-2.5 font-mono select-none">
            {/* Top HUD */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-3.5 pt-1">
              <span className="text-violet-300 font-medium">HYSTERESIS DEBOUNCING &amp; ASSEMBLY</span>
              <span className="text-emerald-400 font-semibold">GATE: LOCKED</span>
            </div>

            {/* Center state machine & token assembly */}
            <div className="my-auto flex flex-col items-center justify-center gap-3.5 px-3">
              {/* Stream letter chips */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                {['H', 'E', 'L', 'L', 'O'].map((ch, idx) => (
                  <div key={idx} className="flex items-center gap-2 sm:gap-2.5">
                    <div className="grid h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 place-items-center rounded-xl bg-slate-900 border border-violet-400/40 text-violet-200 font-bold text-sm sm:text-base shadow-[0_0_10px_rgba(139,92,246,0.35)]">
                      {ch}
                    </div>
                    {idx < 4 && <span className="text-slate-600 text-xs sm:text-sm">→</span>}
                  </div>
                ))}
              </div>

              {/* Committed Word Token */}
              <div className="flex items-center gap-3 rounded-2xl bg-violet-950/60 border border-violet-400/60 px-5 py-2.5 shadow-[0_0_24px_rgba(139,92,246,0.35)]">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                  <FiCheck className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">Word Token Committed</div>
                  <div className="text-lg sm:text-xl font-display font-bold text-white tracking-wide">"HELLO"</div>
                </div>
                <span className="ml-2 rounded bg-violet-400/20 px-2.5 py-0.5 text-[10px] text-violet-300 font-mono hidden sm:inline">
                  PAUSE: 800ms
                </span>
              </div>
            </div>

            {/* Bottom HUD */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-3.5 pb-1">
              <span>NEUTRAL POSE: ARMED</span>
              <span className="text-violet-400">HYSTERESIS: 3 FRAMES</span>
              <span>TOKEN: COMMITTED</span>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="relative w-full h-full flex flex-col justify-between p-2.5 font-mono select-none">
            {/* Top HUD */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-3.5 pt-1">
              <span className="text-rose-300 font-medium">WEB SPEECH AUDIO SYNTHESIS</span>
              <span className="text-cyan-400 font-semibold">TTS ENGINE: READY</span>
            </div>

            {/* Center Audio Equalizer & Spoken Output */}
            <div className="my-auto flex flex-col items-center justify-center gap-4 px-3">
              {/* Animated Frequency Bars */}
              <div className="flex items-end justify-center gap-1.5 sm:gap-2 h-14 sm:h-16 w-full max-w-[320px]">
                {[35, 60, 45, 90, 75, 40, 85, 100, 70, 50, 95, 60, 40, 80, 55, 30].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-gradient-to-t from-violet-500 to-rose-400 transition-all duration-300"
                    style={{
                      height: isSpeaking ? `${Math.min(100, h * 1.25)}%` : `${h * 0.7}%`,
                      opacity: isSpeaking ? 1 : 0.75,
                    }}
                  />
                ))}
              </div>

              {/* Interactive Speech Trigger */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3.5">
                <button
                  type="button"
                  onClick={handleSpeakSample}
                  className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-violet-500/20 hover:from-rose-500/30 hover:to-violet-500/30 border border-rose-400/40 px-5 py-2.5 text-white font-sans text-xs sm:text-sm font-semibold transition-all duration-300 shadow-[0_0_18px_rgba(244,63,94,0.3)] hover:scale-105 cursor-pointer"
                >
                  <FiVolume2 className={`h-4.5 w-4.5 text-rose-300 ${isSpeaking ? 'animate-bounce' : ''}`} />
                  <span>Speak: "HELLO"</span>
                </button>
                <span className="text-xs text-slate-400">Click to test browser TTS</span>
              </div>
            </div>

            {/* Bottom HUD */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-3.5 pb-1">
              <span>SAMPLING: 48kHz</span>
              <span className="text-rose-400">LATENCY: &lt; 12ms</span>
              <span>SYNTHESIS: EN-US</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section
      id="how"
      ref={containerRef}
      className="relative z-10 px-4 py-12 md:px-8 md:py-16"
      style={{ minHeight: '220vh' }}
    >
      {/* Sticky container pins comfortably as user scrolls through the 220vh section */}
      <div className="sticky top-14 md:top-20 mx-auto max-w-6xl">
        {/* Compact Section Header (scaled +12%) */}
        <div className="relative z-10 mb-4 sm:mb-6 flex flex-col items-center gap-2 text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[11px] sm:text-xs uppercase tracking-[0.22em] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 status-dot" />
            The Pipeline
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-[2.6rem] lg:text-[2.85rem] font-semibold tracking-tight text-white leading-tight">
            HOW SIGNS BECOME MEANING
          </h2>
          <p className="max-w-xl text-xs sm:text-sm md:text-base text-slate-400">
            From optical camera photons to synthetic voice in six continuous neural stages.
          </p>
        </div>

        {/* Single Horizontal Connected Pipeline Bar (scaled +10-15%) */}
        <div className="relative mb-4 sm:mb-5 rounded-2xl border border-white/10 bg-slate-950/75 p-2 sm:p-3 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === activeStep;
              const isPast = idx < activeStep;

              return (
                <div key={step.n} className="flex-1 flex items-center min-w-0">
                  <button
                    type="button"
                    onClick={() => handleStepClick(idx)}
                    className={`group relative flex-1 flex flex-col sm:flex-row items-center gap-1 sm:gap-2.5 px-2 py-2 sm:px-3 sm:py-2.5 md:py-3 rounded-xl transition-all duration-300 cursor-pointer text-center sm:text-left min-w-0 ${
                      isActive
                        ? 'bg-cyan-950/80 border border-cyan-400/80 shadow-[0_0_22px_rgba(34,211,238,0.38)]'
                        : isPast
                        ? 'bg-slate-900/60 border border-cyan-500/30 hover:border-cyan-400/50'
                        : 'bg-slate-950/40 border border-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Step Icon Badge */}
                    <div
                      className={`grid h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0 place-items-center rounded-lg font-mono text-xs sm:text-sm transition-transform duration-300 ${
                        isActive
                          ? 'bg-cyan-400 text-slate-950 shadow-[0_0_14px_#22d3ee] scale-105'
                          : isPast
                          ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40'
                          : 'bg-white/5 text-slate-400 border border-white/10 group-hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" aria-hidden="true" />
                    </div>

                    {/* Step Labels */}
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <div className="flex items-center justify-center sm:justify-start gap-1">
                        <span
                          className={`font-mono text-[10px] sm:text-xs font-semibold tracking-wider ${
                            isActive ? 'text-cyan-300' : isPast ? 'text-cyan-400/80' : 'text-slate-500'
                          }`}
                        >
                          {step.n}
                        </span>
                        <span
                          className={`text-xs sm:text-sm md:text-[15px] font-semibold truncate ${
                            isActive ? 'text-white' : isPast ? 'text-slate-200' : 'text-slate-400'
                          }`}
                        >
                          {step.shortTitle}
                        </span>
                      </div>
                      <span
                        className={`hidden lg:block text-[11px] truncate max-w-[130px] ${
                          isActive ? 'text-cyan-300/90 font-medium' : isPast ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        {step.tag}
                      </span>
                    </div>

                    {/* Active Cyan Glow Dot */}
                    {isActive && (
                      <span className="hidden sm:block absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                    )}
                  </button>

                  {/* Connected Glowing Line between steps */}
                  {idx < STEPS.length - 1 && (
                    <div className="hidden xs:flex flex-shrink-0 items-center justify-center w-2 sm:w-3 md:w-5 mx-0.5">
                      <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full transition-all duration-500 ${
                            idx < activeStep
                              ? 'w-full bg-gradient-to-r from-cyan-400 to-teal-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                              : idx === activeStep
                              ? 'w-1/2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                              : 'w-0'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ONE Central Visualization Area (scaled +10-15%) */}
        <div className="glass-card relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/12 bg-slate-950/90 p-5 sm:p-6 md:p-7 backdrop-blur-2xl shadow-[0_24px_55px_rgba(0,0,0,0.85)]">
          {/* Ambient Glow Blob */}
          <div
            className={`pointer-events-none absolute -right-20 -top-20 -z-0 h-64 w-64 rounded-full bg-gradient-to-br ${currentStep.color} opacity-20 blur-3xl transition-all duration-700`}
            aria-hidden="true"
          />

          {/* Top Bar of Central Visualization */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4 font-mono text-xs">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-cyan-400/10 px-3 py-1 text-cyan-300 border border-cyan-400/25 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 status-dot" />
                PHASE {currentStep.n} / 06
              </span>
              <span className="text-slate-400 uppercase tracking-widest hidden sm:inline text-[11px]">
                {currentStep.meta}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <span className="flex items-center gap-1 text-cyan-400 font-medium">
                <FiActivity className="h-3.5 w-3.5 animate-pulse" />
                PIPELINE ACTIVE
              </span>
              <span className="text-slate-600 hidden xs:inline">|</span>
              <span className="text-slate-400 hidden xs:inline">LATENCY &lt; 16ms</span>
            </div>
          </div>

          {/* Main Content Grid: Left Technical Details, Right Visual HUD */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-center">
            {/* Left Column: Technical Description & Specs */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="inline-block rounded-full bg-white/5 px-3 py-1 font-mono text-xs uppercase tracking-wider text-slate-300 border border-white/10 mb-2.5">
                  {currentStep.tag}
                </div>
                <h3 className="font-display text-xl sm:text-2xl md:text-[1.65rem] font-semibold text-white tracking-tight leading-tight">
                  {currentStep.headline}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm md:text-[15px] leading-relaxed text-slate-300">
                  {currentStep.desc}
                </p>
              </div>

              {/* Metrics Pills */}
              <div className="mt-4 sm:mt-5 grid grid-cols-3 gap-2 sm:gap-2.5">
                {currentStep.metrics.map((m) => (
                  <div key={m.label} className="rounded-xl border border-white/8 bg-slate-900/60 p-2 sm:p-2.5 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">{m.label}</div>
                    <div className="mt-1 font-mono text-xs sm:text-sm font-semibold text-cyan-300">{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Step Navigation Controls */}
              <div className="mt-4 sm:mt-5 pt-3.5 border-t border-white/8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleStepClick(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-mono transition-all ${
                    activeStep === 0
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-300 hover:text-cyan-300 hover:bg-white/5 cursor-pointer'
                  }`}
                >
                  <FiArrowLeft className="h-3.5 w-3.5" />
                  <span>PREV</span>
                </button>

                {/* 6 mini step indicator dots */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleStepClick(i)}
                      className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        i === activeStep
                          ? 'w-6 bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
                          : i < activeStep
                          ? 'w-2 bg-cyan-400/50'
                          : 'w-2 bg-white/20'
                      }`}
                      aria-label={`Jump to step ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleStepClick(Math.min(5, activeStep + 1))}
                  disabled={activeStep === 5}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-mono transition-all ${
                    activeStep === 5
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-300 hover:text-cyan-300 hover:bg-white/5 cursor-pointer'
                  }`}
                >
                  <span>NEXT</span>
                  <FiArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Right Column: Dynamic Visual HUD Console */}
            <div className="lg:col-span-7">
              <div className="relative h-[255px] sm:h-[280px] md:h-[305px] w-full rounded-2xl border border-white/10 bg-slate-950/85 p-3.5 sm:p-4 overflow-hidden flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="w-full h-full flex flex-col justify-between"
                  >
                    {renderStepVisual(activeStep)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
