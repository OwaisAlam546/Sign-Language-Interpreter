// HOW IT WORKS — vertical storytelling timeline; the spine line draws itself
// as you scroll, steps alternate sides on desktop with parallax icons.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FiVideo, FiEye, FiGrid, FiCpu, FiType, FiVolume2 } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    n: '01',
    title: 'Camera Capture',
    text: 'The browser requests webcam access via getUserMedia and streams ~30 frames per second to the Flask backend through a REST endpoint.',
    icon: FiVideo,
    tag: 'getUserMedia',
  },
  {
    n: '02',
    title: 'MediaPipe Hand Detection',
    text: 'OpenCV pre-processes every frame, then Google MediaPipe Hands localises both hands — even with two hands in frame simultaneously.',
    icon: FiEye,
    tag: 'MediaPipe Hands',
  },
  {
    n: '03',
    title: 'Landmark Extraction',
    text: '21 three-dimensional landmarks are extracted per hand — every knuckle and fingertip becomes a precise coordinate vector for the model.',
    icon: FiGrid,
    tag: '21 × 3D points',
  },
  {
    n: '04',
    title: 'Rule Score + LSTM',
    text: 'Each hand is scored instantly by the geometric rule engine in the browser; the optional server LSTM handles sequence-level recognition on windowed landmark batches.',
    icon: FiCpu,
    tag: 'Rule + LSTM',
  },
  {
    n: '05',
    title: 'Text Generation',
    text: 'Confident predictions are filtered by threshold, assembled letter by letter and matched against a gesture vocabulary to form words.',
    icon: FiType,
    tag: 'Sequence → Text',
  },
  {
    n: '06',
    title: 'Speech Output',
    text: 'The translated text is spoken instantly through the Web Speech API and pyttsx3 — closing the loop for two-way communication.',
    icon: FiVolume2,
    tag: 'TTS Engine',
  },
];

function Step({ step, side, index }) {
  const Icon = step.icon;
  return (
    <Reveal delay={index * 0.05} className={`relative flex ${side === 'right' ? 'md:justify-start' : 'md:justify-end'}`}>
      <div className={`glass sheen group relative w-full rounded-3xl p-6 transition-all duration-500 hover:border-cyan-400/30 hover:shadow-glow md:w-[46%] md:p-7 ${side === 'right' ? '' : ''}`}>
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 ring-1 ring-white/10 transition-all duration-500 group-hover:shadow-glow">
            <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] tracking-[0.3em] text-cyan-400/80">STEP {step.n}</span>
              <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-slate-500">{step.tag}</span>
            </div>
            <h3 className="mt-2 font-display text-xl font-semibold text-white md:text-2xl">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.text}</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function HowItWorks() {
  const spineRef = useRef(null);

  useEffect(() => {
    const spine = spineRef.current;
    if (!spine) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: spine, start: 'top 70%', end: 'bottom 45%', scrub: 0.6 },
    });
    tl.fromTo(spine, { scaleY: 0 }, { scaleY: 1, duration: 1, ease: 'none' });
    return () => tl.scrollTrigger?.kill();
  }, []);

  return (
    <section id="how" className="relative z-10 px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="The Pipeline"
          title="Six Steps. Zero Barriers."
          sub="From a raw camera frame to spoken words — every stage of the translation pipeline, engineered for real-time performance."
        />

        <div className="relative">
          {/* spine */}
          <div className="absolute bottom-6 left-5 top-6 w-px bg-white/8 md:left-1/2 md:-translate-x-1/2" aria-hidden="true" />
          <div
            ref={spineRef}
            className="absolute bottom-6 left-5 top-6 w-px origin-top bg-gradient-to-b from-cyan-400 via-sky-400 to-violet-500 shadow-glow md:left-1/2 md:-translate-x-1/2"
            aria-hidden="true"
          />

          <div className="space-y-10 md:space-y-16">
            {STEPS.map((step, i) => {
              const side = i % 2 === 0 ? 'left' : 'right';
              return (
                <div key={step.n} className="relative">
                  {/* node on the spine */}
                  <div className={`absolute left-5 top-8 z-10 -translate-x-1/2 md:left-1/2`} aria-hidden="true">
                    <span className="relative grid h-6 w-6 place-items-center rounded-full bg-ink-950 ring-2 ring-cyan-400/70">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 status-dot" />
                    </span>
                  </div>
                  <Step step={step} side={side} index={i} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
