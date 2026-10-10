import React, { useState, useEffect, useMemo } from 'react';
import offlineReport from '../lib/offlineValidationReport.json';
import { useRouter } from '../context/RouterContext.jsx';
import {
  FiArrowLeft,
  FiCamera,
  FiActivity,
  FiCpu,
  FiCheckCircle,
  FiAlertCircle,
  FiLayers,
  FiHelpCircle,
  FiClock,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';

const API_BASE = import.meta.env.VITE_AI_API_BASE || '/api/v1/ai';

export default function AnalyticsPage() {
  const { navigate } = useRouter();

  // Scroll to top on mount
  useEffect(() => {
    document.title = 'Analyst Dashboard — SignSpeak AI';
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 1. Live Session Telemetry (source: sessionStorage signspeak_live_session)
  // ─────────────────────────────────────────────────────────────
  const [sessionRecords, setSessionRecords] = useState([]);

  useEffect(() => {
    const readSession = () => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const raw = window.sessionStorage.getItem('signspeak_live_session');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setSessionRecords(parsed);
              return;
            }
          }
        }
      } catch {
        /* ignore storage read error */
      }
      setSessionRecords([]);
    };

    readSession();
    const interval = setInterval(readSession, 1200);
    window.addEventListener('storage', readSession);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', readSession);
    };
  }, []);

  const hasSession = sessionRecords.length > 0;

  // Live session computed KPI metrics
  const sessionStats = useMemo(() => {
    if (!hasSession) {
      return {
        totalPredictions: 0,
        committedCount: 0,
        rejectedCount: 0,
        avgConfidence: null,
        avgLatencyMs: null,
        latestHands: 0,
        latestPrediction: null,
        letterCounts: {},
      };
    }

    let sumConf = 0;
    let sumLatency = 0;
    const letterCounts = {};
    let committedCount = 0;
    let rejectedCount = 0;

    sessionRecords.forEach((item) => {
      sumConf += item.confidence || 0;
      sumLatency += item.latencyMs || 0;
      if (item.status === 'committed') committedCount++;
      else rejectedCount++;

      const l = (item.label || '').toUpperCase();
      if (/^[A-Z]$/.test(l)) {
        letterCounts[l] = (letterCounts[l] || 0) + 1;
      }
    });

    const latest = sessionRecords[sessionRecords.length - 1];

    return {
      totalPredictions: sessionRecords.length,
      committedCount,
      rejectedCount,
      avgConfidence: (sumConf / sessionRecords.length) * 100,
      avgLatencyMs: Math.round(sumLatency / sessionRecords.length),
      latestHands: latest?.handsCount || 1,
      latestPrediction: latest,
      letterCounts,
    };
  }, [sessionRecords, hasSession]);

  // ─────────────────────────────────────────────────────────────
  // 2. Model Status API (/api/v1/ai/model-status)
  // ─────────────────────────────────────────────────────────────
  const [modelStatus, setModelStatus] = useState({
    loading: true,
    online: false,
    engine: null,
    labelsCount: null,
    windowSize: 12,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchModelStatus() {
      try {
        const res = await fetch(`${API_BASE}/model-status`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (isMounted) {
          if (data?.success && data?.data) {
            setModelStatus({
              loading: false,
              online: true,
              engine: data.data.engine || 'tensorflow',
              labelsCount: Array.isArray(data.data.labels) ? data.data.labels.length : 26,
              windowSize: data.data.window_size || 12,
              error: null,
            });
          } else {
            setModelStatus({
              loading: false,
              online: false,
              engine: null,
              labelsCount: null,
              windowSize: 12,
              error: data?.error?.message || 'Model service offline',
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          setModelStatus({
            loading: false,
            online: false,
            engine: null,
            labelsCount: null,
            windowSize: 12,
            error: 'Model service offline',
          });
        }
      }
    }

    fetchModelStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 3. Offline Validation Selected Tile State
  // ─────────────────────────────────────────────────────────────
  const [selectedClassLabel, setSelectedClassLabel] = useState('N');

  const selectedClassInfo = useMemo(() => {
    return (
      offlineReport.perClass.find((c) => c.label === selectedClassLabel) ||
      offlineReport.perClass[0]
    );
  }, [selectedClassLabel]);

  // 26 alphabet letters for the live session heat grid
  const ALPHABET_26 = useMemo(() => {
    return Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  }, []);

  // Calculate highest count for heat grid scaling
  const maxLetterCount = useMemo(() => {
    const vals = Object.values(sessionStats.letterCounts);
    return vals.length > 0 ? Math.max(...vals, 1) : 1;
  }, [sessionStats.letterCounts]);

  return (
    <div className="relative min-h-screen text-[var(--text-main)] bg-[var(--bg-main)] selection:bg-[var(--accent-cyan)] selection:text-slate-950 overflow-x-hidden transition-colors duration-300">
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-20 flex flex-col gap-8">
        {/* ============================================================= */}
        {/* 1. HEADER */}
        {/* ============================================================= */}
        <header className="flex flex-col gap-4 pb-6 border-b border-[var(--border-card)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-cyan)] text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors cursor-pointer font-mono"
                  aria-label="Back to Home"
                >
                  <FiArrowLeft className="h-3.5 w-3.5" />
                  <span>Home</span>
                </button>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
                Analyst Dashboard
              </h1>
              <p className="mt-1 text-sm text-[var(--text-sub)]">
                Real-time session diagnostics and verified offline benchmark performance.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => navigate('/', 'demo')}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-cyan)] text-slate-950 font-bold px-4 py-2 text-xs sm:text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              >
                <FiCamera className="h-4 w-4" />
                <span>Launch Live Demo</span>
              </button>
            </div>
          </div>

          {/* Status Row of Pills & Source Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2">
              {/* Model service status pill */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                  modelStatus.online
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    modelStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>
                  Model service:{' '}
                  {modelStatus.loading
                    ? 'Checking...'
                    : modelStatus.online
                    ? 'Online'
                    : 'Model service offline'}
                </span>
              </div>

              {/* Session status pill */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                  hasSession
                    ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]'
                    : 'border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-sub)]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    hasSession ? 'bg-[var(--accent-cyan)] animate-pulse' : 'bg-[var(--text-muted)]'
                  }`}
                />
                <span>Session: {hasSession ? 'Active' : 'Idle'}</span>
              </div>
            </div>

            {/* Source Legend */}
            <div className="flex items-center gap-3 text-[11px] text-[var(--text-sub)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--accent-cyan)]" />
                <span>Live session</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--accent-blue)]" />
                <span>Offline validation</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--text-muted)]" />
                <span>Model info</span>
              </span>
            </div>
          </div>
        </header>

        {/* ============================================================= */}
        {/* 2. HERO PANEL — "Live session" (Visual Centerpiece) */}
        {/* ============================================================= */}
        <section
          aria-label="Live Session Centerpiece"
          className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] relative overflow-hidden transition-all"
        >
          {/* Source Tag */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-card)]">
            <div className="flex items-center gap-2">
              <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wide uppercase bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30">
                Live session
              </span>
              <span className="text-xs text-[var(--text-sub)] font-mono">
                Real-time webcam telemetry
              </span>
            </div>

            {hasSession && (
              <span className="text-xs font-mono text-[var(--text-sub)]">
                {sessionStats.totalPredictions} frames recorded
              </span>
            )}
          </div>

          {/* Active vs Idle State */}
          {!hasSession ? (
            <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-main)] flex items-center justify-center text-[var(--accent-cyan)] mb-4">
                <FiActivity className="h-8 w-8" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--text-main)]">
                Start the Live Demo to see session analytics
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[var(--text-sub)] max-w-md leading-relaxed">
                Connect your camera in the Live Demo to capture real hand gestures. Predictions, confidence rings, and latency will stream here automatically.
              </p>
              <button
                type="button"
                onClick={() => navigate('/', 'demo')}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-cyan)] text-slate-950 font-bold px-5 py-2.5 text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              >
                <FiCamera className="h-4 w-4" />
                <span>Launch Live Demo</span>
              </button>
            </div>
          ) : (
            <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Large Current-Letter Readout */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <span className="text-xs font-mono text-[var(--text-sub)] uppercase">
                  Latest Recognized Sign
                </span>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-display text-6xl sm:text-7xl font-bold text-[var(--text-main)] tracking-tight">
                    {sessionStats.latestPrediction?.label || '—'}
                  </span>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded border ${
                      sessionStats.latestPrediction?.status === 'committed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {sessionStats.latestPrediction?.status || 'idle'}
                  </span>
                </div>
                <span className="mt-2 text-xs font-mono text-[var(--text-sub)]">
                  Detected {sessionStats.latestHands} hand(s) in frame
                </span>
              </div>

              {/* Circular Confidence Ring */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs font-mono text-[var(--text-sub)] mb-2 uppercase">
                  Current Confidence
                </span>
                <div className="relative h-28 w-28 flex items-center justify-center">
                  <svg
                    className="h-full w-full -rotate-90"
                    viewBox="0 0 100 100"
                    aria-label={`Confidence ring showing ${Math.round(
                      (sessionStats.latestPrediction?.confidence || 0) * 100
                    )} percent`}
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-[var(--border-card)] opacity-40"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="var(--accent-cyan)"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={
                        2 * Math.PI * 40 * (1 - (sessionStats.latestPrediction?.confidence || 0))
                      }
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-2xl font-bold text-[var(--text-main)]">
                      {Math.round((sessionStats.latestPrediction?.confidence || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Latency Sparkline */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-sub)] mb-1">
                  <span className="uppercase">Latency History</span>
                  <span className="text-[var(--text-main)] font-bold">
                    {sessionStats.latestPrediction?.latencyMs || 0} ms
                  </span>
                </div>

                <div className="h-20 w-full rounded-xl border border-[var(--border-card)] bg-[var(--bg-main)] p-2 flex items-end">
                  <svg
                    className="h-full w-full overflow-visible"
                    viewBox="0 0 200 60"
                    preserveAspectRatio="none"
                    aria-label="Latency sparkline across recent prediction frames"
                  >
                    {(() => {
                      const recs = sessionRecords.slice(-25);
                      if (recs.length < 2) return null;
                      const maxL = Math.max(...recs.map((r) => r.latencyMs || 1), 30);
                      const points = recs.map((r, i) => {
                        const x = (i / (recs.length - 1)) * 200;
                        const y = 55 - ((r.latencyMs || 0) / maxL) * 50;
                        return `${x},${y}`;
                      });
                      return (
                        <polyline
                          fill="none"
                          stroke="var(--accent-blue)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={points.join(' ')}
                        />
                      );
                    })()}
                  </svg>
                </div>
                <span className="mt-1 text-[11px] font-mono text-[var(--text-sub)] text-right">
                  Client-side inference latency
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ============================================================= */}
        {/* 3. KPI STRIP OF 4 COMPACT CARDS */}
        {/* ============================================================= */}
        <section aria-label="Key Performance Indicators">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Predictions This Session */}
            <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4 flex flex-col justify-between shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--text-sub)]">Predictions</span>
                <span className="text-[10px] font-mono uppercase text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-1.5 py-0.5 rounded border border-[var(--accent-cyan)]/20">
                  Live session
                </span>
              </div>
              <div className="mt-3">
                <span className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)]">
                  {hasSession ? sessionStats.totalPredictions : '—'}
                </span>
              </div>
              <span className="mt-1 text-[11px] font-mono text-[var(--text-sub)]">
                {hasSession
                  ? `${sessionStats.committedCount} committed, ${sessionStats.rejectedCount} rejected`
                  : 'Start demo to record'}
              </span>
            </div>

            {/* 2. Average Confidence */}
            <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4 flex flex-col justify-between shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--text-sub)]">Avg Confidence</span>
                <span className="text-[10px] font-mono uppercase text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-1.5 py-0.5 rounded border border-[var(--accent-cyan)]/20">
                  Live session
                </span>
              </div>
              <div className="mt-3">
                <span className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)]">
                  {hasSession && sessionStats.avgConfidence !== null
                    ? `${sessionStats.avgConfidence.toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              <span className="mt-1 text-[11px] font-mono text-[var(--text-sub)]">
                {hasSession ? 'Mean prediction score' : 'Start demo to record'}
              </span>
            </div>

            {/* 3. Average Latency */}
            <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4 flex flex-col justify-between shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--text-sub)]">Avg Latency</span>
                <span className="text-[10px] font-mono uppercase text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-1.5 py-0.5 rounded border border-[var(--accent-cyan)]/20">
                  Live session
                </span>
              </div>
              <div className="mt-3">
                <span className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)]">
                  {hasSession && sessionStats.avgLatencyMs !== null
                    ? `${sessionStats.avgLatencyMs} ms`
                    : '—'}
                </span>
              </div>
              <span className="mt-1 text-[11px] font-mono text-[var(--text-sub)]">
                {hasSession ? 'Mean processing time' : 'Start demo to record'}
              </span>
            </div>

            {/* 4. Hands Detected */}
            <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4 flex flex-col justify-between shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--text-sub)]">Hands Detected</span>
                <span className="text-[10px] font-mono uppercase text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-1.5 py-0.5 rounded border border-[var(--accent-cyan)]/20">
                  Live session
                </span>
              </div>
              <div className="mt-3">
                <span className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)]">
                  {hasSession ? sessionStats.latestHands : '—'}
                </span>
              </div>
              <span className="mt-1 text-[11px] font-mono text-[var(--text-sub)]">
                {hasSession ? 'MediaPipe tracker status' : 'Start demo to record'}
              </span>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 4. TWO-COLUMN ROW: */}
        {/* Left: "Session timeline" | Right: "Offline validation" */}
        {/* ============================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* Left Column: Session Timeline (Live Session) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 sm:p-6 flex flex-col gap-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-card)]">
              <div>
                <h2 className="font-display text-base font-bold text-[var(--text-main)]">
                  Session Timeline
                </h2>
                <p className="text-xs text-[var(--text-sub)] mt-0.5">
                  Confidence trajectory and letter frequency in this session.
                </p>
              </div>
              <span className="text-[10px] font-mono uppercase text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-0.5 rounded border border-[var(--accent-cyan)]/20">
                Live session
              </span>
            </div>

            {/* Confidence-over-time Line Chart */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-sub)] mb-2">
                <span>Confidence Over Time</span>
                <span>0% to 100%</span>
              </div>

              {!hasSession ? (
                <div className="h-44 rounded-xl border border-[var(--border-card)] bg-[var(--bg-main)] flex flex-col items-center justify-center p-4 text-center">
                  <FiClock className="h-6 w-6 text-[var(--text-sub)] mb-2" />
                  <span className="text-xs font-mono text-[var(--text-sub)]">
                    No confidence trajectory yet
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] mt-1">
                    Points will plot dynamically when gestures are recognized in Live Demo.
                  </span>
                </div>
              ) : (
                <div className="h-44 rounded-xl border border-[var(--border-card)] bg-[var(--bg-main)] p-3 flex flex-col justify-between">
                  <svg
                    className="h-full w-full overflow-visible"
                    viewBox="0 0 300 100"
                    preserveAspectRatio="none"
                    aria-label="Confidence over time chart for the current session"
                  >
                    {/* Gridlines */}
                    <line
                      x1="0"
                      y1="20"
                      x2="300"
                      y2="20"
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      className="text-[var(--border-card)] opacity-30"
                    />
                    <line
                      x1="0"
                      y1="50"
                      x2="300"
                      y2="50"
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      className="text-[var(--border-card)] opacity-30"
                    />
                    <line
                      x1="0"
                      y1="80"
                      x2="300"
                      y2="80"
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      className="text-[var(--border-card)] opacity-30"
                    />

                    {/* Polyline */}
                    {(() => {
                      const items = sessionRecords.slice(-40);
                      if (items.length < 2) return null;
                      const points = items.map((r, idx) => {
                        const x = (idx / (items.length - 1)) * 300;
                        const y = 90 - (r.confidence || 0) * 80;
                        return `${x},${y}`;
                      });
                      return (
                        <>
                          <polyline
                            fill="none"
                            stroke="var(--accent-cyan)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={points.join(' ')}
                          />
                          {items.map((r, idx) => {
                            const x = (idx / (items.length - 1)) * 300;
                            const y = 90 - (r.confidence || 0) * 80;
                            return (
                              <circle
                                key={idx}
                                cx={x}
                                cy={y}
                                r="3"
                                fill="var(--bg-main)"
                                stroke="var(--accent-cyan)"
                                strokeWidth="2"
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-sub)] mt-1">
                    <span>Older frames</span>
                    <span>Recent frames</span>
                  </div>
                </div>
              )}
            </div>

            {/* 26-Tile Letter Heat Grid */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-sub)] mb-2">
                <span>Letter Prediction Frequency (A–Z)</span>
                <span>Intensity = Count</span>
              </div>

              <div
                className="grid grid-cols-13 sm:grid-cols-13 gap-1 select-none"
                style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
              >
                {ALPHABET_26.map((letter) => {
                  const count = sessionStats.letterCounts[letter] || 0;
                  const intensity = Math.min(1, count / maxLetterCount);

                  return (
                    <div
                      key={letter}
                      tabIndex={0}
                      className="group relative aspect-square rounded-md border border-[var(--border-card)] flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)] outline-none"
                      style={{
                        backgroundColor:
                          count > 0
                            ? `rgba(0, 217, 255, ${0.15 + intensity * 0.65})`
                            : 'var(--bg-main)',
                      }}
                      title={`${letter}: predicted ${count} time(s)`}
                    >
                      <span className="font-mono text-xs font-bold text-[var(--text-main)]">
                        {letter}
                      </span>
                      {count > 0 && (
                        <span className="text-[9px] font-mono text-[var(--text-main)] leading-none mt-0.5">
                          {count}
                        </span>
                      )}

                      {/* Tooltip on hover/focus */}
                      <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity bg-[var(--bg-card)] border border-[var(--border-card)] px-2 py-1 rounded text-[10px] font-mono text-[var(--text-main)] whitespace-nowrap z-20 shadow-lg">
                        Letter {letter}: {count} prediction(s)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* Right Column: Offline Validation Report */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 sm:p-6 flex flex-col gap-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-card)]">
              <div>
                <h2 className="font-display text-base font-bold text-[var(--text-main)]">
                  Offline Validation
                </h2>
                <p className="text-xs text-[var(--text-sub)] mt-0.5">
                  Held-out benchmark metrics across {offlineReport.samplesCount} still frames.
                </p>
              </div>
              <span className="text-[10px] font-mono uppercase text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 px-2 py-0.5 rounded border border-[var(--accent-blue)]/20">
                Offline validation
              </span>
            </div>

            {/* Validation Ring & Train vs Val Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Big Ring Showing 98.47% */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-main)]">
                <div className="relative h-28 w-28 flex items-center justify-center">
                  <svg
                    className="h-full w-full -rotate-90"
                    viewBox="0 0 100 100"
                    aria-label={`Validation accuracy ring showing ${offlineReport.validationAccuracy}%`}
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-[var(--border-card)] opacity-30"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="var(--accent-blue)"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={
                        2 * Math.PI * 40 * (1 - offlineReport.validationAccuracy / 100)
                      }
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                      {offlineReport.validationAccuracy}%
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-sub)]">Validation</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-sub)] mt-2">
                  2,549 test samples
                </span>
              </div>

              {/* Train 99.17% vs Val 98.47% Comparison */}
              <div className="flex flex-col justify-center gap-3">
                <div className="p-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-main)]">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--text-sub)]">Training Accuracy</span>
                    <span className="font-bold text-[var(--text-main)]">
                      {offlineReport.trainAccuracy}%
                    </span>
                  </div>
                  <div className="w-full bg-[var(--border-card)] h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full"
                      style={{ width: `${offlineReport.trainAccuracy}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-main)]">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--text-sub)]">Validation Accuracy</span>
                    <span className="font-bold text-[var(--accent-blue)]">
                      {offlineReport.validationAccuracy}%
                    </span>
                  </div>
                  <div className="w-full bg-[var(--border-card)] h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-[var(--accent-blue)] h-full rounded-full"
                      style={{ width: `${offlineReport.validationAccuracy}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Weakest Letters List (5 lowest: N, M, Y, I, D) */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-sub)] mb-2">
                <span>Weakest Letters (Top 5 Attention Needed)</span>
                <span>Accuracy %</span>
              </div>

              <div className="flex flex-col gap-2">
                {offlineReport.perClass.slice(0, 5).map((item) => (
                  <div
                    key={item.label}
                    onClick={() => setSelectedClassLabel(item.label)}
                    className="p-2 rounded-xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 transition-colors cursor-pointer flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center">
                        {item.label}
                      </span>
                      <span className="text-[var(--text-main)] font-semibold">
                        {item.accuracy}%
                      </span>
                      <span className="text-[11px] text-[var(--text-sub)]">
                        ({item.correct}/{item.total} correct)
                      </span>
                    </div>

                    <div className="w-24 bg-[var(--border-card)] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full"
                        style={{ width: `${item.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confusion Pairs as Small Chips */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-sub)] mb-2">
                <span>Observed Misclassification Pairs</span>
                <span>Error count</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {offlineReport.confusions.map((c, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-card)] bg-[var(--bg-main)] text-xs font-mono text-[var(--text-main)]"
                  >
                    <span className="font-bold text-amber-300">{c.from}</span>
                    <span className="text-[var(--text-sub)]">→</span>
                    <span className="font-bold text-[var(--text-main)]">{c.to}</span>
                    <span className="text-[10px] text-[var(--text-sub)] font-bold">
                      ×{c.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 5. "ALL CLASSES" SECTION (27 Tiles: A–Z + HELLO) */}
        {/* ============================================================= */}
        <section
          aria-label="All Classes Validation Grid"
          className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 sm:p-6 flex flex-col gap-5 shadow-[var(--shadow-card)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-card)]">
            <div>
              <h2 className="font-display text-base font-bold text-[var(--text-main)]">
                All Supported Classes ({offlineReport.classesCount})
              </h2>
              <p className="text-xs text-[var(--text-sub)] mt-0.5">
                Held-out benchmark accuracy bands. Select any tile to inspect sample counts.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-[10px] font-mono uppercase text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 px-2 py-0.5 rounded border border-[var(--accent-blue)]/20">
                Offline validation
              </span>
            </div>
          </div>

          {/* Color Legend for Accuracy Bands */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--text-sub)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-emerald-400" />
              <span>100% Perfect</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-[var(--accent-cyan)]" />
              <span>98.0% – 99.9%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-[var(--accent-blue)]" />
              <span>95.0% – 97.9%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-amber-400" />
              <span>&lt; 95% (Weakest)</span>
            </span>
          </div>

          {/* 27 Tiles Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-9 gap-2 select-none">
            {offlineReport.perClass.map((item) => {
              const isSelected = item.label === selectedClassLabel;
              const isWeak = item.accuracy < 95;
              const isPerfect = item.accuracy === 100;
              const isHigh = item.accuracy >= 98 && item.accuracy < 100;

              return (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setSelectedClassLabel(item.label)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer text-center relative focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)] outline-none ${
                    isSelected
                      ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/20 shadow-md scale-105'
                      : isWeak
                      ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-400'
                      : isPerfect
                      ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400'
                      : isHigh
                      ? 'border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/5 hover:border-[var(--accent-cyan)]'
                      : 'border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5 hover:border-[var(--accent-blue)]'
                  }`}
                >
                  <span className="font-mono text-sm font-bold text-[var(--text-main)]">
                    {item.label}
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-sub)] mt-0.5">
                    {item.accuracy.toFixed(1)}%
                  </span>

                  {/* Special Badges */}
                  {item.isSynthetic && (
                    <span className="mt-1 text-[8px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 rounded">
                      synthetic
                    </span>
                  )}
                  {item.isStaticFrame && (
                    <span className="mt-1 text-[8px] font-mono uppercase bg-[var(--bg-main)] text-[var(--text-sub)] border border-[var(--border-card)] px-1 rounded">
                      static
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Tile Detail Card */}
          <div className="p-4 rounded-xl border border-[var(--border-card)] bg-[var(--bg-main)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-[var(--accent-cyan)] text-slate-950 font-display font-bold text-lg flex items-center justify-center">
                {selectedClassInfo.label}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-[var(--text-main)] text-base">
                    Class {selectedClassInfo.label} Validation
                  </span>
                  {selectedClassInfo.isSynthetic && (
                    <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                      Synthetic data
                    </span>
                  )}
                  {selectedClassInfo.isStaticFrame && (
                    <span className="text-[10px] font-mono uppercase bg-[var(--bg-main)] text-[var(--text-sub)] border border-[var(--border-card)] px-1.5 py-0.5 rounded">
                      Static frame representation
                    </span>
                  )}
                  {selectedClassInfo.isWeakest && (
                    <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      Weakest class
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-sub)] mt-0.5 font-mono">
                  {selectedClassInfo.correct !== null && selectedClassInfo.total !== null
                    ? `${selectedClassInfo.correct} correct out of ${selectedClassInfo.total} evaluated test frames`
                    : '100% accuracy (sample count not reported in original log)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right font-mono text-xs">
              <div>
                <span className="text-[var(--text-sub)] block">Accuracy</span>
                <span className="text-base font-bold text-[var(--accent-cyan)]">
                  {selectedClassInfo.accuracy}%
                </span>
              </div>
              <div>
                <span className="text-[var(--text-sub)] block">Correct / Total</span>
                <span className="text-base font-bold text-[var(--text-main)]">
                  {selectedClassInfo.correct !== null
                    ? `${selectedClassInfo.correct}/${selectedClassInfo.total}`
                    : 'Count not reported'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* RECENT PREDICTIONS TABLE (Last 20 rows of Live Session) */}
        {/* ============================================================= */}
        <section
          aria-label="Recent Predictions Table"
          className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 sm:p-6 flex flex-col gap-4 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-card)]">
            <div>
              <h2 className="font-display text-base font-bold text-[var(--text-main)]">
                Recent Session Predictions (Last 20)
              </h2>
              <p className="text-xs text-[var(--text-sub)] mt-0.5">
                Per-frame timestamps, labels, confidence, and commit status.
              </p>
            </div>
            <span className="text-[10px] font-mono uppercase text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-0.5 rounded border border-[var(--accent-cyan)]/20">
              Live session
            </span>
          </div>

          {!hasSession ? (
            <div className="py-8 text-center text-xs font-mono text-[var(--text-sub)]">
              No live predictions recorded yet. Launch the Live Demo to stream recognition events.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border-card)] text-[11px] text-[var(--text-sub)]">
                    <th className="py-2 px-3 font-semibold">Time</th>
                    <th className="py-2 px-3 font-semibold">Label</th>
                    <th className="py-2 px-3 font-semibold text-right">Confidence</th>
                    <th className="py-2 px-3 font-semibold text-right">Latency</th>
                    <th className="py-2 px-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-card)]">
                  {sessionRecords
                    .slice(-20)
                    .reverse()
                    .map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-main)]"
                      >
                        <td className="py-2 px-3 text-[var(--text-sub)]">
                          {new Date(item.ts).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3 font-bold text-[var(--accent-cyan)]">
                          {item.label}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {Math.round((item.confidence || 0) * 100)}%
                        </td>
                        <td className="py-2 px-3 text-right text-[var(--text-sub)]">
                          {item.latencyMs || 0} ms
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] border ${
                              item.status === 'committed'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ============================================================= */}
        {/* 6. "MODEL STATUS" CARD */}
        {/* ============================================================= */}
        <section
          aria-label="Model Status Information"
          className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 sm:p-6 flex flex-col gap-4 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-card)]">
            <div>
              <h2 className="font-display text-base font-bold text-[var(--text-main)]">
                Model Status & Architecture
              </h2>
              <p className="text-xs text-[var(--text-sub)] mt-0.5">
                Runtime configuration from /api/v1/ai/model-status.
              </p>
            </div>
            <span className="text-[10px] font-mono uppercase text-[var(--text-sub)] bg-[var(--bg-main)] px-2 py-0.5 rounded border border-[var(--border-card)]">
              Model info
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-main)]">
              <span className="text-[var(--text-sub)] block">Inference Engine</span>
              <span className="text-sm font-bold text-[var(--text-main)] mt-1 block">
                {modelStatus.loading
                  ? 'Checking...'
                  : modelStatus.online
                  ? modelStatus.engine
                  : 'Model service offline'}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-main)]">
              <span className="text-[var(--text-sub)] block">Label Count</span>
              <span className="text-sm font-bold text-[var(--text-main)] mt-1 block">
                {modelStatus.online ? `${modelStatus.labelsCount} alphabet classes` : 'Model service offline'}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-main)]">
              <span className="text-[var(--text-sub)] block">Temporal Window Size</span>
              <span className="text-sm font-bold text-[var(--text-main)] mt-1 block">
                12 frames
              </span>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-main)]">
              <span className="text-[var(--text-sub)] block">Vocabulary Status</span>
              <span className="text-sm font-bold text-amber-400 mt-1 block">
                Words: not yet trained
              </span>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 7. FOOTNOTES BLOCK (Strict Disclaimers) */}
        {/* ============================================================= */}
        <footer className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)]/50 p-4 sm:p-5 flex flex-col gap-2 text-xs font-mono text-[var(--text-sub)]">
          <div className="flex items-center gap-1.5 font-bold text-[var(--text-main)] mb-1">
            <FiHelpCircle className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
            <span>Evaluation Notes & Disclaimers:</span>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {offlineReport.footnotes.map((note, idx) => (
              <li key={idx} className="leading-relaxed">
                {note}
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </div>
  );
}
