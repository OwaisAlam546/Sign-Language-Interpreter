// MediaPipe detects landmarks; the trained server model supplies every label.
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCamera, FiRepeat, FiX } from 'react-icons/fi';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import HandOverlay from '../components/HandOverlay.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import { Particles } from '../components/Background.jsx';
import { bboxOf } from '../lib/handClassifier.js';
import { WORDS } from '../lib/data.js';
import { isAcceptedPrediction } from '../lib/recognitionPolicy.js';
import { OneEuroLandmarkFilter } from '../lib/oneEuroLandmarks.js';

const WASM_URL = '/models/mediapipe';
const MODEL_URL = '/models/mediapipe/hand_landmarker.task';
const API_BASE = import.meta.env.VITE_AI_API_BASE || '/api/v1/ai';
const STATUS_TIMEOUT_MS = 2500;
const WINDOW = 12, SAMPLE_MS = 66, DETECT_INTERVAL_MS = 66, MIN_CONFIDENCE = 0.78, STABLE_PREDICTIONS = 5, NEUTRAL_PREDICTIONS = 3, WORD_PAUSE_MS = 1200;
const LOCAL_SCORE_WINDOW = 8, LOCAL_COMMIT_STREAK = 10, LOCAL_COMMIT_CONFIDENCE = 0.78;

const WORD_BY_SPELLING = new Map(WORDS.map((word) => [word.pose.filter((letter) => /^[A-Z]$/.test(letter)).join(''), word.name]));

function resolveSpelledText(value) {
  const raw = String(value || '').trim().toUpperCase();
  return WORD_BY_SPELLING.get(raw) || raw;
}

function getValidGesture(label, wordLabels = new Set()) {
  if (!label || typeof label !== 'string') return null;
  const trimmed = label.trim();
  const upper = trimmed.toUpperCase();
  if (/^[A-Z]$/.test(upper)) return upper;
  if (/^[A-Z]+$/.test(upper) && wordLabels.has(upper)) return upper;
  return null;
}

async function safeJson(res) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function ConfBar({ value }) {
  return (
    <motion.div
      className="h-full rounded-full bg-gradient-to-r from-[#00D9FF] via-[#83E8F5] to-[#168BFF]"
      initial={{ width: '0%' }}
      animate={{ width: `${Math.round(value * 100)}%` }}
      transition={{ duration: 0.25 }}
    />
  );
}

const toHand = (landmarks) => landmarks.map(({ x, y, z = 0 }) => [x, y, z]);

function speak(text) {
  if (window.speechSynthesis && text) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text.toLowerCase()));
  }
}

function logSessionPrediction(entry) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    const raw = window.sessionStorage.getItem('signspeak_live_session');
    const records = raw ? JSON.parse(raw) : [];
    records.push({
      ts: Date.now(),
      label: String(entry?.label || '').toUpperCase(),
      confidence: Number(entry?.confidence || 0),
      latencyMs: Math.round(Number(entry?.latencyMs || 0)),
      handsCount: Number(entry?.handsCount || 1),
      status: entry?.status === 'committed' ? 'committed' : 'rejected',
    });
    if (records.length > 200) records.splice(0, records.length - 200);
    window.sessionStorage.setItem('signspeak_live_session', JSON.stringify(records));
  } catch {
    /* ignore session logging errors */
  }
}

