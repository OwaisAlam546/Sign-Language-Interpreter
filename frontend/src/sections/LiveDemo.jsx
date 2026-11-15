// MediaPipe detects landmarks; the trained server model supplies every label.
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCamera, FiRepeat, FiSliders, FiX } from 'react-icons/fi';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import HandOverlay from '../components/HandOverlay.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import { Particles } from '../components/Background.jsx';
import { bboxOf, classifyHand, classifySequence } from '../lib/handClassifier.js';
import { WORDS } from '../lib/data.js';
import {
  computeWindowMotion,
  isAcceptedPrediction,
  MOTION_TRANSITION_THRESHOLD,
  MIN_RECOGNITION_CONFIDENCE,
  MIN_TOP2_MARGIN,
  STABLE_FRAMES_DYNAMIC,
  STABLE_FRAMES_STATIC,
} from '../lib/recognitionPolicy.js';
import { OneEuroLandmarkFilter } from '../lib/oneEuroLandmarks.js';
import { inferAlphabetLandmark, loadLandmarkSession } from '../lib/onnxAlphabetLandmark.js';
import { SwipeDeleteDetector } from '../lib/swipeDeleteDetector.js';
import { extractWordFeatures, WordSequenceBuffer } from '../lib/wordLandmarkFeatures.js';
import { inferWordSequence, loadWordSession, loadWordLabels, DEFAULT_WORD_THRESHOLDS } from '../lib/onnxWordRecognizer.js';

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
  if (upper === 'DEL' || upper === 'SPACE') return upper;
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
  const frameIdRef = useRef(0);
  // Dedicated landmark filters per hand to eliminate cross-talk and velocity explosions
  const landmarkFiltersRef = useRef({
    Left: new OneEuroLandmarkFilter(),
    Right: new OneEuroLandmarkFilter(),
  });
  const lastHandsInfoRef = useRef({ left: false, right: false, pose: false, leftConf: 0, rightConf: 0, rawCount: 0 });

  // Word sequence stability & commitment state machine
  const wordStabilityRef = useRef({
    candidate: '',
    count: 0,
    armed: true,
    lastCommitted: '',
    lastCommitTime: 0,
  });

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
  const swipeDetectorRef = useRef(new SwipeDeleteDetector());
  const swipeSuppressionRef = useRef(0);

  // Operating Mode: 'alphabet' | 'words' | 'hybrid'
  const [mode, setMode] = useState('alphabet');
  const modeRef = useRef('alphabet');
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Top-3 Interactive Suggestions
  const [topSuggestions, setTopSuggestions] = useState([]);

  // Word Recognizer State & Sequence Buffer
  const wordBufferRef = useRef(new WordSequenceBuffer(16));
  const wordSampleCounterRef = useRef(0);
  const lastCommittedWordRef = useRef('');
  const lastWordCommitTimeRef = useRef(0);
  const alphabetLockoutUntilRef = useRef(0);
  const poseLandmarkerRef = useRef(null);
  const wordModelLoadedRef = useRef(false);

  const [run, setRun] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState(false);
  const [trackerReady, setTrackerReady] = useState(false);
  const [serviceState, setServiceState] = useState('idle');
  const [serviceError, setServiceError] = useState('');
  const [mirror, setMirror] = useState(true);
  const mirrorRef = useRef(mirror);
  useEffect(() => { mirrorRef.current = mirror; }, [mirror]);

  const [rec, setRec] = useState('');
  const [words, setWords] = useState([]);
  const [gesture, setGesture] = useState('');
  const [recognitionState, setRecognitionState] = useState('standby');
  const [statusMessage, setStatusMessage] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagInfo, setDiagInfo] = useState({
    engine: 'ONNX Runtime Web (WASM)',
    modelName: 'alphabet_landmark_model.onnx',
    activeMode: 'Alphabet (A–Z)',
    frameId: 0,
    topLetter: '–',
    confidence: 0,
    top2Conf: 0,
    margin: 0,
    delProb: 0,
    mProb: 0,
    nProb: 0,
    stableCount: 0,
    isAccepted: false,
    state: 'Standby',
    rejectionReason: 'None',
    top5: [],
    landmarkQuality: 'No Hand Detected',
    fingerMotion: 0,
    wordBufferFrames: 0,
    validHandFrames: 0,
    motionEnergy: 0,
    handsCount: 0,
    rawDetectorCount: 0,
    leftHandDetected: false,
    rightHandDetected: false,
    leftHandConf: 0,
    rightHandConf: 0,
    poseDetected: false,
    tensorShape: '[1, 16, 147]',
    latencyMs: 0,
    isArmed: true,
    lastCommittedWord: '–',
    timeSinceCommitMs: null,
    swipeInfo: {
      status: 'IDLE',
      wristPosition: { x: 0, y: 0, userX: 0 },
      normDeltaX: 0,
      normDeltaY: 0,
      velocity: 0,
      direction: 'NONE',
      reason: 'Awaiting hand',
      inCooldown: false,
      consumed: false,
      candidate: false,
      palmScale: 0.04,
    },
  });
  const [hands, setHands] = useState(0);
  const [fps, setFps] = useState(0);
  const [conf, setConf] = useState(0);
  const [latency, setLatency] = useState('–');
  const [speaking, setSpeaking] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });
  const [backendStatus, setBackendStatus] = useState('checking');
  const [onnxStatus, setOnnxStatus] = useState('standby');

  const probeBackend = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
      const statusResponse = await fetch(`${API_BASE}/model-status`, { signal: controller.signal });
      clearTimeout(timeout);
      if (statusResponse.ok) {
        setBackendStatus('available');
      } else {
        setBackendStatus('offline');
      }
    } catch {
      setBackendStatus('offline');
    }
  };

  const clearIdle = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  };

  const finishWord = () => {
    if (idleTimerRef.current) return;
    idleTimerRef.current = setTimeout(() => {
      const spelled = recRef.current;
      const trimmed = spelled.trim();
      if (trimmed) {
        const word = resolveSpelledText(trimmed);
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
    recognizedLabelRef.current = '';
    recognizedConfidenceRef.current = 0;
    if (noHand) {
      swipeDetectorRef.current?.reset();
      setGesture('');
      setConf(0);
      setStatusMessage('');
      setRecognitionState('standby');
      lastUiLabelRef.current = '';
      localPredictionHistoryRef.current = [];
      stateRef.current.localCandidate = '';
      stateRef.current.localStreak = 0;
      stateRef.current.last = '';
      setDiagInfo((prev) => ({
        ...prev,
        state: 'Standby',
        rejectionReason: 'No Hand Detected (Inference & Commit Blocked)',
        landmarkQuality: 'No Hand in View',
        handsCount: 0,
        rawDetectorCount: 0,
        leftHandDetected: false,
        rightHandDetected: false,
        poseDetected: false,
        isAccepted: false,
        swipeInfo: swipeDetectorRef.current?.getDiagnostics(),
      }));
    }
    const state = stateRef.current;
    state.candidate = '';
    state.count = 0;
    state.neutral += 1;
    if (state.neutral >= 4 || noHand) {
      state.armed = true;
      state.last = '';
      if (!noHand && state.neutral >= 4) {
        setGesture('');
        lastUiLabelRef.current = '';
      }
    }
    if (noHand) finishWord();
  };

  const acceptPrediction = (data) => {
    const wordLabels = wordLabelsRef.current;
    const label = getValidGesture(data?.gesture, wordLabels);
    const valid = isAcceptedPrediction({
      gesture: label,
      confidence: data?.confidence,
      margin: data?.margin ?? 1.0,
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
      setStatusMessage('Uncertain – Adjust your hand position');
      setRecognitionState('uncertain');
      setGesture('');
      lastUiLabelRef.current = '';
      resetPrediction();
      return;
    }
    clearIdle();

    recognizedLabelRef.current = label;
    recognizedConfidenceRef.current = data.confidence;
    setConf(data.confidence);
    setLatency(`${Math.round(data.latencyMs || 0)}ms`);

    const isWord = wordLabels.has(label);
    const isDynamic = label === 'J' || label === 'Z';
    const isMoving = Boolean(data?.isMoving);

    // Maintain recent predictions rolling window history
    const history = localPredictionHistoryRef.current;
    history.push({ label, confidence: data.confidence, isMoving, time: performance.now() });
    if (history.length > 8) history.shift();

    const isTransitioning = !isDynamic && (isMoving || (history.length >= 3 && history.slice(-3).some((h) => h.isMoving)));

    const state = stateRef.current;
    state.neutral = 0;

    if (isTransitioning) {
      state.count = 0;
      state.candidate = '';
      setStatusMessage('Transitioning – Hold sign steady');
      setRecognitionState('transitioning');
      setGesture('');
      lastUiLabelRef.current = '';
      return;
    }

    if (state.candidate === label) {
      state.count += 1;
    } else {
      state.candidate = label;
      state.count = 1;
      if (label !== state.last) state.armed = true;
    }

    // Display smoothing: update visible gesture preview only when candidate has held for >= 2 frames
    if (state.count >= 2 || label === state.last) {
      setStatusMessage('');
      setRecognitionState('stable');
      if (lastUiLabelRef.current !== label) {
        lastUiLabelRef.current = label;
        setGesture(label);
      }
    }

    const requiredStable = isDynamic ? STABLE_FRAMES_DYNAMIC : isWord ? 2 : STABLE_FRAMES_STATIC;
    // Commit only if armed, stable, and not already committed for this held gesture
    if (state.armed && state.count >= requiredStable && label !== state.last) {
      logSessionPrediction({
        label,
        confidence: data?.confidence,
        latencyMs: data?.latencyMs,
        handsCount: handsRef.current || 1,
        status: 'committed',
      });
      setRecognitionState('committed');
      if (isWord) {
        const flushed = recRef.current;
        recRef.current = '';
        setRec('');
        setWords((items) => (flushed ? [...items, flushed, label] : [...items, label]));
        speak(label);
        setSpeaking(true);
        setTimeout(() => setSpeaking(false), 1200);
      } else if (label === 'SPACE') {
        if (recRef.current.length > 0 && !recRef.current.endsWith(' ')) {
          recRef.current += ' ';
          setRec(recRef.current);
        }
      } else if (label === 'DEL') {
        // Disabled: Deletion is handled exclusively by the real-time left-swipe gesture detector.
        // Static DEL pose commits are bypassed to eliminate false-positive deletions.
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
    const startTime = performance.now();
    try {
      if (performance.now() < swipeSuppressionRef.current) {
        setRecognitionState('transitioning');
        setStatusMessage('Swipe Delete – Resuming recognition');
        return;
      }

      const motion = computeWindowMotion(frames);
      const lastFrame = frames[frames.length - 1];
      if (!lastFrame || lastFrame.length < 21) {
        resetPrediction();
        return;
      }

      const isLeftHand = Boolean(primaryRef.current?.isLeftHand);

      // Evaluate sequence for dynamic signs (J, Z)
      const seqResult = classifySequence(frames, secondaryFrames);
      let result = null;
      let onnxResult = null;

      if (seqResult && ['J', 'Z'].includes(seqResult.gesture) && seqResult.displayed) {
        result = {
          ...seqResult,
          margin: 0.85,
          rawWinner: seqResult.gesture,
          rawConfidence: seqResult.confidence || 0.94,
          top5: [{ label: seqResult.gesture, score: seqResult.confidence || 0.94 }],
          isAccepted: true,
          source: 'sequence-engine',
        };
      } else {
        // PRIMARY CLIENT PATH: 90-feature ONNX model (alphabet_landmark_model.onnx)
        try {
          onnxResult = await inferAlphabetLandmark(lastFrame, isLeftHand);
          if (onnxResult) {
            result = {
              gesture: onnxResult.gesture,
              confidence: onnxResult.confidence,
              margin: onnxResult.margin,
              rawWinner: onnxResult.rawWinner,
              rawConfidence: onnxResult.rawConfidence,
              top5: onnxResult.top5,
              isAccepted: onnxResult.isAccepted,
              source: 'onnx-90d',
              type: 'letter',
            };
          }
        } catch (onnxErr) {
          console.warn('Local ONNX inference error, checking fallback:', onnxErr);
          const lms = lastFrame.map(([x, y, z]) => ({ x, y, z }));
          const staticResult = classifyHand(lms);
          if (staticResult && staticResult.gesture !== 'UNKNOWN') {
            const fallbackAccepted = isAcceptedPrediction({
              gesture: staticResult.gesture,
              confidence: staticResult.confidence,
              margin: 0.5,
              serviceState: 'local',
            });
            result = {
              gesture: fallbackAccepted ? staticResult.gesture : 'UNKNOWN',
              confidence: staticResult.confidence,
              margin: 0.5,
              rawWinner: staticResult.gesture,
              rawConfidence: staticResult.confidence,
              top5: [{ label: staticResult.gesture, score: staticResult.confidence }],
              isAccepted: fallbackAccepted,
              source: 'rule-fallback',
              type: staticResult.type,
            };
          } else if (seqResult && seqResult.gesture !== 'UNKNOWN' && seqResult.displayed) {
            result = {
              ...seqResult,
              margin: 0.5,
              rawWinner: seqResult.gesture,
              rawConfidence: seqResult.confidence || 0.8,
              top5: [{ label: seqResult.gesture, score: seqResult.confidence || 0.8 }],
              isAccepted: true,
              source: 'sequence-engine',
            };
          }
        }
      }

      if (version !== versionRef.current) return;

      const latencyMs = performance.now() - startTime;
      const topCand = result?.rawWinner || result?.gesture || '–';
      const candConf = result?.rawConfidence ?? result?.confidence ?? 0;
      const candMargin = result?.margin ?? 0;
      const isMoving = motion.isMoving;

      let currentSubState = 'Detecting';
      let rejectionReason = 'None (Accepted)';

      if (isMoving) {
        currentSubState = 'Transitioning';
        rejectionReason = `Hand in Motion (${motion.fingerMotion.toFixed(3)} > ${MOTION_TRANSITION_THRESHOLD})`;
      } else if (!result || result.gesture === 'UNKNOWN' || result.isAccepted === false) {
        currentSubState = 'Uncertain';
        rejectionReason = candConf < MIN_RECOGNITION_CONFIDENCE
          ? `Low Confidence (${(candConf * 100).toFixed(1)}% < ${(MIN_RECOGNITION_CONFIDENCE * 100).toFixed(0)}%)`
          : `Ambiguous Margin (${(candMargin * 100).toFixed(1)}% < ${(MIN_TOP2_MARGIN * 100).toFixed(0)}%)`;
      } else if (stateRef.current.count >= 2) {
        currentSubState = 'Stable';
      }

      const delProb = result?.scores?.['DEL'] ?? 0;
      const mProb = result?.scores?.['M'] ?? 0;
      const nProb = result?.scores?.['N'] ?? 0;
      const top2Conf = result?.top5?.[1]?.score ?? 0;
      const stableCount = stateRef.current.count;
      const isAccepted = Boolean(result?.isAccepted && !isMoving);

      if (result?.top5?.length) {
        setTopSuggestions(result.top5.slice(0, 3).map((item) => ({
          label: item.label,
          score: item.score,
          isAccepted: Boolean(result.isAccepted && item.label === result.gesture),
        })));
      }

      setDiagInfo({
        engine: result?.source === 'onnx-90d' ? 'ONNX Runtime Web (WASM)' : (result?.source || 'Standby'),
        modelName: result?.source === 'onnx-90d' ? 'alphabet_landmark_model.onnx' : (result ? 'Fallback Classifier' : 'alphabet_landmark_model.onnx'),
        activeMode: 'Alphabet (A–Z)',
        topLetter: topCand,
        confidence: candConf,
        top2Conf,
        margin: candMargin,
        delProb,
        mProb,
        nProb,
        stableCount,
        isAccepted,
        state: currentSubState,
        rejectionReason,
        top5: result?.top5 || [],
        landmarkQuality: `OK (Hand: ${isLeftHand ? 'Left' : 'Right'})`,
        fingerMotion: motion.fingerMotion,
        wordBufferFrames: 0,
        motionEnergy: 0,
        handsCount: handsRef.current || 1,
        leftHandDetected: lastHandsInfoRef.current.left,
        rightHandDetected: lastHandsInfoRef.current.right,
        poseDetected: lastHandsInfoRef.current.pose,
        tensorShape: '[1, 90]',
        latencyMs,
        swipeInfo: swipeDetectorRef.current?.getDiagnostics(),
      });

      // 1. Transition Handling: actively moving hand
      if (isMoving) {
        setRecognitionState('transitioning');
        setStatusMessage('Transitioning – Hold sign steady');
        setGesture('');
        lastUiLabelRef.current = '';
        stateRef.current.candidate = '';
        stateRef.current.count = 0;
        return;
      }

      // 2. Uncertainty Handling: low confidence or ambiguous margin
      if (!result || result.gesture === 'UNKNOWN' || result.isAccepted === false) {
        setRecognitionState('uncertain');
        setStatusMessage('Uncertain – Adjust your hand position');
        setGesture('');
        lastUiLabelRef.current = '';
        stateRef.current.candidate = '';
        stateRef.current.count = 0;
        return;
      }

      // 3. Accepted Prediction
      acceptPrediction({
        gesture: result.gesture,
        confidence: result.confidence,
        margin: result.margin,
        latencyMs,
        source: result.source,
        displayed: true,
        isMoving: false,
        fingerMotion: motion.fingerMotion,
      });
      return;
    } catch (error) {
      if (version === versionRef.current) {
        localModelFailedRef.current = true;
        setServiceState('error');
        setOnnxStatus('error');
        const detail = error?.message ? ` (${error.message.slice(0, 160)})` : '';
        setServiceError(`The local alphabet model could not be loaded. Hand tracking is active, but translation is paused.${detail}`);
        resetPrediction();
      }
    } finally {
      busyRef.current = false;
    }
  };

  /**
   * Mode 2: Word-Only Sequence Prediction using wlasl100_gru_25class.onnx
   * Implements strict multi-gate commitment protection:
   *   1. Hand Presence: >= 10 of 16 frames must contain tracked hands
   *   2. Motion Energy: >= 0.012 to prevent static/resting hand false positives
   *   3. Thresholds: Confidence >= 0.72 and Margin >= 0.18
   *   4. Stability Streak: Must hold candidate for >= 2 consecutive evaluations
   *   5. Re-Arm State Machine: Prevents repeated commits of the same held sign
   */
  const predictWords = async (buffer, version, now) => {
    if (busyRef.current) return;
    if (now < swipeSuppressionRef.current) return;

    if (!buffer.isFull()) {
      setStatusMessage(`Buffering sign motion (${buffer.length}/16 frames)…`);
      setRecognitionState('transitioning');
      setDiagInfo((prev) => ({
        ...prev,
        frameId: frameIdRef.current,
        handsCount: handsRef.current,
        rawDetectorCount: lastHandsInfoRef.current.rawCount,
        leftHandDetected: lastHandsInfoRef.current.left,
        rightHandDetected: lastHandsInfoRef.current.right,
        poseDetected: lastHandsInfoRef.current.pose,
        wordBufferFrames: buffer.length,
        validHandFrames: buffer.getValidHandFramesCount(),
        motionEnergy: buffer.getMotionEnergy(),
        state: `Buffering (${buffer.length}/16)`,
        rejectionReason: `Filling Sequence Buffer (${buffer.length}/16 frames)`,
        isAccepted: false,
      }));
      return;
    }

    // 1. Hand Presence Gate: At least 10 of the 16 frames must contain actual hand detections
    const validHandFrames = buffer.getValidHandFramesCount();
    if (validHandFrames < 10) {
      setStatusMessage('Awaiting sign motion (Incomplete hand tracking in buffer)');
      setRecognitionState('uncertain');
      setDiagInfo((prev) => ({
        ...prev,
        frameId: frameIdRef.current,
        handsCount: handsRef.current,
        rawDetectorCount: lastHandsInfoRef.current.rawCount,
        leftHandDetected: lastHandsInfoRef.current.left,
        rightHandDetected: lastHandsInfoRef.current.right,
        poseDetected: lastHandsInfoRef.current.pose,
        state: 'Incomplete Sequence',
        rejectionReason: `Insufficient Hand Presence (${validHandFrames}/16 < 10 frames)`,
        validHandFrames,
        wordBufferFrames: buffer.length,
        isAccepted: false,
      }));
      return;
    }

    // 2. Motion Energy Gate: Hands must be actively performing a sign, not stationary/resting
    const motionEnergy = buffer.getMotionEnergy();
    const isStationary = motionEnergy < 0.012;
    if (isStationary) {
      // Re-arm when hands have settled to rest for >= 600ms
      if (!wordStabilityRef.current.armed && now - wordStabilityRef.current.lastCommitTime > 600) {
        wordStabilityRef.current.armed = true;
      }
      setStatusMessage('Hands at rest · Awaiting signing motion');
      setRecognitionState('standby');
      setDiagInfo((prev) => ({
        ...prev,
        frameId: frameIdRef.current,
        handsCount: handsRef.current,
        rawDetectorCount: lastHandsInfoRef.current.rawCount,
        leftHandDetected: lastHandsInfoRef.current.left,
        rightHandDetected: lastHandsInfoRef.current.right,
        poseDetected: lastHandsInfoRef.current.pose,
        state: 'Stationary Hands',
        rejectionReason: `Stationary Hands (Motion ${motionEnergy.toFixed(4)} < 0.012)`,
        validHandFrames,
        motionEnergy,
        wordBufferFrames: buffer.length,
        isAccepted: false,
        isArmed: wordStabilityRef.current.armed,
      }));
      return;
    }

    // Evaluate on a 4-frame stride (~264 ms cadence)
    if (wordSampleCounterRef.current % 4 !== 0) {
      setDiagInfo((prev) => ({
        ...prev,
        frameId: frameIdRef.current,
        handsCount: handsRef.current,
        rawDetectorCount: lastHandsInfoRef.current.rawCount,
        leftHandDetected: lastHandsInfoRef.current.left,
        rightHandDetected: lastHandsInfoRef.current.right,
        poseDetected: lastHandsInfoRef.current.pose,
        wordBufferFrames: buffer.length,
        validHandFrames,
        motionEnergy,
      }));
      return;
    }

    busyRef.current = true;
    try {
      const wordRes = await inferWordSequence(buffer.getTensorData(), {
        minConfidence: 0.72,
        minMargin: 0.18,
      });
      if (version !== versionRef.current) return;

      const topCand = wordRes.topWord;
      const candConf = wordRes.confidence;
      const candMargin = wordRes.margin;
      const meetsThresholds = wordRes.isAccepted;

      setLatency(`${Math.round(wordRes.latencyMs || 0)}ms`);
      setConf(candConf);

      // Update Top-3 Suggestions Strip
      setTopSuggestions(wordRes.top3.map((item) => ({
        label: item.label,
        score: item.score,
        isAccepted: item.score >= 0.72 && candMargin >= 0.18,
      })));

      // Stability Streak Logic
      const stability = wordStabilityRef.current;
      if (meetsThresholds) {
        if (topCand === stability.candidate) {
          stability.count += 1;
        } else {
          stability.candidate = topCand;
          stability.count = 1;
        }
      } else {
        stability.count = Math.max(0, stability.count - 1);
        if (stability.count === 0 && !stability.armed && now - stability.lastCommitTime > 600) {
          stability.armed = true;
        }
      }

      const isStable = stability.count >= 2;
      const isArmed = stability.armed;
      const canCommit = meetsThresholds && isStable && isArmed;

      let subState = 'Evaluating Sequence';
      let rejectionReason = 'None (Accepted)';

      if (!meetsThresholds) {
        subState = 'Uncertain';
        rejectionReason = candConf < 0.72
          ? `Low Confidence (${(candConf * 100).toFixed(1)}% < 72%)`
          : `Ambiguous Margin (${(candMargin * 100).toFixed(1)}% < 18%)`;
      } else if (!isStable) {
        subState = 'Stabilizing';
        rejectionReason = `Awaiting Stability Streak (${stability.count}/2 evaluations)`;
      } else if (!isArmed) {
        subState = 'Holding (Awaiting Release)';
        rejectionReason = `Disarmed · Release sign before re-signing ${stability.lastCommitted}`;
      }

      setDiagInfo((prev) => ({
        ...prev,
        engine: 'ONNX Runtime Web (WASM)',
        modelName: 'wlasl100_gru_25class.onnx',
        activeMode: 'Words (WLASL25)',
        frameId: frameIdRef.current,
        topLetter: topCand,
        confidence: candConf,
        top2Conf: wordRes.top5[1]?.score || 0,
        margin: candMargin,
        delProb: 0,
        mProb: 0,
        nProb: 0,
        stableCount: stability.count,
        isAccepted: canCommit,
        state: canCommit ? 'Committed' : subState,
        rejectionReason,
        top5: wordRes.top5,
        landmarkQuality: `Dual-Hand Tracking (${handsRef.current} hand${handsRef.current === 1 ? '' : 's'})`,
        fingerMotion: motionEnergy,
        wordBufferFrames: buffer.length,
        validHandFrames,
        motionEnergy,
        handsCount: handsRef.current,
        rawDetectorCount: lastHandsInfoRef.current.rawCount,
        leftHandDetected: lastHandsInfoRef.current.left,
        rightHandDetected: lastHandsInfoRef.current.right,
        leftHandConf: lastHandsInfoRef.current.leftConf,
        rightHandConf: lastHandsInfoRef.current.rightConf,
        poseDetected: lastHandsInfoRef.current.pose,
        tensorShape: '[1, 16, 147]',
        latencyMs: wordRes.latencyMs,
        isArmed,
        lastCommittedWord: stability.lastCommitted || '–',
        timeSinceCommitMs: stability.lastCommitTime ? Math.round(now - stability.lastCommitTime) : null,
        swipeInfo: swipeDetectorRef.current?.getDiagnostics(),
      }));

      if (canCommit) {
        stability.armed = false; // Disarm until hands release or return to rest
        stability.lastCommitted = topCand;
        stability.lastCommitTime = now;
        stability.count = 0;
        alphabetLockoutUntilRef.current = now + DEFAULT_WORD_THRESHOLDS.LOCKOUT_MS;

        // Auto word spacing: commit discrete word to words array
        setWords((prev) => [...prev, topCand]);
        speak(topCand);
        setSpeaking(true);
        setTimeout(() => setSpeaking(false), 1200);

        setGesture(topCand);
        setRecognitionState('committed');
        setStatusMessage(`Recognized word: ${topCand}`);

        logSessionPrediction({
          label: topCand,
          confidence: candConf,
          latencyMs: wordRes.latencyMs,
          handsCount: handsRef.current || 1,
          status: 'committed',
        });

        // Reset buffer after commitment so next sign starts from a clean baseline
        buffer.reset();
      } else if (meetsThresholds) {
        setGesture(topCand);
        setRecognitionState('transitioning');
        setStatusMessage(`Confirming word: ${topCand} (${(candConf * 100).toFixed(0)}%)…`);
      } else {
        setGesture(topCand);
        setRecognitionState('uncertain');
        setStatusMessage(`Word candidate: ${topCand} (${(candConf * 100).toFixed(0)}%)`);
      }
    } catch (err) {
      console.warn('Word sequence evaluation error:', err);
    } finally {
      busyRef.current = false;
    }
  };

  /**
   * Mode 3: Intelligent Hybrid Arbitration (Motion Energy Gating + Lockout Window)
   */
  const predictHybrid = async (frames, secondaryFrames, buffer, version, now, frameTimes) => {
    if (busyRef.current) return;
    if (now < swipeSuppressionRef.current) return;

    // 1. Commitment Lockout Window: 750 ms silence after a word commitment
    const isLockedOut = now < alphabetLockoutUntilRef.current;

    // 2. Motion Energy Arbitration
    const motion = computeWindowMotion(frames);
    const motionEnergy = buffer.getMotionEnergy();
    const isDynamicMotion = motion.isMoving || motionEnergy > 0.035;

    if (isDynamicMotion || isLockedOut) {
      // Dynamic hand movement: route to Word Sequence Engine
      if (!isLockedOut && buffer.isFull() && wordSampleCounterRef.current % 4 === 0) {
        busyRef.current = true;
        try {
          const wordRes = await inferWordSequence(buffer.getTensorData(), {
            minConfidence: 0.70, // Stricter threshold for hybrid arbitration
            minMargin: 0.20,
          });
          if (version !== versionRef.current) return;

          const topCand = wordRes.topWord;
          const candConf = wordRes.confidence;
          const candMargin = wordRes.margin;
          const isAccepted = wordRes.isAccepted;

          setLatency(`${Math.round(wordRes.latencyMs || 0)}ms`);
          setConf(candConf);

          setTopSuggestions(wordRes.top3.map((item) => ({
            label: item.label,
            score: item.score,
            isAccepted: item.score >= 0.70 && candMargin >= 0.20,
          })));

          setDiagInfo((prev) => ({
            ...prev,
            engine: 'Hybrid Arbiter -> Word GRU',
            modelName: 'wlasl100_gru_25class.onnx',
            activeMode: 'Hybrid (Dynamic Word)',
            topLetter: topCand,
            confidence: candConf,
            top2Conf: wordRes.top5[1]?.score || 0,
            margin: candMargin,
            delProb: 0,
            mProb: 0,
            nProb: 0,
            stableCount: buffer.length,
            isAccepted,
            state: isAccepted ? 'Committed (Word)' : 'Dynamic Motion (Evaluating Word)',
            rejectionReason: isAccepted ? 'None (Accepted)' : 'Hybrid Dynamic Motion Gate',
            top5: wordRes.top5,
            landmarkQuality: `Dual-Hand Tracking (${handsRef.current} hand${handsRef.current === 1 ? '' : 's'})`,
            fingerMotion: motionEnergy,
            wordBufferFrames: buffer.length,
            motionEnergy,
            swipeInfo: swipeDetectorRef.current?.getDiagnostics(),
          }));

          if (isAccepted) {
            const isDuplicate = topCand === lastCommittedWordRef.current;
            const inCooldown = now - lastWordCommitTimeRef.current < DEFAULT_WORD_THRESHOLDS.DUPLICATE_COOLDOWN_MS;

            if (!isDuplicate || !inCooldown) {
              lastCommittedWordRef.current = topCand;
              lastWordCommitTimeRef.current = now;
              alphabetLockoutUntilRef.current = now + DEFAULT_WORD_THRESHOLDS.LOCKOUT_MS;

              // If characters were spelled, flush them first, then append word
              if (recRef.current.trim()) {
                const flushed = recRef.current.trim();
                recRef.current = '';
                setRec('');
                setWords((prev) => [...prev, flushed, topCand]);
              } else {
                setWords((prev) => [...prev, topCand]);
              }

              speak(topCand);
              setSpeaking(true);
              setTimeout(() => setSpeaking(false), 1200);

              setGesture(topCand);
              setRecognitionState('committed');
              setStatusMessage(`Hybrid: Committed word ${topCand}`);
              buffer.reset();
            }
          }
        } catch (err) {
          console.warn('Hybrid word error:', err);
        } finally {
          busyRef.current = false;
        }
      } else {
        setStatusMessage('Dynamic signing motion – Word Engine tracking…');
        setRecognitionState('transitioning');
      }
    } else {
      // 3. Static Posture: Route to Alphabet Fingerspelling Engine
      await predict(frames, secondaryFrames, version, frameTimes);
    }
  };

  /**
   * Mode change handler with buffer clearance and lazy pre-warming
   */
  const handleModeChange = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    clearIdle();
    resetPrediction(true);
    overlayRef.current?.draw([], 0);
    wordBufferRef.current?.reset();
    wordStabilityRef.current = { candidate: '', count: 0, armed: true, lastCommitted: '', lastCommitTime: 0 };
    lastCommittedWordRef.current = '';
    lastWordCommitTimeRef.current = 0;
    alphabetLockoutUntilRef.current = 0;
    setGesture('');
    setTopSuggestions([]);

    if (newMode === 'words' || newMode === 'hybrid') {
      if (!wordModelLoadedRef.current) {
        loadWordSession()
          .then(() => { wordModelLoadedRef.current = true; })
          .catch((err) => console.warn('Word model lazy preload:', err));
        loadWordLabels().catch((err) => console.warn('Word labels lazy preload:', err));
      }
    }
  };

  /**
   * Clicking a suggestion pill immediately inserts/commits that sign
   */
  const handleInsertSuggestion = (label) => {
    if (!label || label === '–' || label === 'UNKNOWN') return;
    clearIdle();
    if (/^[A-Z]$/.test(label)) {
      recRef.current += label;
      setRec(recRef.current);
      setStatusMessage(`Inserted letter: ${label}`);
    } else {
      setWords((prev) => [...prev, label]);
      speak(label);
      setSpeaking(true);
      setTimeout(() => setSpeaking(false), 1200);
      setStatusMessage(`Inserted word: ${label}`);
      wordBufferRef.current?.reset();
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
    landmarkFiltersRef.current.Left.reset();
    landmarkFiltersRef.current.Right.reset();
    lastHandsInfoRef.current = { left: false, right: false, pose: false, leftConf: 0, rightConf: 0, rawCount: 0 };
    wordStabilityRef.current = { candidate: '', count: 0, armed: true, lastCommitted: '', lastCommitTime: 0 };
    overlayRef.current?.draw([], 0);
    swipeDetectorRef.current?.reset();
    swipeSuppressionRef.current = 0;
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
    try {
      poseLandmarkerRef.current?.close();
    } catch {
      /* already closed */
    }
    poseLandmarkerRef.current = null;
    wordBufferRef.current?.reset();
    lastCommittedWordRef.current = '';
    lastWordCommitTimeRef.current = 0;
    alphabetLockoutUntilRef.current = 0;
    setTopSuggestions([]);
  };

  const startDemo = () => {
    stopRun();
    setDemoMode(true);
    setCamError(false);
    setRun(true);
    setServiceState('local');
    setOnnxStatus('ready');
    setServiceError('');
    setHands(mode === 'words' ? 2 : 1);
    setFps(30);
    setLatency('0ms');
    const isWordMode = mode === 'words' || mode === 'hybrid';
    const demoItems = isWordMode ? ['BOOK', 'FAMILY', 'HELP', 'YES', 'SCHOOL'] : ['A', 'B', 'C', 'L', 'O'];
    let index = 0;
    const show = () => {
      const next = demoItems[index % demoItems.length];
      index += 1;
      setGesture(next);
      setConf(0.98);
      if (isWordMode) {
        setWords((prev) => [...prev, next]);
        setTopSuggestions([
          { label: next, score: 0.98, isAccepted: true },
          { label: 'WORK', score: 0.015, isAccepted: false },
          { label: 'WANT', score: 0.005, isAccepted: false },
        ]);
      } else {
        setRec(next);
        setTopSuggestions([
          { label: next, score: 0.98, isAccepted: true },
          { label: 'M', score: 0.015, isAccepted: false },
          { label: 'S', score: 0.005, isAccepted: false },
        ]);
      }
      logSessionPrediction({
        label: next,
        confidence: 0.98,
        latencyMs: 12,
        handsCount: isWordMode ? 2 : 1,
        status: 'committed',
      });
    };
    show();
    demoTimerRef.current = setInterval(show, 1800);
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
    setOnnxStatus('ready');
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
        numHands: 2,
        minHandDetectionConfidence: 0.50,
        minHandPresenceConfidence: 0.50,
        minTrackingConfidence: 0.50,
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
    setServiceState('local');
    wordLabelsRef.current = new Set();

    // 1. Asynchronously probe backend status (informational only; never blocks pipeline)
    probeBackend();

    // 2. Ensure local ONNX landmark engine is active
    if (onnxStatus !== 'ready') {
      setOnnxStatus('loading');
      loadLandmarkSession()
        .then(() => setOnnxStatus('ready'))
        .catch((err) => {
          console.warn('Pre-warming local ONNX model error:', err);
          setOnnxStatus('error');
        });
    }

    if (mode === 'words' || mode === 'hybrid') {
      loadWordSession().catch(() => {});
      loadWordLabels().catch(() => {});
    }

    // 3. Start Camera & MediaPipe (with dual-hand and optional pose landmarker support)
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
        numHands: 2,
        minHandDetectionConfidence: 0.50,
        minHandPresenceConfidence: 0.50,
        minTrackingConfidence: 0.50,
      });

      let poseLandmarker = null;
      try {
        const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/models/mediapipe/pose_landmarker.task' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.4,
          minPosePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
      } catch (poseErr) {
        console.info('PoseLandmarker initialization skipped (using geometric torso fallback):', poseErr.message);
      }

      if (version !== versionRef.current) {
        landmarker.close();
        poseLandmarker?.close();
        return;
      }
      landmarkerRef.current = landmarker;
      poseLandmarkerRef.current = poseLandmarker;
      setCamOn(true);
      setTrackerReady(true);
    } catch (error) {
      setServiceError(error.message || 'Unable to start camera. Please ensure webcam permissions are enabled.');
      setCamError(true);
    }
  };

  useEffect(() => {
    if (!run || !trackerReady || !camOn || serviceState === 'idle' || localModelFailedRef.current) {
      return undefined;
    }
    let raf, frames = 0, elapsed = 0, previous = performance.now();
    const loop = (now) => {
      const video = videoRef.current, landmarker = landmarkerRef.current;
      if (video?.readyState >= 2 && landmarker && now - lastDetectRef.current >= DETECT_INTERVAL_MS) {
        lastDetectRef.current = now;
        frameIdRef.current += 1;
        const currentFrameId = frameIdRef.current;

        const result = landmarker.detectForVideo(video, now);
        const sourceWidth = video.videoWidth || 640;
        const sourceHeight = video.videoHeight || 480;
        const rawLandmarksList = result.landmarks || [];
        const rawCount = rawLandmarksList.length;

        // Early upper-body pose detection: anchors + facial reference (Nose)
        let poseLms = null;
        let nosePt = null;
        if (poseLandmarkerRef.current) {
          try {
            const poseRes = poseLandmarkerRef.current.detectForVideo(video, now);
            if (poseRes?.landmarks?.[0]) {
              poseLms = poseRes.landmarks[0];
              nosePt = poseLms[0];
            }
          } catch {
            // fallback
          }
        }

        // Geometric Facial False-Positive Filtering:
        // When hands are at rest or out of view, MediaPipe can falsely trigger on the mouth/lips.
        // False positives on the lips have tiny palm span (< 0.045) and lie directly on the nose (< 0.10)
        // with low confidence (< 0.55).
        // Real signs near the face (DEAF, MOTHER, WOMAN) have full forearm/palm span (> 0.06) or high confidence.
        const detected = [];
        for (let index = 0; index < rawLandmarksList.length; index++) {
          const rawLandmarks = rawLandmarksList[index];
          const handednessCategory = result.handedness?.[index]?.[0]?.categoryName || (index === 0 ? 'Right' : 'Left');
          const score = result.handedness?.[index]?.[0]?.score || 0;

          const wrist = rawLandmarks[0];
          const middleMcp = rawLandmarks[9];
          const palmSpan = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y);

          let isFacialFalsePositive = false;
          if (nosePt) {
            const distToNose = Math.hypot(wrist.x - nosePt.x, wrist.y - nosePt.y);
            if (distToNose < 0.10 && palmSpan < 0.045 && score < 0.55) {
              isFacialFalsePositive = true;
            }
          }

          if (isFacialFalsePositive) {
            continue; // Suppress mouth/lips false-positive detection
          }

          const isLeft = handednessCategory.toLowerCase() === 'left';
          const filterKey = isLeft ? 'Left' : 'Right';
          const landmarks = landmarkFiltersRef.current[filterKey].filter(rawLandmarks, sourceWidth, sourceHeight, now);

          detected.push({
            landmarks,
            bbox: bboxOf(landmarks),
            score,
            name: handednessCategory,
            isLeftHand: isLeft,
            gesture: 'TRACKED',
            confidence: score,
          });
        }

        if (detected.length !== handsRef.current) {
          handsRef.current = detected.length;
          setHands(detected.length);
        }

        if (!detected.length) {
          // Synchronously clear canvas overlay with frame ID alignment
          overlayRef.current?.draw([], currentFrameId);
          primaryRef.current = null;
          framesRef.current = [];
          secFramesRef.current = [];
          frameTimesRef.current = [];
          landmarkFiltersRef.current.Left.reset();
          landmarkFiltersRef.current.Right.reset();
          lastHandsInfoRef.current = {
            left: false,
            right: false,
            pose: Boolean(poseLms),
            rawCount,
            leftConf: 0,
            rightConf: 0,
          };
          swipeDetectorRef.current?.reset();
          wordBufferRef.current.reset();
          wordStabilityRef.current.armed = true; // Re-arm word engine when signer lowers hands
          resetPrediction(true);

          setDiagInfo((prev) => ({
            ...prev,
            frameId: currentFrameId,
            handsCount: 0,
            rawDetectorCount: rawCount,
            leftHandDetected: false,
            rightHandDetected: false,
            poseDetected: Boolean(poseLms),
            validHandFrames: 0,
            wordBufferFrames: 0,
            motionEnergy: 0,
            state: 'No Hands Detected',
            rejectionReason: 'No Hands in Frame',
            isAccepted: false,
            isArmed: true,
          }));
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
          primaryRef.current = {
            ...primary.landmarks[0],
            isLeftHand: primary.isLeftHand,
          };

          // Distinct per-hand gesture tagging
          primary.gesture = recognizedLabelRef.current || 'HAND';
          primary.confidence = recognizedLabelRef.current ? recognizedConfidenceRef.current : primary.score;
          if (secondary) {
            if (modeRef.current === 'words' && recognizedLabelRef.current) {
              secondary.gesture = recognizedLabelRef.current;
              secondary.confidence = recognizedConfidenceRef.current;
            } else {
              secondary.gesture = 'TRACKED';
              secondary.confidence = secondary.score;
            }
          }
          overlayRef.current?.draw(detected, currentFrameId);

          // Real-Time Horizontal Left-Swipe Gesture Detector (Unified across all 3 modes)
          const swipeResult = swipeDetectorRef.current.update(primary.landmarks, now, mirrorRef.current);
          if (swipeResult.triggered) {
            const currentMode = modeRef.current;
            if (currentMode === 'words') {
              // In Words Mode: delete the entire last committed word
              setWords((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
              setStatusMessage('Deleted last word (Swipe Left)');
            } else if (currentMode === 'hybrid') {
              // In Hybrid Mode: delete in-progress character if present, else last committed word
              if (recRef.current.length > 0) {
                recRef.current = recRef.current.slice(0, -1);
                setRec(recRef.current);
                setStatusMessage('Deleted last character (Swipe Left)');
              } else {
                setWords((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
                setStatusMessage('Deleted last word (Swipe Left)');
              }
            } else {
              // In Alphabet Mode: delete exactly one character from the active sentence buffer
              if (recRef.current.length > 0) {
                recRef.current = recRef.current.slice(0, -1);
                setRec(recRef.current);
              }
              setStatusMessage('Deleted last character (Swipe Left)');
            }

            // Suppress accidental alphabet/word predictions during/after the swipe
            stateRef.current.candidate = '';
            stateRef.current.count = 0;
            lastUiLabelRef.current = '';
            setGesture('⌫');
            setRecognitionState('committed');
            swipeSuppressionRef.current = now + 450;
            wordBufferRef.current.reset();
            setDiagInfo((prev) => ({
              ...prev,
              swipeInfo: swipeResult,
            }));
          }

          if (now - lastSampleRef.current >= SAMPLE_MS) {
            lastSampleRef.current = now;
            framesRef.current = [...framesRef.current, toHand(primary.landmarks)].slice(-WINDOW);
            secFramesRef.current = secondary ? [...secFramesRef.current, toHand(secondary.landmarks)].slice(-WINDOW) : [];
            frameTimesRef.current = [...frameTimesRef.current, now].slice(-WINDOW);

            // Canonical WLASL 147D Slot Assignment:
            // In WLASL training data:
            //   Slot 1 (indices 0..62, presence mask 126): Camera-left hand (smaller x, signer's dominant hand)
            //   Slot 2 (indices 63..125, presence mask 127): Camera-right hand (larger x, signer's non-dominant hand)
            let leftHandLms = null;
            let rightHandLms = null;
            let leftConf = 0;
            let rightConf = 0;

            if (detected.length >= 2) {
              const sorted = [...detected].sort((a, b) => a.landmarks[0].x - b.landmarks[0].x);
              leftHandLms = sorted[0].landmarks;  // Camera-left (lower x) -> Slot 1
              rightHandLms = sorted[1].landmarks; // Camera-right (higher x) -> Slot 2
              leftConf = sorted[0].score;
              rightConf = sorted[1].score;
            } else if (detected.length === 1) {
              // Single active hand -> Slot 1 (canonical training representation for 1-hand signs)
              leftHandLms = primary.landmarks;
              rightHandLms = null;
              leftConf = primary.score;
              rightConf = 0;
            }

            lastHandsInfoRef.current = {
              left: Boolean(leftHandLms),
              right: Boolean(rightHandLms),
              pose: Boolean(poseLms),
              rawCount,
              leftConf,
              rightConf,
            };

            // Push 147D vector to word buffer
            const wordVec = extractWordFeatures(leftHandLms, rightHandLms, poseLms);
            wordBufferRef.current.push(wordVec, primary.landmarks[0]);
            wordSampleCounterRef.current += 1;

            const activeMode = modeRef.current;
            if (activeMode === 'alphabet') {
              if (framesRef.current.length >= 8) {
                predict(framesRef.current, secFramesRef.current, versionRef.current, frameTimesRef.current);
              }
            } else if (activeMode === 'words') {
              predictWords(wordBufferRef.current, versionRef.current, now);
            } else if (activeMode === 'hybrid') {
              predictHybrid(framesRef.current, secFramesRef.current, wordBufferRef.current, versionRef.current, now, frameTimesRef.current);
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
  }, [run, trackerReady, camOn]);

  useEffect(() => {
    probeBackend();
    setOnnxStatus('loading');
    loadLandmarkSession()
      .then(() => setOnnxStatus('ready'))
      .catch((err) => {
        console.warn('Initial ONNX preload:', err);
        setOnnxStatus('standby');
      });
    return () => clearIdle();
  }, []);

  const letter = gesture || '–', waveSeed = letter.charCodeAt(0) || 45;

  return (
    <section id="demo" className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12 overflow-hidden">
      <Particles className="pointer-events-none absolute inset-0 z-0 opacity-35 dark:opacity-25" count={34} />
      <div className="relative z-10 mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Live Dual-Engine Recognition"
          title="Sign Language to Text"
          sub="Real-time dual-engine ASL translation: fingerspelling alphabet (A–Z) and 25-word vocabulary (WLASL) powered client-side by MediaPipe and ONNX Runtime Web (WASM)."
        />

        {/* Controls Bar */}
        <Reveal>
          <div className="mb-4 sm:mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2.5">
              {/* Badge 1: Browser ONNX */}
              <span className="glass-frosted inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-200 border border-white/12 shadow-md">
                <span
                  className={`h-2 w-2 rounded-full ${
                    onnxStatus === 'ready'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : onnxStatus === 'loading'
                        ? 'bg-amber-400 animate-pulse'
                        : onnxStatus === 'error'
                          ? 'bg-rose-400'
                          : 'bg-slate-500'
                  }`}
                />
                {onnxStatus === 'ready'
                  ? 'Browser ONNX Active'
                  : onnxStatus === 'loading'
                    ? 'Browser ONNX Loading…'
                    : onnxStatus === 'error'
                      ? 'Browser ONNX Error'
                      : 'Browser ONNX Standby'}
              </span>

              {/* Badge 2: MediaPipe */}
              <span className="glass-frosted inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-200 border border-white/12 shadow-md">
                <span
                  className={`h-2 w-2 rounded-full ${
                    trackerReady && run
                      ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                      : 'bg-slate-500'
                  }`}
                />
                {trackerReady && run ? 'MediaPipe Active' : 'MediaPipe Standby'}
              </span>

              {/* Badge 3: Camera */}
              <span className="glass-frosted inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-200 border border-white/12 shadow-md">
                <span
                  className={`h-2 w-2 rounded-full ${
                    camOn && run
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-slate-500'
                  }`}
                />
                {camOn && run ? 'Camera Live' : 'Camera Standby'}
              </span>

              {/* Badge 4: Backend Status */}
              <span className="glass-frosted inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-200 border border-white/12 shadow-md">
                <span
                  className={`h-2 w-2 rounded-full ${
                    backendStatus === 'available'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : backendStatus === 'checking'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-slate-500'
                  }`}
                />
                {backendStatus === 'available'
                  ? 'Backend Available'
                  : backendStatus === 'checking'
                    ? 'Backend Checking…'
                    : 'Backend Offline'}
              </span>
            </div>

            {/* Operating Mode Selector Pill Group */}
            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/80 p-1 shadow-lg backdrop-blur-xl">
              <span className="hidden sm:inline pl-2.5 pr-1 font-mono text-[9px] uppercase tracking-widest text-slate-400">
                Mode:
              </span>
              <button
                type="button"
                onClick={() => handleModeChange('alphabet')}
                className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all ${
                  mode === 'alphabet'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 font-bold text-slate-950 shadow-glow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Alphabet (A–Z)
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('words')}
                className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all ${
                  mode === 'words'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 font-bold text-slate-950 shadow-glow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Words (WLASL25)
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('hybrid')}
                className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all ${
                  mode === 'hybrid'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 font-bold text-slate-950 shadow-glow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hybrid (Auto)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => setMirror((value) => !value)}
                className="glass-card inline-flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/80 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-slate-200 hover:border-cyan-400/40 shadow-lg backdrop-blur-xl transition-all"
              >
                <FiRepeat /> Mirror {mirror ? 'On' : 'Off'}
              </button>
              <button
                type="button"
                onClick={() => setShowDiagnostics((prev) => !prev)}
                className={`glass-card inline-flex items-center gap-2 rounded-full border px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest shadow-lg backdrop-blur-xl transition-all ${showDiagnostics
                    ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                    : 'border-white/12 bg-slate-950/80 text-slate-200 hover:border-cyan-400/40'
                  }`}
                aria-pressed={showDiagnostics}
              >
                <FiSliders /> Diagnostics {showDiagnostics ? 'On' : 'Off'}
              </button>
              <a
                href="/sign_dictionary.html"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-emerald-400/40 bg-slate-950/80 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-emerald-300 hover:border-emerald-300 hover:bg-emerald-950/30 transition-all shadow-md inline-flex items-center gap-1.5"
                title="View animated visual dictionary of all 25 words"
              >
                <span>🎬 Learn 25 Signs</span>
              </a>
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
                  <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#00D9FF]/20 via-[#168BFF]/15 to-[#83E8F5]/10 border border-cyan-400/30 shadow-inner">
                    <span className="font-display text-4xl font-bold text-white">
                      {gesture || (statusMessage ? (statusMessage.startsWith('Transitioning') ? '⋯' : '?') : '–')}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">Committed Words</div>
                      {statusMessage && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${recognitionState === 'transitioning'
                            ? 'border border-amber-400/40 bg-amber-400/10 text-amber-300 animate-pulse'
                            : 'border border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
                          }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${recognitionState === 'transitioning' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                          {statusMessage}
                        </span>
                      )}
                    </div>
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

                {/* Words Mode Only: Dedicated Top-3 Word Candidates Strip */}
                {mode === 'words' && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${run ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                        <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-300 font-semibold">
                          Top Word Candidates
                        </span>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[8px] text-slate-400">
                        Threshold: ≥ 65% · Margin ≥ 15%
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {topSuggestions.length > 0 ? (
                        topSuggestions.map((item, idx) => (
                          <button
                            key={`${item.label}-${idx}`}
                            type="button"
                            onClick={() => handleInsertSuggestion(item.label)}
                            className={`group inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 font-mono text-xs transition-all ${
                              item.isAccepted
                                ? 'border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-[0_0_8px_rgba(52,211,153,0.3)] hover:bg-emerald-500/30'
                                : 'border border-cyan-400/30 bg-cyan-950/40 text-cyan-200 hover:border-cyan-300 hover:bg-cyan-900/50'
                            }`}
                            title={`Click to insert "${item.label}"`}
                          >
                            <span className="font-bold text-slate-400 group-hover:text-cyan-300">#{idx + 1}</span>
                            <span className="font-semibold text-white">{item.label}</span>
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-cyan-300">
                              {(item.score * 100).toFixed(0)}%
                            </span>
                            {item.isAccepted && (
                              <span className="rounded bg-emerald-400/30 px-1 text-[8px] font-bold text-emerald-200">
                                ✓ COMMIT
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <span className="font-mono text-[10px] text-slate-500 italic">
                          {run ? 'Sign motion buffered · Word candidates appear here' : 'Start camera to see live candidates'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Audio Waveform Stream */}
                <div className="mt-4 flex h-16 items-center justify-center gap-[3px] rounded-2xl border border-white/10 bg-white/[0.03] px-3">
                  {Array.from({ length: 40 }, (_, index) => (
                    <span
                      key={index}
                      className={`wave-bar w-[3px] rounded-full ${run ? 'bg-gradient-to-t from-cyan-400/70 to-violet-400/90' : 'bg-white/10'
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

              {/* Developer Diagnostics HUD */}
              {showDiagnostics && (
                <div className="mt-4 rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-3.5 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-300 font-bold">
                        Diagnostics HUD · Real-Time Telemetry
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-slate-400">
                      {diagInfo.engine}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left mb-2.5">
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Mode / Engine</div>
                      <div className="font-mono text-xs font-semibold text-cyan-200 truncate" title={diagInfo.modelName}>
                        {diagInfo.activeMode || 'Alphabet (A–Z)'}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">State / Buffer</div>
                      <div className={`font-mono text-xs font-semibold ${diagInfo.state.includes('Committed') || diagInfo.state === 'Stable'
                          ? 'text-emerald-400'
                          : diagInfo.state === 'Transitioning' || diagInfo.state.includes('Dynamic')
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }`}>
                        {diagInfo.state} ({mode === 'words' || mode === 'hybrid' ? `${diagInfo.wordBufferFrames || 0}/16f` : `${diagInfo.stableCount || 0}f`})
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Top-1 / Top-2</div>
                      <div className="font-mono text-xs font-semibold text-white">
                        {diagInfo.topLetter} ({(diagInfo.confidence * 100).toFixed(1)}%) / {((diagInfo.top2Conf || 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Top-2 Margin</div>
                      <div className="font-mono text-xs font-semibold text-cyan-300">
                        {(diagInfo.margin * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Target Sign Telemetry: DEL / M / N */}
                  <div className="grid grid-cols-3 gap-2 text-left mb-2.5">
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-2">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-rose-300">DEL Probability</div>
                      <div className="font-mono text-xs font-bold text-rose-200">
                        {((diagInfo.delProb || 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-2">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-amber-300">M Probability</div>
                      <div className="font-mono text-xs font-bold text-amber-200">
                        {((diagInfo.mProb || 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-2">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-sky-300">N Probability</div>
                      <div className="font-mono text-xs font-bold text-sky-200">
                        {((diagInfo.nProb || 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Multi-Hand & 147D Tensor Diagnostics */}
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-2.5 mb-2.5 text-left">
                    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${handsRef.current >= 2 ? 'bg-emerald-400' : handsRef.current === 1 ? 'bg-amber-400' : 'bg-slate-500'}`} />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-300 font-bold">
                          Dual-Hand & 147D Pipeline Telemetry · Frame #{diagInfo.frameId || 0}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-slate-400">
                        Tensor Shape: {diagInfo.tensorShape || '[1, 16, 147]'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left mb-1.5">
                      <div className="font-mono text-[9px] text-slate-300">
                        <span className="text-slate-400">Tracked Hands: </span>
                        <span className={`font-bold ${diagInfo.handsCount >= 2 ? 'text-emerald-300' : diagInfo.handsCount === 1 ? 'text-amber-300' : 'text-slate-400'}`}>
                          {diagInfo.handsCount || 0} / 2 (Raw: {diagInfo.rawDetectorCount || 0})
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-slate-300">
                        <span className="text-slate-400">Left Hand: </span>
                        <span className={`font-bold ${diagInfo.leftHandDetected ? 'text-emerald-300' : 'text-rose-400'}`}>
                          {diagInfo.leftHandDetected ? 'YES (Slot 0..62)' : 'MISSING (Mask=0)'}
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-slate-300">
                        <span className="text-slate-400">Right Hand: </span>
                        <span className={`font-bold ${diagInfo.rightHandDetected ? 'text-emerald-300' : 'text-rose-400'}`}>
                          {diagInfo.rightHandDetected ? 'YES (Slot 63..125)' : 'MISSING (Mask=0)'}
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-slate-300">
                        <span className="text-slate-400">Pose Anchors: </span>
                        <span className={`font-bold ${diagInfo.poseDetected ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {diagInfo.poseDetected ? 'YES (Slot 128..145)' : 'MISSING (Torso Fallback)'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left text-[9px] font-mono text-slate-300">
                      <div>
                        <span className="text-slate-400">Sequence Buffer: </span>
                        <span className="font-bold text-cyan-200">
                          {diagInfo.wordBufferFrames || 0} / 16 (Valid: {diagInfo.validHandFrames || 0}/16)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Motion Energy: </span>
                        <span className={`font-bold ${diagInfo.motionEnergy >= 0.012 ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {typeof diagInfo.motionEnergy === 'number' ? diagInfo.motionEnergy.toFixed(4) : '0.0000'} (Gate ≥ 0.012)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Stability Streak: </span>
                        <span className={`font-bold ${diagInfo.stableCount >= 2 ? 'text-emerald-300' : 'text-cyan-200'}`}>
                          {diagInfo.stableCount || 0} / 2 ({diagInfo.isArmed ? 'ARMED' : 'DISARMED'})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Last Committed: </span>
                        <span className="font-bold text-white">
                          {diagInfo.lastCommittedWord || '–'} {diagInfo.timeSinceCommitMs ? `(${Math.round(diagInfo.timeSinceCommitMs / 1000)}s ago)` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Motion Swipe-to-Delete Telemetry */}
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-2.5 mb-2.5">
                    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          diagInfo.swipeInfo?.status === 'TRIGGERED'
                            ? 'bg-rose-400 animate-ping'
                            : diagInfo.swipeInfo?.status === 'ARMED'
                            ? 'bg-emerald-400'
                            : 'bg-amber-400'
                        }`} />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-300 font-bold">
                          Motion Gesture · Swipe-to-Delete
                        </span>
                      </div>
                      <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        diagInfo.swipeInfo?.status === 'TRIGGERED'
                          ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40 animate-pulse'
                          : diagInfo.swipeInfo?.status === 'COOLDOWN' || diagInfo.swipeInfo?.status === 'SETTLING'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : diagInfo.swipeInfo?.status === 'ARMED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700/30 text-slate-400'
                      }`}>
                        {diagInfo.swipeInfo?.status || 'IDLE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left mb-1.5">
                      <div className="font-mono text-[9px] text-slate-300">
                        <span className="text-slate-400">Direction: </span>
                        <span className="font-bold text-cyan-200">{diagInfo.swipeInfo?.direction || 'NONE'}</span>
                      </div>
                      <div className="font-mono text-[9px] text-slate-300">
                        <span className="text-slate-400">Displacement: </span>
                        <span className="font-bold text-cyan-200">
                          {typeof diagInfo.swipeInfo?.normDeltaX === 'number'
                            ? `${diagInfo.swipeInfo.normDeltaX.toFixed(2)} p`
                            : '0.00 p'}
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-slate-300">
                        <span className="text-slate-400">Velocity: </span>
                        <span className="font-bold text-cyan-200">
                          {typeof diagInfo.swipeInfo?.velocity === 'number'
                            ? `${diagInfo.swipeInfo.velocity.toFixed(2)} p/s`
                            : '0.00 p/s'}
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-slate-300">
                        <span className="text-slate-400">Cooldown: </span>
                        <span className="font-bold text-cyan-200">{diagInfo.swipeInfo?.inCooldown ? 'ACTIVE' : 'READY'}</span>
                      </div>
                    </div>

                    <div className="font-mono text-[9px] text-slate-400 truncate">
                      <span className="text-slate-500">Reason: </span>
                      <span className="text-cyan-200/90">{diagInfo.swipeInfo?.reason || 'Awaiting gesture'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] text-slate-400">
                      Policy Status:
                    </span>
                    <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${diagInfo.isAccepted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                      {diagInfo.isAccepted ? 'Accepted by Policy' : 'Rejected / Suppressed'}
                    </span>
                  </div>

                  {diagInfo.rejectionReason && diagInfo.rejectionReason !== 'None (Accepted)' && (
                    <div className="mb-2.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-left font-mono text-[10px] text-amber-200">
                      <span className="font-bold text-amber-300">Filtered: </span>{diagInfo.rejectionReason}
                    </div>
                  )}

                  {diagInfo.top5 && diagInfo.top5.length > 0 && (
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400 mb-1.5 text-left">
                        Top Predictions Distribution:
                      </div>
                      <div className="space-y-1">
                        {diagInfo.top5.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 font-mono text-[10px]">
                            <span className="w-5 font-bold text-cyan-300 text-left">{item.label}</span>
                            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-cyan-400"
                                style={{ width: `${Math.min(100, Math.max(0, item.score * 100))}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-slate-300">{(item.score * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-white/10 flex justify-between items-center font-mono text-[9px] text-slate-400">
                    <span>{diagInfo.landmarkQuality}</span>
                    <span>Motion: {typeof diagInfo.fingerMotion === 'number' ? diagInfo.fingerMotion.toFixed(3) : '–'}</span>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.3}>
          <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Client-Side Architecture · MediaPipe Hand Tracking + ONNX Runtime Web (WASM) · alphabet_landmark_model.onnx
          </p>
        </Reveal>
      </div>
    </section>
  );
}
