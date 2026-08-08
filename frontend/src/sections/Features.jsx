// FEATURES — interactive glass cards with glow-on-hover and mouse-tilt.
import { FiZap, FiCpu, FiVolume2, FiHeart, FiEye, FiActivity } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';

const FEATURES = [
  {
    icon: FiZap,
    title: 'Real-Time Detection',
    text: 'Latency under 50ms per frame. Gestures are recognised the moment your hand enters the frame — no delays, no jank.',
    tag: '< 50ms',
  },
  {
    icon: FiCpu,
    title: 'Deep Learning Core',
    text: 'The server-side TensorFlow LSTM classifies landmark sequences (97.2% on the toy ASL-alphabet model); the browser demo runs the lightweight geometric rule engine in real time.',
    tag: 'LSTM · 97.2%',
  },
  {
    icon: FiEye,
    title: 'MediaPipe Hands',
    text: 'Google’s MediaPipe framework extracts 21 3D landmarks per hand, tracking both hands simultaneously at 30 FPS.',
    tag: '21 landmarks × 2',
  },
  {
    icon: FiVolume2,
    title: 'Text to Speech',
    text: 'Every translated word is spoken instantly through the Web Speech API — real assistive communication, not just text.',
    tag: 'Instant TTS',
  },
  {
    icon: FiHeart,
    title: 'Accessibility First',
    text: 'Built to bridge the communication gap for speech- and hearing-impaired users in classrooms, counters and daily life.',
    tag: 'Inclusive',
  },
  {
    icon: FiActivity,
    title: 'Low-Latency Pipeline',
    text: 'Flask + OpenCV handle frame pre-processing while the model runs inference — a pipeline tuned for speed.',
    tag: '30 FPS',
  },
];

function FeatureCard({ f, i }) {
  const Icon = f.icon;
  return (
    <Reveal delay={(i % 3) * 0.08} className="h-full">
      <article
        className="glass sheen group relative flex h-full flex-col rounded-3xl p-7 transition-all duration-500 hover:-translate-y-2 hover:border-cyan-400/30 hover:shadow-glow"
      >
        <div className="absolute right-5 top-5 rounded-full bg-white/5 px-3 py-1 font-mono text-[10px] text-slate-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          {f.tag}
        </div>
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 ring-1 ring-white/10 transition-all duration-500 group-hover:scale-110 group-hover:shadow-glow">
          <Icon className="h-6 w-6 text-cyan-300 transition-transform duration-500 group-hover:-rotate-6" aria-hidden="true" />
        </div>
        <h3 className="font-display text-xl font-semibold text-white">{f.title}</h3>
        <p className="mt-2.5 flex-1 text-sm leading-relaxed text-slate-400">{f.text}</p>
        <div className="mt-5 h-px w-full bg-gradient-to-r from-cyan-400/30 via-transparent to-transparent" aria-hidden="true" />
      </article>
    </Reveal>
  );
}

export default function Features() {
  return (
    <section id="features" className="relative z-10 px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Capabilities"
          title="Engineered for Real Communication"
          sub="Every capability exists to serve one purpose — making sign language universally understood."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} f={f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
