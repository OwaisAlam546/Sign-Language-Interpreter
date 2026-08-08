// ABOUT PROJECT — editorial problem/objective/scope + future roadmap.
import { FiTarget, FiCompass, FiTrendingUp } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';

const FUTURE = [
  {
    icon: FiTrendingUp,
    title: 'Regional Language Support',
    text: 'Extend text and speech output to Hindi and Kannada for broader accessibility across India.',
    tag: 'Phase 2',
  },
  {
    icon: FiTarget,
    title: 'Sentence-Level Grammar',
    text: 'Apply NLP to convert recognized gesture sequences into grammatically correct sentences.',
    tag: 'Phase 3',
  },
  {
    icon: FiCompass,
    title: 'Two-Way Communication',
    text: 'Long-term vision — convert typed text back into sign gestures with an animated avatar for fully bidirectional conversation.',
    tag: 'Phase 4',
  },
];

export default function AboutProject() {
  return (
    <section id="about" className="relative z-10 overflow-hidden px-5 py-24 md:px-10 md:py-32">
      <span className="watermark left-[-3%] top-[4%] text-[clamp(5rem,14vw,12rem)]" aria-hidden="true">WHY</span>

      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="About The Project"
          title="Why SignSpeak Exists"
          sub="A Final Year Project that answers a real question — what happens when technology removes a barrier that millions face every day?"
        />

        {/* problem statement — giant type */}
        <Reveal>
          <blockquote className="relative mx-auto max-w-4xl border-l-2 border-cyan-400/50 pl-6 md:pl-10">
            <p className="font-display text-[clamp(1.5rem,3.4vw,2.8rem)] font-medium leading-[1.18] tracking-tight text-slate-200">
              <span className="grad-text">Sign language</span> is the primary language of the deaf and hard-of-hearing
              community — yet most people around them never learn it. The result is a{' '}
              <span className="text-white underline decoration-cyan-400/40 underline-offset-8">communication barrier</span>{' '}
              that technology is uniquely positioned to break.
            </p>
            <footer className="mt-6 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
              — Problem Statement · BCA VI Semester
            </footer>
          </blockquote>
        </Reveal>

        {/* objective + scope */}
        <div className="mt-20 grid gap-6 md:grid-cols-2">
          <Reveal delay={0.05}>
            <div className="glass sheen h-full rounded-3xl p-8">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 ring-1 ring-white/10">
                <FiTarget className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              </div>
              <h3 className="font-display text-2xl font-semibold text-white">Objective</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
                Design and develop a real-time system that captures hand gestures through a standard webcam, extracts hand
                landmarks with MediaPipe, and translates them into corresponding{' '}
                <span className="text-slate-200">text and speech</span> using geometric rule recognition plus an LSTM deep-learning API — promoting
                inclusive, accessible interaction in everyday scenarios.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Webcam-based', 'Real-time', 'MediaPipe', 'LSTM', 'Text + Speech'].map((c) => (
                  <span key={c} className="rounded-full border border-white/8 px-3 py-1 font-mono text-[10px] text-slate-500">{c}</span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="glass sheen h-full rounded-3xl p-8">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 ring-1 ring-white/10">
                <FiCompass className="h-5 w-5 text-violet-300" aria-hidden="true" />
              </div>
              <h3 className="font-display text-2xl font-semibold text-white">Scope & Boundaries</h3>
              <ul className="mt-3 space-y-2.5 text-[15px] leading-relaxed text-slate-400">
                <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />Static ASL alphabet <span className="font-mono text-xs text-slate-500">(A–Z)</span> with single-hand gestures</li>
                <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />10–15 dynamic word signs with dual-hand tracking</li>
                <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />Instant text-to-speech for every recognized output</li>
                <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />Runs locally — multi-user deployment is future work</li>
              </ul>
            </div>
          </Reveal>
        </div>

        {/* future roadmap */}
        <div className="mt-20">
          <Reveal>
            <h3 className="mb-10 text-center font-display text-2xl font-semibold text-white md:text-3xl">
              The Roadmap <span className="grad-text">Ahead</span>
            </h3>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {FUTURE.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={i * 0.1} className="h-full">
                  <div className="glass sheen group relative h-full rounded-3xl p-7 transition-all duration-500 hover:-translate-y-2 hover:border-violet-400/30 hover:shadow-glow-violet">
                    <span className="absolute right-6 top-6 rounded-full bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-violet-300">{f.tag}</span>
                    <Icon className="mb-5 h-6 w-6 text-violet-300" aria-hidden="true" />
                    <h4 className="font-display text-xl font-semibold text-white">{f.title}</h4>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{f.text}</p>
                    <div className="mt-5 h-px w-full bg-gradient-to-r from-violet-400/30 to-transparent" aria-hidden="true" />
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