export default function LiveDemo() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const videoUrlRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastDetectRef = useRef(0);
  const handsRef = useRef(0);
  const landmarkFilterRef = useRef(new OneEuroLandmarkFilter());

  const framesRef = useRef([]);
  const secFramesRef = useRef([]);
  const frameTimesRef = useRef([]);
  const lastSampleRef = useRef(0);
  const busyRef = useRef(false);
  const versionRef = useRef(0);
  const primaryRef = useRef(null);
  const idleTimerRef = useRef(null);
  const recRef = useRef('');
  const lastUiLabelRef = useRef('');
  const recognizedLabelRef = useRef('');
  const recognizedConfidenceRef = useRef(0);
  const localPredictionHistoryRef = useRef([]);
  const alphabetModuleRef = useRef(null);
  const localModelFailedRef = useRef(false);
  const demoTimerRef = useRef(null);
  const wordLabelsRef = useRef(new Set());

  const stateRef = useRef({ candidate: '', count: 0, neutral: 0, armed: true, last: '' });

  const [run, setRun] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState(false);
  const [trackerReady, setTrackerReady] = useState(false);
  const [serviceState, setServiceState] = useState('idle');
  const [serviceError, setServiceError] = useState('');
  const [mirror, setMirror] = useState(true);
  const [rec, setRec] = useState('');
  const [words, setWords] = useState([]);
  const [gesture, setGesture] = useState('');
  const [hands, setHands] = useState(0);
  const [fps, setFps] = useState(0);
  const [conf, setConf] = useState(0);
  const [latency, setLatency] = useState('–');
  const [speaking, setSpeaking] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });

  const clearIdle = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  };

  const finishWord = () => {
    if (idleTimerRef.current) return;
    idleTimerRef.current = setTimeout(() => {
      const spelled = recRef.current;
      const word = resolveSpelledText(spelled);
      if (word) {
        setWords((items) => [...items, word]);
        speak(word);
        setSpeaking(true);
        setTimeout(() => setSpeaking(false), 1200);
        recRef.current = '';
        setRec('');
      }
      stateRef.current.last = '';
      idleTimerRef.current = null;
    }, WORD_PAUSE_MS);
  };

  const resetPrediction = (noHand = false) => {
    setGesture('');
    setConf(0);
    recognizedLabelRef.current = '';
    recognizedConfidenceRef.current = 0;
    if (noHand) {
      localPredictionHistoryRef.current = [];
      stateRef.current.localCandidate = '';
      stateRef.current.localStreak = 0;
      stateRef.current.last = '';
    }
    const state = stateRef.current;
    state.candidate = '';
    state.count = 0;
    state.neutral += 1;
    // Jitter protection: Only re-arm and clear last committed gesture after an actual
    // release (no hand in frame, or an extended neutral pause of >= 8 frames ~530ms)
    if (state.neutral >= 8 || noHand) {
      state.armed = true;
      state.last = '';
    }
    if (noHand) finishWord();
  };

  const acceptPrediction = (data) => {
    const wordLabels = wordLabelsRef.current;
    const label = getValidGesture(data?.gesture, wordLabels);
    const valid = isAcceptedPrediction({
      gesture: label,
      confidence: data?.confidence,
      displayed: data?.displayed,
      serviceState,
      wordLabels,
    });
    if (!valid) {
      logSessionPrediction({
        label: data?.gesture || 'UNKNOWN',
        confidence: data?.confidence,
        latencyMs: data?.latencyMs,
        handsCount: handsRef.current || 1,
        status: 'rejected',
      });
      resetPrediction();
      return;
    }
    clearIdle();
    if (lastUiLabelRef.current !== label) {
      lastUiLabelRef.current = label;
      setGesture(label);
    }
    recognizedLabelRef.current = label;
    recognizedConfidenceRef.current = data.confidence;
    setConf(data.confidence);
    setLatency(`${Math.round(data.latencyMs || 0)}ms`);
    const state = stateRef.current;
    state.neutral = 0;
    if (state.candidate === label) {
      state.count += 1;
    } else {
      state.candidate = label;
      state.count = 1;
      if (label !== state.last) state.armed = true;
    }

    const isWord = wordLabels.has(label);
    const requiredStable = data?.source === 'local-onnx' ? 1 : isWord ? 2 : STABLE_PREDICTIONS;
    // Commit only if armed, stable, and not already committed for this held gesture
    if (state.armed && state.count >= requiredStable && label !== state.last) {
      logSessionPrediction({
        label,
        confidence: data?.confidence,
        latencyMs: data?.latencyMs,
        handsCount: handsRef.current || 1,
        status: 'committed',
      });
      if (isWord) {
        const flushed = recRef.current;
        recRef.current = '';
        setRec('');
        setWords((items) => (flushed ? [...items, flushed, label] : [...items, label]));
        speak(label);
        setSpeaking(true);
        setTimeout(() => setSpeaking(false), 1200);
      } else if (/^[A-Z]$/.test(label)) {
        recRef.current += label;
        setRec(recRef.current);
      }
      state.last = label;
      state.armed = false;
      state.count = 0;
      stateRef.current.localStreak = 0;
    }
  };

  const predict = async (frames, secondaryFrames, version, frameTimes) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      if (serviceState !== 'ready') {
        // Use the new 90-feature landmark ONNX alphabet model locally, with fallback to legacy CNN.
        if (!alphabetModuleRef.current) {
          try {
            alphabetModuleRef.current = await import('../lib/onnxAlphabetLandmark.js');
          } catch (err) {
            console.warn('Failed to load landmark ONNX model, falling back to legacy CNN model:', err);
            alphabetModuleRef.current = await import('../lib/onnxAlphabet.js');
          }
        }
        if (frames.length >= 8) {
          const recent = frames.slice(-8);
          const motionFrames = recent.slice(-4);
          const motionTimes = frameTimes.slice(-motionFrames.length);
          const sourceWidth = videoRef.current?.videoWidth || 640;
          const sourceHeight = videoRef.current?.videoHeight || 480;
          const wristTrack = motionFrames.map((frame) => {
            const points = frame.map(([x, y]) => [x * sourceWidth, y * sourceHeight]);
            const xs = points.map(([x]) => x);
            const ys = points.map(([, y]) => y);
            const handSize = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
            return [points[0][0] / handSize, points[0][1] / handSize];
          });
          const speeds = wristTrack.slice(1).map((point, index) => {
            const dt = Math.max((motionTimes[index + 1] - motionTimes[index]) / 1000, 1e-3);
            return Math.hypot(point[0] - wristTrack[index][0], point[1] - wristTrack[index][1]) / dt;
          });
          const moving = speeds.length > 0 && speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length > 1.05;
          if (moving) {
            localPredictionHistoryRef.current = [];
            stateRef.current.localCandidate = '';
            stateRef.current.localStreak = 0;
            resetPrediction();
            return;
          }
        }
        const video = videoRef.current;
        let local;
        try {
          local = await alphabetModuleRef.current.inferAlphabet(
            frames[frames.length - 1],
            video?.videoWidth || 640,
            video?.videoHeight || 480
          );
        } catch (inferenceErr) {
          console.warn('Primary alphabet inference failed, attempting legacy fallback:', inferenceErr);
          const fallbackModule = await import('../lib/onnxAlphabet.js');
          alphabetModuleRef.current = fallbackModule;
          local = await fallbackModule.inferAlphabet(
            frames[frames.length - 1],
            video?.videoWidth || 640,
            video?.videoHeight || 480
          );
        }
        if (version === versionRef.current && local.gesture !== 'UNKNOWN') {
          const history = localPredictionHistoryRef.current;
          history.push(local.scores);
          localPredictionHistoryRef.current = history.slice(-LOCAL_SCORE_WINDOW);
          const recent = localPredictionHistoryRef.current;
          const averagedScores = Object.fromEntries(
            Object.keys(local.scores).map((label) => [
              label,
              recent.reduce((sum, scores) => sum + (scores[label] || 0), 0) / recent.length,
            ])
          );
          const [dominant, averageConfidence] = Object.entries(averagedScores).sort((a, b) => b[1] - a[1])[0] || [];
          const previousLabel = stateRef.current.localCandidate;
          stateRef.current.localCandidate = dominant;
          stateRef.current.localStreak = dominant === previousLabel ? (stateRef.current.localStreak || 0) + 1 : 1;
          if (
            recent.length === LOCAL_SCORE_WINDOW &&
            averageConfidence >= LOCAL_COMMIT_CONFIDENCE &&
            stateRef.current.localStreak >= LOCAL_COMMIT_STREAK
          ) {
            acceptPrediction({
              gesture: dominant,
              confidence: averageConfidence,
              source: 'local-onnx',
              latencyMs: 0,
              displayed: true,
            });
          } else {
            if (averageConfidence >= 0.5) {
              recognizedLabelRef.current = dominant;
              recognizedConfidenceRef.current = averageConfidence;
              if (lastUiLabelRef.current !== dominant) {
                lastUiLabelRef.current = dominant;
                setGesture(dominant);
              }
              setConf(averageConfidence);
            } else {
              resetPrediction();
            }
          }
        } else if (version === versionRef.current) {
          localPredictionHistoryRef.current = [];
          stateRef.current.localCandidate = '';
          stateRef.current.localStreak = 0;
          resetPrediction();
        }
        return;
      }

      const response = await fetch(`${API_BASE}/predict-sequence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames, strategy: 'average' }),
      });
      const body = await safeJson(response);
      if (version !== versionRef.current) return;
      if (response.ok && body?.success && body?.data && body.data.gesture !== 'NONE' && body.data.gesture !== 'UNKNOWN') {
        acceptPrediction(body.data);
      } else {
        resetPrediction();
      }
    } catch (error) {
      if (version === versionRef.current && serviceState !== 'ready') {
        localModelFailedRef.current = true;
        setServiceState('error');
        const detail = error?.message ? ` (${error.message.slice(0, 160)})` : '';
        setServiceError(`The local alphabet model could not be loaded. Hand tracking is active, but translation is paused.${detail}`);
        resetPrediction();
      } else if (version === versionRef.current) {
        resetPrediction();
      }
    } finally {
      busyRef.current = false;
    }
  };

  const stopRun = () => {
    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    demoTimerRef.current = null;
    localModelFailedRef.current = false;
    versionRef.current += 1;
    clearIdle();
    recognizedLabelRef.current = '';
    recognizedConfidenceRef.current = 0;
    setDemoMode(false);
    setVideoMode(false);
    setRun(false);
    setCamOn(false);
    setTrackerReady(false);
    setServiceState('idle');
    setGesture('');
    lastUiLabelRef.current = '';
    setConf(0);
    handsRef.current = 0;
    setHands(0);
    setLatency('–');
    setRec('');
    setWords([]);
    setSpeaking(false);
    recRef.current = '';
    framesRef.current = [];
    secFramesRef.current = [];
    frameTimesRef.current = [];
    localPredictionHistoryRef.current = [];
    landmarkFilterRef.current.reset();
    primaryRef.current = null;
    stateRef.current = { candidate: '', count: 0, neutral: 0, armed: true, last: '' };
    window.speechSynthesis?.cancel();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = null;
    try {
      landmarkerRef.current?.close();
    } catch {
      /* already closed */
    }
    landmarkerRef.current = null;
  };

  const startDemo = () => {
    stopRun();
    setDemoMode(true);
    setCamError(false);
    setRun(true);
    setServiceState('local');
    setServiceError('');
    setHands(1);
    setFps(30);
    setLatency('0ms');
    const letters = ['A', 'B', 'C', 'L', 'O'];
    let index = 0;
    const show = () => {
      const next = letters[index % letters.length];
      index += 1;
      setGesture(next);
      setConf(0.99);
      setRec(next);
      logSessionPrediction({
        label: next,
        confidence: 0.99,
        latencyMs: 12,
        handsCount: 1,
        status: 'committed',
      });
    };
    show();
    demoTimerRef.current = setInterval(show, 1600);
  };

  const startVideoTest = async (file) => {
    if (!file) return;
    stopRun();
    const version = versionRef.current + 1;
    versionRef.current = version;
    wordLabelsRef.current = new Set();
    setVideoMode(true);
    setRun(true);
    setCamError(false);
    setServiceError('');
    setServiceState('local');
    try {
      const url = URL.createObjectURL(file);
      videoUrlRef.current = url;
      const video = videoRef.current;
      video.srcObject = null;
      video.src = url;
      video.load();
      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = () => reject(new Error('The selected video could not be decoded.'));
      });
      setVideoSize({ width: video.videoWidth || 640, height: video.videoHeight || 480 });
      await video.play();
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      if (version !== versionRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      setCamOn(true);
      setTrackerReady(true);
    } catch (error) {
      setVideoMode(false);
      setRun(false);
      setServiceState('local');
      setServiceError(error.message || 'Unable to process this video.');
      setCamError(true);
    }
  };

  const startPipeline = async () => {
    const version = versionRef.current + 1;
    versionRef.current = version;
    setRun(true);
    setCamError(false);
    setServiceError('');
    setServiceState('checking');
    wordLabelsRef.current = new Set();

    // 1. Probe Server Model Status safely (never throws Unexpected end of JSON input)
    let isServerReady = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
      const statusResponse = await fetch(`${API_BASE}/model-status`, { signal: controller.signal });
      clearTimeout(timeout);
      const status = await safeJson(statusResponse);
      const model = status?.data;
      if (statusResponse.ok && status?.success && model?.engine === 'tensorflow' && model?.inputMode === 'sequence') {
        isServerReady = true;
        wordLabelsRef.current = new Set(
          (Array.isArray(model?.vocabulary?.words) ? model.vocabulary.words : [])
            .map((label) => String(label).trim().toUpperCase())
            .filter((label) => /^[A-Z]{2,}$/.test(label))
        );
      }
    } catch {
      isServerReady = false;
    }

    if (version !== versionRef.current) return;
    setServiceState(isServerReady ? 'ready' : 'local');

    // 2. Start Camera & MediaPipe
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (version !== versionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setVideoSize({ width: videoRef.current.videoWidth || 640, height: videoRef.current.videoHeight || 480 });
      }
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      if (version !== versionRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      setCamOn(true);
      setTrackerReady(true);
    } catch (error) {
      setServiceState(isServerReady ? 'ready' : 'local');
      setServiceError(error.message || 'Unable to start camera. Please ensure webcam permissions are enabled.');
      setCamError(true);
    }
  };

  useEffect(() => {
    if (!run || !trackerReady || !camOn || serviceState === 'checking' || serviceState === 'idle' || localModelFailedRef.current) {
      return undefined;
    }
    let raf, frames = 0, elapsed = 0, previous = performance.now();
    const loop = (now) => {
      const video = videoRef.current, landmarker = landmarkerRef.current;
      if (video?.readyState >= 2 && landmarker && now - lastDetectRef.current >= DETECT_INTERVAL_MS) {
        lastDetectRef.current = now;
        const result = landmarker.detectForVideo(video, now);
        const sourceWidth = video.videoWidth || 640;
        const sourceHeight = video.videoHeight || 480;
        const detected = (result.landmarks || []).map((rawLandmarks, index) => {
          const landmarks = landmarkFilterRef.current.filter(rawLandmarks, sourceWidth, sourceHeight, now);
          return {
            landmarks,
            bbox: bboxOf(landmarks),
            score: result.handedness?.[index]?.[0]?.score || 0,
            name: result.handedness?.[index]?.[0]?.categoryName || 'Hand',
            gesture: recognizedLabelRef.current || 'HAND',
            confidence: recognizedLabelRef.current ? recognizedConfidenceRef.current : (result.handedness?.[index]?.[0]?.score || 0),
          };
        });
        if (detected.length !== handsRef.current) {
          handsRef.current = detected.length;
          setHands(detected.length);
        }
        if (!detected.length) {
          overlayRef.current?.draw([]);
          primaryRef.current = null;
          framesRef.current = [];
          secFramesRef.current = [];
          frameTimesRef.current = [];
          landmarkFilterRef.current.reset();
          resetPrediction(true);
        } else {
          const primary = primaryRef.current
            ? detected.reduce((best, hand) =>
                ((hand.landmarks[0].x - primaryRef.current.x) ** 2 + (hand.landmarks[0].y - primaryRef.current.y) ** 2) <
                ((best.landmarks[0].x - primaryRef.current.x) ** 2 + (best.landmarks[0].y - primaryRef.current.y) ** 2)
                  ? hand
                  : best
              )
            : detected.reduce((best, hand) => (hand.score > best.score ? hand : best));
          const secondary = detected.find((h) => h !== primary) || null;
          primaryRef.current = primary.landmarks[0];
          overlayRef.current?.draw(detected);

          if (now - lastSampleRef.current >= SAMPLE_MS) {
            lastSampleRef.current = now;
            framesRef.current = [...framesRef.current, toHand(primary.landmarks)].slice(-WINDOW);
            secFramesRef.current = secondary ? [...secFramesRef.current, toHand(secondary.landmarks)].slice(-WINDOW) : [];
            frameTimesRef.current = [...frameTimesRef.current, now].slice(-WINDOW);
            if (framesRef.current.length >= 8) {
              predict(framesRef.current, secFramesRef.current, versionRef.current, frameTimesRef.current);
            }
          }
        }
        frames += 1;
        elapsed += now - previous;
        previous = now;
        if (elapsed >= 500) {
          setFps(Math.round((frames * 1000) / elapsed));
          frames = 0;
          elapsed = 0;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [run, trackerReady, camOn, serviceState]);

  useEffect(() => () => clearIdle(), []);

  const letter = gesture || '–', waveSeed = letter.charCodeAt(0) || 45;

  return (
    <section id="demo" className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12 overflow-hidden">
      <Particles className="pointer-events-none absolute inset-0 z-0 opacity-35 dark:opacity-25" count={34} />
      <div className="relative z-10 mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Live Recognition"
          title="Sign Language to Text"
          sub="MediaPipe tracks the hand locally; the pretrained ONNX model recognizes static A–Z letters. Word and moving-sign recognition requires a trained sequence model, so the alphabet model will not invent words from motion."
        />

        {/* Controls Bar */}
        <Reveal>
          <div className="mb-4 sm:mb-5 flex flex-wrap items-center justify-between gap-3">
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
                    ? 'ONNX Static Letters'
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

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => setMirror((value) => !value)}
                className="glass-card inline-flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/80 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-slate-200 hover:border-cyan-400/40 shadow-lg backdrop-blur-xl transition-all"
              >
                <FiRepeat /> Mirror {mirror ? 'On' : 'Off'}
              </button>
              {!run && (
                <button
                  type="button"
                  onClick={startDemo}
                  className="rounded-full border border-cyan-400/30 bg-slate-950/80 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-cyan-200 hover:border-cyan-300 transition-colors shadow-md"
                >
                  Try Demo
                </button>
              )}
              {!run && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => startVideoTest(event.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full border border-violet-400/30 bg-slate-950/80 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-violet-200 hover:border-violet-300 transition-colors shadow-md"
                  >
                    Test Video
                  </button>
                </>
              )}
              <button
                onClick={() => (run ? stopRun() : startPipeline())}
                className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00D9FF] via-[#83E8F5] to-[#168BFF] px-5 py-2.5 font-display text-xs font-bold text-slate-950 shadow-glow transition-transform hover:scale-105"
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
            <div className="camera-panel-card glass-glow relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl bg-slate-950/90 border border-white/12 backdrop-blur-2xl">
              <div className="scanline relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/12">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onEnded={() => {
                    if (videoMode) stopRun();
                  }}
                  className={`absolute inset-0 h-full w-full rounded-2xl object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
                />
                <HandOverlay ref={overlayRef} mirror={mirror} sourceWidth={videoSize.width} sourceHeight={videoSize.height} />
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
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#00D9FF] via-[#83E8F5] to-[#168BFF] text-slate-950 shadow-glow">
                        <FiCamera className="h-6 w-6" />
                      </span>
                      <span className="font-display text-base font-bold text-white">Enable camera to begin</span>
                    </button>
                  </div>
                )}

                {camError && run && !demoMode && (
                  <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/90 p-6 text-center backdrop-blur-md">
                    <div>
                      <FiCamera className="mx-auto mb-4 h-10 w-10 text-rose-400" />
                      <p className="font-display text-lg font-bold text-white">Live recognition unavailable</p>
                      <p className="mt-1 max-w-sm text-sm text-slate-300">
                        Allow camera access in your browser, then retry. You can use Try Demo to verify the translation panel without a webcam.
                      </p>
                      <button
                        type="button"
                        onClick={startPipeline}
                        className="mt-4 rounded-full bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300 transition-colors shadow-glow"
                      >
                        Retry camera
                      </button>
                    </div>
                  </div>
                )}
                {demoMode && (
                  <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-cyan-400/40 bg-slate-950/85 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cyan-200">
                    Synthetic UI demo · not an accuracy test
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* Right: Live Translation Output Card */}
          <Reveal delay={0.2}>
            <div className="translation-panel-card glass-glow flex h-full min-w-0 flex-col justify-between rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 shadow-2xl bg-slate-950/90 border border-white/12 backdrop-blur-2xl">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300 font-semibold">
                    Live Translation
                  </div>
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                </div>

                {/* Stream character chips */}
                <div aria-live="polite" className="flex min-h-[88px] min-w-0 flex-wrap content-center items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
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
                <div aria-live="polite" className="mt-4 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#00D9FF]/20 via-[#168BFF]/15 to-[#83E8F5]/10 border border-cyan-400/30 shadow-inner">
                    <span className="font-display text-4xl font-bold text-white">{letter}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">Committed Words</div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {words.length ? (
                        words.map((word, index) => (
                          <span
                            key={`${word}-${index}`}
                            className="max-w-full break-words rounded-xl bg-cyan-400/15 border border-cyan-400/35 px-2.5 py-1 font-display text-base font-semibold text-white shadow-[0_0_8px_rgba(34,211,238,0.2)]"
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
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 sm:gap-3">
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
            Local Pipeline · MediaPipe hand tracking + pretrained ONNX alphabet recognition; server sequence inference is optional
          </p>
        </Reveal>
      </div>
    </section>
  );
}
