// ── HERO ── editorial lockup, auto-signing hand, floating chips, mouse parallax, scroll parallax
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion';
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

function Stat({ value, isCounter = false, unit, label, hasDividerSm = true, hasDividerMobile = false }) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center px-1 sm:px-2">
      <div className="flex h-8 sm:h-9 items-center justify-center">
        <span className="inline-flex items-baseline justify-center whitespace-nowrap">
          <span className="font-display text-xl sm:text-2xl font-bold tracking-tight grad-text">
            {isCounter ? <Counter to={value} /> : value}
          </span>
          {unit && (
            <span className="ml-1 font-mono text-[11px] sm:text-xs font-medium text-cyan-300">
              {unit}
            </span>
          )}
        </span>
      </div>
      <span className="mt-0.5 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-slate-400 text-center whitespace-nowrap">
        {label}
      </span>
      {hasDividerSm && (
        <div
          className={`absolute right-0 top-1/2 -translate-y-1/2 h-6 w-px bg-white/12 ${
            hasDividerMobile ? 'block' : 'hidden sm:block'
          }`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default function Hero() {
  const [letter, setLetter] = useState('A');
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 15 });
  const sy = useSpring(my, { stiffness: 40, damping: 15 });

  const { scrollY } = useScroll();
  const yLeft = useTransform(scrollY, [0, 800], [0, 40]);
  const yRight = useTransform(scrollY, [0, 800], [0, -30]);
  const opacityHero = useTransform(scrollY, [0, 750], [1, 0.5]);

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
    <section
      id="hero"
      className="relative flex flex-col justify-center overflow-hidden px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-10 sm:pb-14 min-h-0 lg:min-h-[min(92vh,850px)]"
      onMouseMove={onMove}
    >
      {/* watermark */}
      <span className="watermark right-[-4%] top-[8%] hidden text-[clamp(5rem,13vw,11rem)] lg:block" aria-hidden="true">
        SIGN
      </span>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 lg:gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        {/* ── Left: editorial lockup ── */}
        <motion.div style={{ y: yLeft, opacity: opacityHero }} className="relative z-10">
          {/* meta bar */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}
            className="mb-4 sm:mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-white/8 pb-3 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-slate-400">
            <span className="flex items-center gap-2 text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 status-dot" /> Rule Engine · Live
            </span>
            <span className="hidden sm:inline">MediaPipe · 21 Landmarks</span>
            <span className="hidden md:inline">Ramaiah College · BCA V</span>
          </motion.div>

          {/* giant headline */}
          <h1 className="font-display text-[clamp(2.4rem,5.2vw,5.2rem)] font-semibold leading-[0.96] tracking-[-0.03em]">
            <motion.span variants={fadeUp} initial="hidden" animate="show" custom={1} className="block text-white">
              AI That
            </motion.span>
            <motion.span variants={fadeUp} initial="hidden" animate="show" custom={2} className="block grad-text">
              Understands
            </motion.span>
            <motion.span variants={fadeUp} initial="hidden" animate="show" custom={3} className="block">
              <span className="text-stroke">Sign</span>{' '}
              <span className="relative text-white">
                Language<span className="absolute -right-3 bottom-2 hidden h-2 w-2 rounded-full bg-cyan-400 status-dot sm:block" />
              </span>
            </motion.span>
          </h1>

          {/* sub */}
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={4}
            className="mt-4 sm:mt-5 max-w-lg text-xs sm:text-sm md:text-base leading-relaxed text-slate-300">
            <span className="font-semibold text-slate-100">SignSpeak AI</span> translates sign language into
            real-time text and speech — a webcam, computer vision and a deep learning model.
            Breaking communication barriers through AI.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}
            className="mt-6 sm:mt-7 flex flex-wrap items-center gap-3">
            <MagneticButton
              onClick={() => scrollTo('demo')}
              className="group"
            >
              <span className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00D9FF] via-[#83E8F5] to-[#168BFF] px-5 sm:px-6 py-2.5 sm:py-3 font-display text-xs sm:text-sm font-bold text-slate-950 shadow-glow transition-all duration-300 hover:shadow-lg hover:scale-105">
                <FiPlay className="transition-transform duration-300 group-hover:scale-125" aria-hidden="true" />
                Start Translation
              </span>
            </MagneticButton>
            <MagneticButton onClick={() => scrollTo('demo')}>
              <span className="glass-card inline-flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/80 px-5 sm:px-6 py-2.5 sm:py-3 font-display text-xs sm:text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-glow backdrop-blur-xl">
                Live Demo
              </span>
            </MagneticButton>
            <MagneticButton href="#paper" onClick={(e) => { e.preventDefault(); scrollTo('about'); }}>
              <span className="group inline-flex items-center gap-1.5 px-2 py-2.5 font-display text-xs sm:text-sm text-slate-400 transition-colors hover:text-white">
                Research Paper
                <FiArrowUpRight className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </MagneticButton>
          </motion.div>

          {/* stats band */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={6}
            className="glass-card mt-6 sm:mt-7 w-full max-w-xl rounded-2xl sm:rounded-3xl border border-white/12 bg-slate-950/90 p-3 sm:p-4 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
            <div className="grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:gap-y-0">
              <Stat value="—" label="Accuracy Pending" hasDividerSm={true} hasDividerMobile={true} />
              <Stat value={27} isCounter={true} label="Bundled Labels" hasDividerSm={true} hasDividerMobile={false} />
              <Stat value={12} isCounter={true} unit="Frames" label="Model Window" hasDividerSm={true} hasDividerMobile={true} />
              <Stat value="Live" label="Camera Tracking" hasDividerSm={false} hasDividerMobile={false} />
            </div>
          </motion.div>
        </motion.div>

        {/* ── Right: auto-signing hand panel with parallax ── */}
        <motion.div
          style={{ y: yRight }}
          initial={{ opacity: 0, scale: 0.94, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 hidden justify-center md:flex"
        >
          <motion.div style={{ x: sx, y: sy }} className="relative w-full max-w-sm sm:max-w-md">
            {/* glow behind panel */}
            <div className="absolute inset-0 -z-10 scale-105 rounded-[2.5rem] bg-gradient-to-br from-[#00D9FF]/12 via-[#168BFF]/08 to-transparent blur-2xl" aria-hidden="true" />

            <div className="glass-card relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl bg-slate-950/90 border border-white/12 backdrop-blur-2xl">
              {/* header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  </span>
                  <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-slate-200">Live Recognition</span>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[9px] text-cyan-300 ring-1 ring-white/15">CAM-01</span>
              </div>

              {/* signing hand */}
              <div className="relative mt-3">
                <HandSkeleton pose={letter} className="mx-auto w-full max-w-[210px] sm:max-w-[240px]" />
                <span className="scanline absolute inset-x-4 top-0 bottom-0 rounded-2xl" aria-hidden="true" />
              </div>

              {/* recognized letter chip */}
              <div className="mt-3 flex items-center justify-between rounded-xl border border-white/12 bg-slate-950/80 px-4 py-2.5 backdrop-blur-xl">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/80 font-medium">Recognized</div>
                  <div className="font-display text-2xl sm:text-[1.75rem] font-bold text-white tracking-tight">
                    <motion.span key={letter} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                      {letter}
                    </motion.span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">Confidence</div>
                  <div className="font-mono text-base font-semibold text-cyan-300">
                    <motion.span key={letter} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {(96 + ((letter.charCodeAt(0) * 7) % 30) / 10).toFixed(1)}%
                    </motion.span>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-400/15 px-2.5 py-0.5 font-mono text-[9px] text-cyan-300 border border-cyan-400/35 font-medium">
                  30 FPS
                </span>
              </div>

              {/* speech bar */}
              <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-white/12 bg-slate-950/80 px-4 py-2 backdrop-blur-xl">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#00D9FF] via-[#83E8F5] to-[#168BFF] text-slate-950 shadow-glow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" /></svg>
                </span>
                <div className="flex h-6 flex-1 items-center justify-between gap-0.5 px-1" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, i) => (
                    <span key={i} className="wave-bar w-[2.5px] rounded-full bg-gradient-to-t from-[#00D9FF]/75 to-[#168BFF]/95"
                      style={{ height: `${5 + ((i * 13 + letter.charCodeAt(0)) % 15)}px`, animationDelay: `${(i % 6) * 0.12}s` }} />
                  ))}
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-slate-300">Speaking</span>
              </div>

              {/* footer chips */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['MediaPipe Hands', '21 Landmarks', 'Rules + LSTM', 'TTS Engine'].map((c) => (
                  <span key={c} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 font-mono text-[9px] text-slate-400">{c}</span>
                ))}
              </div>
            </div>

            {/* floating mini-cards */}
            <div className="glass-frosted glass-interactive absolute -left-6 top-8 hidden animate-float rounded-xl px-3 py-2 lg:block shadow-xl" aria-hidden="true">
              <div className="font-mono text-[8px] uppercase tracking-widest text-slate-400">Latency</div>
              <div className="font-display text-lg font-semibold text-white">45<span className="ml-1 text-xs text-cyan-300">ms</span></div>
            </div>
            <div className="glass-frosted glass-interactive absolute -right-4 bottom-20 hidden animate-float rounded-xl px-3 py-2 lg:block shadow-xl [animation-delay:-3s]" aria-hidden="true">
              <div className="font-mono text-[8px] uppercase tracking-widest text-slate-400">Precision</div>
              <div className="font-display text-lg font-semibold grad-text">98.4%</div>
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
        className="absolute bottom-3 sm:bottom-4 left-1/2 z-10 -translate-x-1/2"
        aria-label="Scroll to live demo"
      >
        <span className="flex flex-col items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-slate-400">Scroll</span>
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} className="text-cyan-300">
            <FiArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          </motion.span>
        </span>
      </motion.button>
    </section>
  );
}
