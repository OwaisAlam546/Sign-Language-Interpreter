// ── HERO ── editorial lockup, auto-signing hand, floating chips, mouse parallax
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { FiArrowDown, FiArrowUpRight, FiPlay } from 'react-icons/fi';
import HandSkeleton from '../components/HandSkeleton.jsx';
import MagneticButton from '../components/MagneticButton.jsx';
import Counter from '../components/Counter.jsx';

const SIGNS = ['OPEN', 'A', 'B', 'C', 'L', 'Y', 'V', 'W', 'FIST', 'OPEN', 'L', 'I', 'E', 'OK', 'Y'];

function scrollTo(id) {
  if (window.__lenis) window.__lenis.scrollTo(`#${id}`, { offset: -70 });
  else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

const fadeUp = {
  hidden: { opacity: 0, y: 34 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.08 * i } }),
};

function Stat({ value, decimals = 0, suffix, label }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[clamp(1.7rem,3vw,2.6rem)] font-semibold tracking-tight">
        <span className="grad-text"><Counter to={value} decimals={decimals} suffix={suffix} /></span>
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</span>
    </div>
  );
}

export default function Hero() {
  const [letter, setLetter] = useState('A');
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 15 });
  const sy = useSpring(my, { stiffness: 40, damping: 15 });

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % SIGNS.length;
      setLetter(SIGNS[i]);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const onMove = (e) => {
    const { innerWidth: w, innerHeight: h } = window;
    mx.set((e.clientX / w - 0.5) * 24);
    my.set((e.clientY / h - 0.5) * 24);
  };

  return (
    <section id="hero" className="relative flex min-h-screen flex-col justify-center overflow-hidden px-5 pt-32 pb-16 md:px-10" onMouseMove={onMove}>
      {/* watermark */}
      <span className="watermark right-[-4%] top-[8%] hidden text-[clamp(6rem,16vw,14rem)] lg:block" aria-hidden="true">
        SIGN
      </span>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
        {/* ── Left: editorial lockup ── */}
        <div className="relative z-10">
          {/* meta bar */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}
            className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/8 pb-4 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
            <span className="flex items-center gap-2 text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 status-dot" /> Rule Engine · Live
            </span>
            <span className="hidden sm:inline">MediaPipe · 21 Landmarks</span>
            <span className="hidden md:inline">Ramaiah College · BCA VI</span>
          </motion.div>

          {/* giant headline */}
          <h1 className="font-display text-[clamp(3rem,8.2vw,7.2rem)] font-semibold leading-[0.93] tracking-[-0.03em]">
            <motion.span variants={fadeUp} initial="hidden" animate="show" custom={1} className="block text-white">
              AI That
            </motion.span>
            <motion.span variants={fadeUp} initial="hidden" animate="show" custom={2} className="block grad-text">
              Understands
            </motion.span>
            <motion.span variants={fadeUp} initial="hidden" animate="show" custom={3} className="block">
              <span className="text-stroke">Sign</span>{' '}
              <span className="relative text-white">
                Language<span className="absolute -right-4 bottom-2 hidden h-2 w-2 rounded-full bg-cyan-400 status-dot sm:block" />
              </span>
            </motion.span>
          </h1>

          {/* sub */}
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={4}
            className="mt-8 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg">
            <span className="font-semibold text-slate-100">SignSpeak AI</span> translates sign language into
            real-time text and speech — a webcam, computer vision and a deep learning model.
            Breaking communication barriers through AI.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}
            className="mt-10 flex flex-wrap items-center gap-4">
            <MagneticButton
              onClick={() => scrollTo('demo')}
              className="group"
            >
              <span className="btn-shimmer inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-violet-500 px-7 py-3.5 font-display text-sm font-semibold text-ink-950 shadow-glow-lg transition-shadow duration-300 hover:shadow-glow">
                <FiPlay className="transition-transform duration-300 group-hover:scale-125" aria-hidden="true" />
                Start Translation
              </span>
            </MagneticButton>
            <MagneticButton onClick={() => scrollTo('demo')}>
              <span className="glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-display text-sm font-medium text-slate-100 transition-all duration-300 hover:border-cyan-400/40 hover:shadow-glow">
                Live Demo
              </span>
            </MagneticButton>
            <MagneticButton href="#paper" onClick={(e) => { e.preventDefault(); scrollTo('about'); }}>
              <span className="group inline-flex items-center gap-1.5 px-2 py-3.5 font-display text-sm text-slate-400 transition-colors hover:text-white">
                Research Paper
                <FiArrowUpRight className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </MagneticButton>
          </motion.div>

          {/* stats band */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={6}
            className="glass mt-14 grid max-w-xl grid-cols-2 gap-y-8 rounded-2xl px-6 py-6 sm:grid-cols-4 sm:divide-x sm:divide-white/8">
            <Stat value={97.2} decimals={1} suffix="%" label="Server LSTM Acc." />
            <Stat value={26} suffix="+" label="Letters" />
            <Stat value={30} suffix=" FPS" label="Tracking" />
            <Stat value={45} suffix="ms" label="Inference" />
          </motion.div>
        </div>

        {/* ── Right: auto-signing hand panel ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 hidden justify-center md:flex"
        >
          <motion.div style={{ x: sx, y: sy }} className="relative w-full max-w-md">
            {/* glow behind panel */}
            <div className="absolute inset-0 -z-10 scale-110 rounded-[2.5rem] bg-gradient-to-br from-cyan-500/20 via-transparent to-violet-600/20 blur-3xl" aria-hidden="true" />

            <div className="glass-deep relative overflow-hidden rounded-[2rem] p-6 shadow-panel">
              {/* header */}
              <div className="flex items-center justify-between border-b border-white/8 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-300">Live Recognition</span>
                </div>
                <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] text-cyan-300">CAM-01</span>
              </div>

              {/* signing hand */}
              <div className="relative mt-4">
                <HandSkeleton pose={letter} className="mx-auto w-full max-w-[280px]" />
                <span className="scanline absolute inset-x-6 top-0 bottom-0 rounded-2xl" aria-hidden="true" />
              </div>

              {/* recognized letter chip */}
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">Recognized</div>
                  <div className="font-display text-3xl font-semibold text-white">
                    <motion.span key={letter} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                      {letter}
                    </motion.span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">Confidence</div>
                  <div className="font-mono text-lg text-cyan-300">
                    <motion.span key={letter} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {(96 + ((letter.charCodeAt(0) * 7) % 30) / 10).toFixed(1)}%
                    </motion.span>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 font-mono text-[10px] text-cyan-300 ring-1 ring-cyan-400/25">
                  30 FPS
                </span>
              </div>

              {/* speech bar */}
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-ink-950" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>
                </span>
                <div className="flex h-8 flex-1 items-center justify-between gap-0.5 px-1" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, i) => (
                    <span key={i} className="wave-bar w-[3px] rounded-full bg-gradient-to-t from-cyan-400/40 to-violet-400/70"
                      style={{ height: `${6 + ((i * 13 + letter.charCodeAt(0)) % 18)}px`, animationDelay: `${(i % 6) * 0.12}s` }} />
                  ))}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Speaking</span>
              </div>

              {/* footer chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {['MediaPipe Hands', '21 Landmarks', 'Rules + LSTM', 'TTS Engine'].map((c) => (
                  <span key={c} className="rounded-full border border-white/8 px-3 py-1 font-mono text-[10px] text-slate-500">{c}</span>
                ))}
              </div>
            </div>

            {/* floating mini-cards */}
            <div className="glass-deep absolute -left-8 top-10 hidden animate-float rounded-2xl px-4 py-3 lg:block" aria-hidden="true">
              <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Latency</div>
              <div className="font-display text-xl font-semibold text-white">45<span className="ml-1 text-xs text-slate-500">ms</span></div>
            </div>
            <div className="glass-deep absolute -right-6 bottom-24 hidden animate-float rounded-2xl px-4 py-3 lg:block [animation-delay:-3s]" aria-hidden="true">
              <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Precision</div>
              <div className="font-display text-xl font-semibold grad-text">98.4%</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* scroll indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        onClick={() => scrollTo('demo')}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
        aria-label="Scroll to live demo"
      >
        <span className="flex flex-col items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">Scroll</span>
          <motion.span animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} className="text-cyan-300">
            <FiArrowDown aria-hidden="true" />
          </motion.span>
        </span>
      </motion.button>
    </section>
  );
}
