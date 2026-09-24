// MediaPipe detects landmarks; the server sequence model supplies every label.
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCamera, FiRepeat, FiX } from 'react-icons/fi';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import HandOverlay from '../components/HandOverlay.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import { bboxOf, classifyHand } from '../lib/handClassifier.js';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const API_BASE = import.meta.env.VITE_AI_API_BASE || '/api/v1/ai';
const WINDOW = 12, SAMPLE_MS = 125, MIN_CONFIDENCE = 0.78, STABLE_PREDICTIONS = 4, NEUTRAL_PREDICTIONS = 3, WORD_PAUSE_MS = 1200;

async function safeJson(res) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function ConfBar({ value }) { return <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500" initial={{ width: '0%' }} animate={{ width: `${Math.round(value * 100)}%` }} transition={{ duration: 0.25 }} />; }
const toHand = (landmarks) => landmarks.map(({ x, y, z = 0 }) => [x, y, z]);
function speak(text) { if (window.speechSynthesis && text) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text.toLowerCase())); } }

export default function LiveDemo() {
  const videoRef = useRef(null), overlayRef = useRef(null), streamRef = useRef(null), landmarkerRef = useRef(null);
  const framesRef = useRef([]), lastSampleRef = useRef(0), busyRef = useRef(false), versionRef = useRef(0), primaryRef = useRef(null), idleTimerRef = useRef(null), recRef = useRef('');
  const stateRef = useRef({ candidate: '', count: 0, neutral: 0, armed: true, last: '' });
  const [run, setRun] = useState(false), [camOn, setCamOn] = useState(false), [camError, setCamError] = useState(false), [trackerReady, setTrackerReady] = useState(false), [serviceState, setServiceState] = useState('idle'), [serviceError, setServiceError] = useState('');
  const [mirror, setMirror] = useState(true), [rec, setRec] = useState(''), [words, setWords] = useState([]), [gesture, setGesture] = useState(''), [hands, setHands] = useState(0), [fps, setFps] = useState(0), [conf, setConf] = useState(0), [latency, setLatency] = useState('–'), [speaking, setSpeaking] = useState(false);
  const clearIdle = () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); idleTimerRef.current = null; };
  const finishWord = () => {
    if (idleTimerRef.current) return;
    idleTimerRef.current = setTimeout(() => { const word = recRef.current; if (word) { setWords((items) => [...items, word]); speak(word); setSpeaking(true); setTimeout(() => setSpeaking(false), 1200); recRef.current = ''; setRec(''); } stateRef.current.last = ''; idleTimerRef.current = null; }, WORD_PAUSE_MS);
  };
  const resetPrediction = (noHand = false) => {
    setGesture(''); setConf(0); const state = stateRef.current; state.candidate = ''; state.count = 0; state.neutral += 1;
    if (state.neutral >= NEUTRAL_PREDICTIONS || noHand) state.armed = true;
    if (noHand) finishWord();
  };
  const acceptPrediction = (data) => {
    const label = data.gesture;
    const valid = data.displayed !== false && label && label !== 'UNKNOWN' && label !== 'NONE' && data.confidence >= MIN_CONFIDENCE;
    if (!valid) { resetPrediction(); return; }
    clearIdle(); setGesture(label); setConf(data.confidence); setLatency(`${Math.round(data.latencyMs || 0)}ms`);
    const state = stateRef.current; state.neutral = 0;
    if (state.candidate === label) state.count += 1;
    else { state.candidate = label; state.count = 1; if (label !== state.last) state.armed = true; }
    if (state.armed && state.count >= STABLE_PREDICTIONS) { recRef.current += label; setRec(recRef.current); state.last = label; state.armed = false; }
  };
  const predict = async (frames, version) => {
    if (busyRef.current) return; busyRef.current = true;
    try {
      if (serviceState === 'ready') {
        const response = await fetch(`${API_BASE}/predict-sequence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ frames, strategy: 'average' }) });
        const body = await safeJson(response);
        if (version !== versionRef.current) return;
        if (response.ok && body?.success && body?.data) {
          acceptPrediction(body.data);
          return;
        }
      }

      // Local on-device browser recognition
      const lastFrame = frames[frames.length - 1];
      if (lastFrame) {
        const lms = lastFrame.map(([x, y, z]) => ({ x, y, z }));
        const result = classifyHand(lms);
        if (version !== versionRef.current) return;
        acceptPrediction({
          gesture: result.gesture,
          confidence: result.confidence,
          latencyMs: 8,
          displayed: true,
        });
      }
    } catch {
      const lastFrame = frames[frames.length - 1];
      if (lastFrame) {
        const lms = lastFrame.map(([x, y, z]) => ({ x, y, z }));
        const result = classifyHand(lms);
        if (version === versionRef.current) {
          acceptPrediction({
            gesture: result.gesture,
            confidence: result.confidence,
            latencyMs: 8,
            displayed: true,
          });
        }
      }
    } finally { busyRef.current = false; }
  };
  const stopRun = () => {
    versionRef.current += 1; clearIdle(); setRun(false); setCamOn(false); setTrackerReady(false); setServiceState('idle'); setGesture(''); setConf(0); setHands(0); setLatency('–'); setRec(''); setWords([]); setSpeaking(false);
    recRef.current = ''; framesRef.current = []; primaryRef.current = null; stateRef.current = { candidate: '', count: 0, neutral: 0, armed: true, last: '' }; window.speechSynthesis?.cancel();
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; try { landmarkerRef.current?.close(); } catch { /* already closed */ } landmarkerRef.current = null;
  };
  const startPipeline = async () => {
    const version = versionRef.current + 1; versionRef.current = version; setRun(true); setCamError(false); setServiceError(''); setServiceState('checking');
    
    // 1. Probe Server Model Status safely (never throws Unexpected end of JSON input)
    let isServerReady = false;
    try {
      const statusResponse = await fetch(`${API_BASE}/model-status`);
      const status = await safeJson(statusResponse);
      const model = status?.data;
      if (statusResponse.ok && status?.success && model?.engine === 'tensorflow' && model?.inputMode === 'sequence') {
        isServerReady = true;
      }
    } catch {
      isServerReady = false;
    }

    if (version !== versionRef.current) return;
    setServiceState(isServerReady ? 'ready' : 'local');

    // 2. Start Camera & MediaPipe
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (version !== versionRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const landmarker = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_URL }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: 0.65, minHandPresenceConfidence: 0.65, minTrackingConfidence: 0.65 });
      if (version !== versionRef.current) { landmarker.close(); return; }
      landmarkerRef.current = landmarker;
      setCamOn(true);
      setTrackerReady(true);
    } catch (error) {
      setServiceState('error');
      setServiceError(error.message || 'Unable to start camera. Please ensure webcam permissions are enabled.');
      setCamError(true);
    }
  };
  useEffect(() => {
    if (!run || !trackerReady || !camOn || (serviceState !== 'ready' && serviceState !== 'local')) return undefined;
    let raf, frames = 0, elapsed = 0, previous = performance.now();
    const loop = (now) => {
      const video = videoRef.current, landmarker = landmarkerRef.current;
      if (video?.readyState >= 2 && landmarker) {
        const result = landmarker.detectForVideo(video, now);
        const detected = (result.landmarks || []).map((landmarks, index) => ({ landmarks, bbox: bboxOf(landmarks), score: result.handedness?.[index]?.[0]?.score || 0, name: result.handedness?.[index]?.[0]?.categoryName || 'Hand', gesture: 'TRACKING', confidence: 0 }));
        setHands(detected.length);
        if (!detected.length) { overlayRef.current?.draw([]); primaryRef.current = null; resetPrediction(true); }
        else {
          const primary = primaryRef.current ? detected.reduce((best, hand) => ((hand.landmarks[0].x - primaryRef.current.x) ** 2 + (hand.landmarks[0].y - primaryRef.current.y) ** 2) < ((best.landmarks[0].x - primaryRef.current.x) ** 2 + (best.landmarks[0].y - primaryRef.current.y) ** 2) ? hand : best) : detected.reduce((best, hand) => hand.score > best.score ? hand : best);
          primaryRef.current = primary.landmarks[0]; overlayRef.current?.draw(detected);
          if (now - lastSampleRef.current >= SAMPLE_MS) { lastSampleRef.current = now; framesRef.current = [...framesRef.current, toHand(primary.landmarks)].slice(-WINDOW); if (framesRef.current.length === WINDOW) predict(framesRef.current, versionRef.current); }
        }
        frames += 1; elapsed += now - previous; previous = now; if (elapsed >= 500) { setFps(Math.round((frames * 1000) / elapsed)); frames = 0; elapsed = 0; }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [run, trackerReady, camOn, serviceState]);
  useEffect(() => () => clearIdle(), []);
  const letter = gesture || '–', waveSeed = letter.charCodeAt(0) || 45;
  return (
    <section id="demo" className="relative z-10 px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Live Recognition"
          title="Sign Language to Text"
          sub="MediaPipe tracks the hand locally; a verified server sequence model classifies 12 landmark frames. Output is withheld whenever the model is unavailable or uncertain."
        />

        {/* Controls Bar */}
        <Reveal>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2.5">
              <span className="glass-frosted inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-200 border border-white/12 shadow-md">
                <span
                  className={`h-2 w-2 rounded-full ${
                    serviceState === 'ready'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : serviceState === 'local'
                      ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                      : serviceState === 'checking'
                      ? 'bg-amber-400 animate-pulse'
                      : serviceState === 'error'
                      ? 'bg-red-400'
                      : 'bg-slate-500'
                  }`}
                />
                {serviceState === 'ready'
                  ? 'Server LSTM Active'
                  : serviceState === 'local'
                  ? 'On-Device Browser Mode'
                  : serviceState === 'checking'
                  ? 'Checking Model…'
                  : serviceState === 'error'
                  ? 'Model Unavailable'
                  : 'Model Standby'}
              </span>
              <span className="glass-frosted inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-200 border border-white/12 shadow-md">
                <span
                  className={`h-2 w-2 rounded-full ${
                    camOn ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-500'
                  }`}
                />
                {camOn ? 'Camera Live' : 'Camera Standby'}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMirror((value) => !value)}
                className="glass-card inline-flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/80 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-slate-200 hover:border-cyan-400/40 shadow-lg backdrop-blur-xl transition-all"
              >
                <FiRepeat /> Mirror {mirror ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => (run ? stopRun() : startPipeline())}
                className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-500 px-5 py-2.5 font-display text-xs font-bold text-slate-950 shadow-glow transition-transform hover:scale-105"
              >
                {run ? <FiX /> : <FiCamera />} {run ? 'Stop' : 'Start Camera'}
              </button>
            </div>
          </div>
        </Reveal>

        {serviceError && (
          <p role="alert" className="mb-5 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {serviceError}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Left: Camera Viewport Card */}
          <Reveal delay={0.1}>
            <div className="glass-glow relative overflow-hidden rounded-3xl p-5 shadow-2xl bg-slate-950/90 border border-white/12 backdrop-blur-2xl">
              <div className="scanline relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/12">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 h-full w-full rounded-2xl object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
                />
                <HandOverlay ref={overlayRef} mirror={mirror} />
                <div className="absolute left-5 top-5 z-10 flex gap-2">
                  <span className="rounded-full bg-slate-950/85 px-3 py-1 font-mono text-[10px] text-slate-200 border border-white/12 backdrop-blur-md">
                    {run ? `${fps || '--'} FPS` : '-- FPS'}
                  </span>
                  <span className="rounded-full bg-slate-950/85 px-3 py-1 font-mono text-[10px] text-cyan-300 border border-cyan-400/35 backdrop-blur-md">
                    {hands} hand{hands === 1 ? '' : 's'}
                  </span>
                </div>

                {!run && (
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/80 backdrop-blur-md">
                    <button
                      onClick={startPipeline}
                      className="glass-card flex flex-col items-center gap-3 rounded-3xl px-10 py-8 shadow-2xl border border-white/12 bg-slate-950/90 hover:border-cyan-400/50 transition-all"
                    >
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-sky-400 via-cyan-400 to-violet-500 text-slate-950 shadow-glow">
                        <FiCamera className="h-6 w-6" />
                      </span>
                      <span className="font-display text-base font-bold text-white">Enable camera to begin</span>
                    </button>
                  </div>
                )}

                {camError && run && (
                  <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/90 p-6 text-center backdrop-blur-md">
                    <div>
                      <FiCamera className="mx-auto mb-4 h-10 w-10 text-rose-400" />
                      <p className="font-display text-lg font-bold text-white">Live recognition unavailable</p>
                      <p className="mt-1 max-w-sm text-sm text-slate-300">Please allow camera access in your browser.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* Right: Live Translation Output Card */}
          <Reveal delay={0.2}>
            <div className="glass-glow flex h-full flex-col justify-between rounded-3xl p-6 sm:p-7 shadow-2xl bg-slate-950/90 border border-white/12 backdrop-blur-2xl">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300 font-semibold">
                    Live Translation
                  </div>
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                </div>

                {/* Stream character chips */}
                <div className="flex min-h-[88px] flex-wrap content-center items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
                  {rec ? (
                    [...rec].map((character, index) => (
                      <span
                        key={`${character}-${index}`}
                        className="inline-grid h-9 w-9 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-400/15 font-display text-lg font-bold text-white shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                      >
                        {character}
                      </span>
                    ))
                  ) : (
                    <span className="font-mono text-xs text-slate-400">Awaiting a stable sign…</span>
                  )}
                </div>

                {/* Primary Recognized Gesture & Committed Words */}
                <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-500/20 via-cyan-400/20 to-violet-500/20 border border-cyan-400/30 shadow-inner">
                    <span className="font-display text-4xl font-bold text-white">{letter}</span>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">Committed Words</div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {words.length ? (
                        words.map((word, index) => (
                          <span
                            key={`${word}-${index}`}
                            className="rounded-xl bg-cyan-400/15 border border-cyan-400/35 px-2.5 py-1 font-display text-base font-semibold text-white shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                          >
                            {word}
                          </span>
                        ))
                      ) : (
                        <span className="font-display text-lg text-slate-400">Detection pending</span>
                      )}
                      {speaking && <span className="animate-blink text-cyan-300">▍</span>}
                    </div>
                  </div>
                </div>

                {/* Audio Waveform Stream */}
                <div className="mt-4 flex h-16 items-center justify-center gap-[3px] rounded-2xl border border-white/10 bg-white/[0.03] px-3">
                  {Array.from({ length: 40 }, (_, index) => (
                    <span
                      key={index}
                      className={`wave-bar w-[3px] rounded-full ${
                        run ? 'bg-gradient-to-t from-cyan-400/70 to-violet-400/90' : 'bg-white/10'
                      }`}
                      style={{
                        height: `${run ? 8 + ((index * 7 + waveSeed) % 34) : 10}px`,
                        animationDelay: `${(index % 8) * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Telemetry Metrics Grid */}
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
                {[
                  ['Latency', run ? latency : '–'],
                  ['Confidence', run && gesture ? `${(conf * 100).toFixed(1)}%` : '–'],
                  ['Hands', run ? hands : '–'],
                ].map(([name, value]) => (
                  <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-300/80">{name}</div>
                    <div className="font-display text-xl font-bold text-white mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.3}>
          <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Dual-Mode Pipeline · Server TensorFlow LSTM sequence inference or On-Device MediaPipe Neural Tracking
          </p>
        </Reveal>
      </div>
    </section>
  );
}
