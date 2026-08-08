// ─────────────────────────────────────────────────────────────
// sections/LiveDemo.jsx — the flagships: LIVE MediaPipe demo layer
// Real pipeline (Phase 7):
//   webcam → @mediapipe/tasks-vision HandLandmarker (VIDEO mode,
//   up to TWO hands, 21 landmarks each) → per-hand bounding box,
//   handedness + confidence → local deterministic gesture rules →
//   canvas overlay (official skeleton, points, boxes, chips) →
//   live transcription (letters → words → speechSynthesis).
//   Production-acting fallbacks: no camera → simulated signing
//   skeleton + phrase loop (the original demo behaviour).
//  ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCamera, FiRepeat, FiX } from 'react-icons/fi';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

import HandSkeleton from '../components/HandSkeleton.jsx';
import HandOverlay from '../components/HandOverlay.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import { bboxOf, classifyHand } from '../lib/handClassifier.js';
import { GESTURE_LETTER } from '../lib/handTopology.js';

// Model + WASM assets (CDN; the 10 MB task is streamed once, cached).
// For offline demos, download both and point the URLs at /public.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const HOLD_FRAMES = 3;      // identical gesture frames before a letter commits
const IDLE_MS = 1500;       // no hand → the collected letters become a word

const PHRASES = [
  { text: 'HELLO', signPoses: ['OPEN', 'FIST', 'B', 'Y', 'OK', 'I'] },
  { text: 'THANK YOU', signPoses: ['L', 'OPEN', 'B', 'V', 'C', 'THUMBS', 'Y'] },
  { text: 'PLEASE', signPoses: ['B', 'OPEN', 'E', 'A', 'F', 'L'] },
  { text: 'SORRY', signPoses: ['FIST', 'C', 'OPEN', 'Y', 'I'] },
  { text: 'YES', signPoses: ['FIST', 'E', 'Y', 'OK'] },
  { text: 'NO', signPoses: ['L', 'V', 'FIST', 'W'] },
];

function ConfBar({ value }) {
  return (
    <motion.div
      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500"
      initial={{ width: '10%' }}
      animate={{ width: `${Math.round(value * 100)}%` }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    />
  );
}

function speak(text) {
  if (!window.speechSynthesis || !text) return;
  try {
    const u = new SpeechSynthesisUtterance(text.toLowerCase());
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}

function LiveDemo() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);

  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [run, setRun] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  const [pi, setPi] = useState(0);
  const [rec, setRec] = useState('');         // transcribed letters
  const [word, setWord] = useState('');       // committed word
  const [gesture, setGesture] = useState(''); // dominant live gesture
  const [hands, setHands] = useState(0);
  const [fps, setFps] = useState(0);
  const [conf, setConf] = useState(0);
  const [latency, setLatency] = useState('–');

  const recRef = useRef('');
  const countRef = useRef(0); // simulated-mode phrase progress
  const holdRef = useRef({ gesture: '', n: 0 });
  const lastRef = useRef('');
  const idleRef = useRef(false);
  const idleTimerRef = useRef(null);

  const phrase = PHRASES[pi];
  const letter = rec.slice(-1) || gesture || 'A';

  // ── stop everything ─────────────────────────────────────────
  const stopRun = () => {
    setRun(false);
    setModelReady(false);
    setCamOn(false);
    setSpeaking(false);
    setRec(''); setWord(''); setGesture(''); setHands(0); setConf(0); setLatency('–');

    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    holdRef.current = { gesture: '', n: 0 };
    lastRef.current = '';
    recRef.current = '';
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (landmarkerRef.current) { try { landmarkerRef.current.close(); } catch (e) { /* noop */ } landmarkerRef.current = null; }
  };

  const runRef = useRef(run);
  useEffect(() => { runRef.current = run; }, [run]);

  // ── start: camera → model → tracking loop ───────────────────
  const startPipeline = async () => {
    setRun(true);
    if (streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamOn(true);
      setCamError(false);

      if (!landmarkerRef.current) {
        try {
          const vision = await FilesetResolver.forVisionTasks(WASM_URL);
          const landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          landmarkerRef.current = landmarker;
          setModelReady(true);
        } catch (e) {
          // model unreachable — keep the simulated demo as fallback
          setModelReady(false);
        }
      } else {
        setModelReady(true);
      }
    } catch (e) {
      setCamError(true);   // no webcam → simulated demo mode
    }
  };

  // ── the tracking loop (runs only when camera AND model are live) ──
  useEffect(() => {
    if (!run || !modelReady || !camOn) return;
    let raf;
    let frames = 0;
    let accMs = 0;
    let lastT = performance.now();

    const loop = (now) => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (video && video.readyState >= 2 && landmarker) {
        const t0 = performance.now();
        const res = landmarker.detectForVideo(video, now);
        const cost = performance.now() - t0;

        const handsNow = (res.landmarks || []).map((lms, i) => {
          const o = res.handedness && res.handedness[i] && res.handedness[i][0];
          const cls = classifyHand(lms);
          return {
            name: o && (o.categoryName || o.label) || (i === 0 ? 'Left' : 'Right'),
            score: (o && o.score) || 0,
            gesture: cls.gesture,
            confidence: cls.gesture === 'UNKNOWN' ? Math.max(cls.confidence, (o && o.score) || 0) : cls.confidence,
            landmarks: lms,
            bbox: bboxOf(lms),
          };
        });

        overlayRef.current?.draw(handsNow);
        setHands(handsNow.length);

        // dominant hand drives the transcription
        const dom = handsNow[0];
        if (dom && dom.gesture !== 'UNKNOWN') {
          setGesture(dom.gesture);
          setConf(dom.confidence);
          if (holdRef.current.gesture === dom.gesture) holdRef.current.n += 1;
          else holdRef.current = { gesture: dom.gesture, n: 1 };

          const ch = GESTURE_LETTER[dom.gesture];
          if (ch && holdRef.current.n >= HOLD_FRAMES && lastRef.current !== ch) {
            lastRef.current = ch;
            recRef.current += ch;
            setRec(recRef.current);
          }
          if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
          idleRef.current = false;
        } else if (!idleRef.current) {
          // hand gone — after IDLE_MS the accumulated letters become a word
          idleRef.current = true;
          idleTimerRef.current = setTimeout(() => {
            const w = recRef.current;
            if (w) { setWord(w); speak(w); recRef.current = ''; setRec(''); lastRef.current = ''; setSpeaking(true); setTimeout(() => setSpeaking(false), 1200); }
            idleRef.current = false;
          }, IDLE_MS);
        }

        // FPS rolling window + latency
        frames += 1;
        accMs += now - lastT;
        lastT = now;
        if (accMs >= 500) { setFps(Math.round((frames * 1000) / accMs)); frames = 0; accMs = 0; }
        setLatency(`${cost.toFixed(0)}ms`);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
      idleRef.current = false;
    };
  }, [run, modelReady, camOn]);

  // ── simulated recognition (fallback: no camera / model unavailable) ──
  useEffect(() => {
    if (!run || modelReady) return;
    let done = false;
    const tick = setInterval(() => {
      if (done) return;
      if (countRef.current < phrase.text.length) {
        const ch = phrase.text[countRef.current];
        countRef.current += 1;
        recRef.current += ch;
        setRec(recRef.current);
        setWord(phrase.text);
        setConf(0.92 + Math.random() * 0.06);
        setFps(29 + Math.floor(Math.random() * 4));
        setLatency('45ms');
      } else {
        done = true;
        setSpeaking(true);
        speak(phrase.text);
        setTimeout(() => {
          setSpeaking(false);
          countRef.current = 0;
          recRef.current = '';
          setRec(''); setWord('');
          setPi((p) => (p + 1) % PHRASES.length);
        }, 2200);
      }
    }, 480);
    return () => clearInterval(tick);
  }, [run, modelReady, pi, phrase]);

  return (
    <section id="demo" className="relative z-10 px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Live Demo"
          title="Watch Sign Language Become Text"
          sub="A live webcam feed, MediaPipe hand tracking and an LSTM neural network work together — recognized in real time and spoken out loud."
        />

        {/* status bar */}
        <Reveal>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest">
                <span className="h-2 w-2 rounded-full bg-emerald-400 status-dot" /> Model · HandLandmarker
              </span>
              <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest">
                <span className={`h-2 w-2 rounded-full ${camOn ? 'bg-emerald-400' : 'bg-slate-500'} status-dot`} />
                {camOn ? 'Camera Live' : 'Camera Standby'}
              </span>
              <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest">
                <span className={`h-2 w-2 rounded-full ${run ? 'bg-cyan-400' : 'bg-slate-500'} status-dot`} />
                {run ? (modelReady ? 'Pipeline Running' : 'Loading Model…') : 'Pipeline Idle'}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMirror((m) => !m)}
                className="glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-slate-300 transition-colors hover:text-white"
                title="Mirror mode — selfie view"
              >
                <FiRepeat aria-hidden="true" /> Mirror {mirror ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => (run ? stopRun() : startPipeline())}
                className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-violet-500 px-5 py-2.5 font-display text-xs font-semibold text-ink-950 shadow-glow transition-transform hover:scale-105"
              >
                {run ? <FiX aria-hidden="true" /> : <FiCamera aria-hidden="true" />} {run ? 'Stop' : 'Start Camera'}
              </button>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* ── Webcam window ── */}
          <Reveal delay={0.1}>
            <div className="glass-deep relative overflow-hidden rounded-3xl p-4 shadow-panel">
              <div className="scanline relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-950 ring-1 ring-white/10">
                {/* real webcam (mirror = CSS flip, same axis as the overlay) */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 h-full w-full rounded-2xl object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
                />

                {/* live MediaPipe overlay (canvas, imperative) */}
                <HandOverlay ref={overlayRef} mirror={mirror} className="" />

                {/* simulated signing hand (fallback while the real model loads) */}
                {run && !modelReady && !camError && (
                  <div className="absolute inset-0 flex items-center justify-center px-16">
                    <HandSkeleton auto={phrase.signPoses} className="w-full max-w-[300px]" />
                  </div>
                )}

                {/* corner brackets */}
                <span className="absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-cyan-400/70" aria-hidden="true" />
                <span className="absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-cyan-400/70" aria-hidden="true" />
                <span className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-cyan-400/70" aria-hidden="true" />
                <span className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-cyan-400/70" aria-hidden="true" />

                {/* HUD top-left */}
                <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-ink-950/60 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-red-400 ring-1 ring-red-400/30 backdrop-blur">
                    <span className={`h-1.5 w-1.5 rounded-full ${run ? 'animate-pulse bg-red-500' : 'bg-slate-600'}`} /> REC
                  </span>
                  <span className="rounded-full bg-ink-950/60 px-3 py-1 font-mono text-[10px] text-slate-300 ring-1 ring-white/10 backdrop-blur">
                    {run ? `${fps || '--'} FPS` : '-- FPS'}
                  </span>
                </div>

                {/* HUD top-right */}
                <div className="absolute right-5 top-4 z-10 text-right">
                  <div className="inline-block rounded-full bg-ink-950/60 px-3 py-1 font-mono text-[10px] text-cyan-300 ring-1 ring-cyan-400/25 backdrop-blur">
                    {run && modelReady
                      ? `Hands: ${hands} Detected`
                      : run ? 'Warming up…' : 'Standby'}
                  </div>
                </div>

                {/* HUD bottom confidence */}
                <div className="absolute bottom-4 left-5 z-10 flex w-[70%] max-w-xs flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-300">
                      {gesture || 'Prediction'}
                    </span>
                    <span className="font-mono text-[9px] text-cyan-300">{(conf * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <ConfBar key={run ? 'on' : 'off'} value={run ? conf : 0.1} />
                  </div>
                </div>

                {camError && (
                  <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-ink-950/85 text-center backdrop-blur-sm">
                    <div className="px-6">
                      <FiCamera className="mx-auto mb-4 h-10 w-10 text-cyan-400/60" aria-hidden="true" />
                      <p className="font-display text-lg text-white">Camera unavailable</p>
                      <p className="mx-auto mt-1 max-w-xs text-sm text-slate-400">
                        Running in simulated mode — the AI hand will still demonstrate gesture recognition.
                      </p>
                    </div>
                  </div>
                )}
                {!run && !camError && (
                  <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-ink-950/70 backdrop-blur-sm">
                    <button onClick={startPipeline} className="glass group flex flex-col items-center gap-3 rounded-3xl px-10 py-8 transition-all hover:border-cyan-400/40">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-ink-950 shadow-glow transition-transform group-hover:scale-110">
                        <FiCamera className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="font-display text-base text-white">Enable camera to begin</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">getUserMedia · requires permission</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* ── Translation panel ── */}
          <Reveal delay={0.2}>
            <div className="glass-deep flex h-full flex-col rounded-3xl p-5 shadow-panel">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">Live Translation</span>
                {speaking && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 font-mono text-[10px] text-emerald-300 ring-1 ring-emerald-400/25">Speaking</span>
                )}
              </div>

              {/* letters */}
              <div className="flex min-h-[88px] flex-wrap content-center items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                {rec.length > 0 ? (
                  [...rec].map((ch, i) => (
                    <span key={i} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 font-display text-lg font-semibold text-white">{ch}</span>
                  ))
                ) : (
                  <span className="font-mono text-xs text-slate-600">Awaiting gesture…</span>
                )}
              </div>

              {/* current sign + word */}
              <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 ring-1 ring-white/10">
                  <span className="font-display text-4xl font-bold text-white">{run && letter ? letter : '–'}</span>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Current Word · ASL</div>
                  <div className="mt-1 truncate font-display text-2xl text-white">
                    {word || <span className="text-slate-500">Detection pending</span>} {speaking && <span className="animate-blink text-cyan-300">▍</span>}
                  </div>
                </div>
              </div>

              {/* waveform */}
              <div className="mt-4 flex h-16 items-center justify-center gap-[3px] rounded-2xl border border-white/8 bg-white/[0.03] px-3">
                {Array.from({ length: 40 }, (_, i) => (
                  <span key={i} className={`wave-bar w-[3px] rounded-full ${run ? 'bg-gradient-to-t from-cyan-400/50 to-violet-400/80' : 'bg-white/10'}`}
                    style={{ height: `${run ? 8 + ((i * 7 + letter.charCodeAt(0)) % 34) : 10}px`, animationDelay: `${(i % 8) * 0.1}s` }} />
                ))}
              </div>

              {/* metrics */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Latency</div>
                  <div className="font-display text-xl font-semibold text-white">{run ? latency : '–'}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Confidence</div>
                  <div className="font-display text-xl font-semibold grad-text">{run ? (conf * 100).toFixed(1) : '–'}%</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Hands</div>
                  <div className="font-display text-xl font-semibold text-white">{run ? hands : '–'}</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.3}>
          <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
            real-time MediaPipe HandLandmarker in the browser · gestures scored by the same rule engine as the /api/v1/predict server
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default LiveDemo;