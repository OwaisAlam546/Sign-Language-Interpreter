import { useState } from 'react';
import { FiGithub, FiLinkedin, FiMail, FiAward, FiStar, FiCpu, FiLayout, FiCheckCircle } from 'react-icons/fi';
import Reveal from '../components/Reveal.jsx';
import AccordionGallery from '../components/AccordionGallery/AccordionGallery.jsx';
import { FUTURE } from '../lib/data.js';

// Team members list with Mohammed Owais Alam placed squarely in the MIDDLE (Index 1) as the Project Leader
const TEAM_MEMBERS = [
  {
    name: 'Niranjan M',
    id: 'U18MB24S0106',
    role: 'Frontend & UI/UX Developer',
    subtitle: 'Client Experience & WebRTC',
    image: '/team/niranjan.jpg',
    initials: 'NM',
    gradient: 'from-[#00D9FF] to-[#168BFF]',
    accentColor: '#168BFF',
    isLeader: false,
    icon: FiLayout,
    points: [
      'Realtime animated canvas & camera stream',
      'Webcam & browser speech synthesizer',
      'Accessibility design & motion optimization',
    ],
    bio: 'Engineered the responsive user interface, camera controls, gesture catalog, and client-side Web Speech synthesis closing the loop for hands-free two-way communication.',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    email: 'mailto:niranjan@example.com',
  },
  {
    name: 'Mohammed Owais Alam',
    id: 'U18MB24S0105',
    role: 'Project Lead · Core AI & Backend Architect',
    subtitle: 'Lead Developer & Neural Sequence Modeling',
    image: '/team/owais.jpg',
    initials: 'MO',
    gradient: 'from-[#00D9FF] via-[#83E8F5] to-[#168BFF]',
    accentColor: '#00D9FF',
    isLeader: true,
    badge: '★ Project Lead',
    icon: FiAward,
    points: [
      'LSTM neural network sequence modeling',
      'Flask AI microservice & fallback pipeline',
      'Dataset curation & dual-mode recognition',
    ],
    bio: 'Lead architect of SignSpeak AI. Conceptualized the end-to-end vision, curated the gesture sequence datasets, trained the 12-frame TensorFlow LSTM model, and engineered the high-throughput Python backend integration.',
    github: 'https://github.com/OwaisAlam546',
    linkedin: 'https://linkedin.com',
    email: 'mailto:owais@example.com',
  },
  {
    name: 'Raman Bharadwaj',
    id: 'U18MB24S0107',
    role: 'Computer Vision & Testing Developer',
    subtitle: 'MediaPipe Pipeline & Spatial Normalization',
    image: '/team/raman.jpg',
    initials: 'RB',
    gradient: 'from-cyan-400 to-emerald-400',
    accentColor: '#10b981',
    isLeader: false,
    icon: FiCpu,
    points: [
      'MediaPipe 21-hand landmark extraction',
      'Spatial coordinate normalization & tuning',
      'Accuracy benchmarking & integration testing',
    ],
    bio: 'Specialized in computer vision preprocessing, landmark coordinate normalization across 21 hand points, and empirical benchmark testing across lighting and skin tone variations.',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    email: 'mailto:raman@example.com',
  },
];

export default function Team() {
  // Center card (Mohammed Owais Alam at index 1) is active by default
  const [activeIdx, setActiveIdx] = useState(1);
  const activeMember = TEAM_MEMBERS[activeIdx] || TEAM_MEMBERS[1];

  // Prepare items for React Bits AccordionGallery
  const galleryItems = TEAM_MEMBERS.map((m) => ({
    image: m.image,
    alt: `${m.name} — ${m.role}`,
    isLeader: m.isLeader,
    badge: m.badge,
    label: (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-display font-bold text-white tracking-tight drop-shadow-md">
            {m.name}
          </span>
          {m.isLeader && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-cyan-400/25 border border-cyan-400/50 px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest text-cyan-200">
              <FiStar className="h-2.5 w-2.5 text-cyan-300" /> LEAD
            </span>
          )}
        </div>
        <span className="text-[10px] sm:text-[11px] font-mono font-medium text-cyan-300/90 tracking-wider">
          {m.role}
        </span>
      </div>
    ),
  }));

  return (
    <section id="team" className="relative z-10 px-4 pt-10 sm:pt-12 md:pt-14 pb-16 sm:pb-20 md:pb-24 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-5xl">
        {/* ── Compact Introduction ── */}
        <div className="relative z-10 mb-6 sm:mb-8 md:mb-9 text-center flex flex-col items-center gap-2.5 sm:gap-3">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl md:text-[2.65rem] font-bold tracking-tight text-white leading-tight">
              Meet the People Behind <span className="grad-text">SignSpeak AI</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-xl text-sm sm:text-base text-slate-300/90 leading-relaxed">
              The team building accessible communication through AI and computer vision.
            </p>
          </Reveal>
        </div>

        {/* ── React Bits <AccordionGallery /> ── */}
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-2 sm:p-3 bg-slate-950/60 border border-white/10 backdrop-blur-xl shadow-2xl">
            {/* Ambient Background Glow for Lead */}
            <div
              className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-60 w-full max-w-md rounded-full bg-gradient-to-r from-[#00D9FF]/10 via-[#168BFF]/08 to-transparent blur-3xl transition-opacity duration-700 ${activeIdx === 1 ? 'opacity-25' : 'opacity-10'
                }`}
              aria-hidden="true"
            />

            <AccordionGallery
              items={galleryItems}
              defaultIndex={1}
              expandRatio={0.5}
              trigger="hover"
              height={340}
              radius={18}
              gap={10}
              accentColor="#00D9FF"
              overlayColor="#05080D"
              textColor="#ffffff"
              tilt={5}
              parallax={0.35}
              duration={0.5}
              onActiveChange={(idx) => setActiveIdx(idx)}
            />
          </div>
        </Reveal>

        {/* ── Active Member Spotlight Card ── */}
        <Reveal delay={0.15}>
          <div className="relative mt-5 sm:mt-6">
            <div
              className={`glass-glow relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-7 bg-slate-950/90 border transition-all duration-500 backdrop-blur-2xl shadow-2xl ${activeMember.isLeader
                  ? 'border-cyan-400/50 shadow-[0_20px_60px_rgba(34,211,238,0.2)]'
                  : 'border-white/12'
                }`}
            >
              {/* Header Bar: ID, Role, and Lead Badge with proper flow margin */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 pb-3.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
                    {activeMember.id}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 font-mono text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${activeMember.isLeader
                        ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/40 shadow-glow'
                        : 'bg-white/10 text-slate-300 border border-white/10'
                      }`}
                  >
                    {activeMember.role}
                  </span>
                </div>

                {/* Leader Ribbon Badge */}
                {activeMember.isLeader && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#00D9FF]/20 via-[#83E8F5]/20 to-[#168BFF]/20 border border-cyan-400/40 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-cyan-300 shadow-glow">
                    <FiAward className="h-3.5 w-3.5 text-cyan-300" />
                    <span>PROJECT LEAD · CORE ARCHITECT</span>
                  </div>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-[1.2fr_1fr] items-start">
                <div>
                  <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {activeMember.name}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
                    {activeMember.bio}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {[
                      { icon: FiGithub, label: 'GitHub', url: activeMember.github },
                      { icon: FiLinkedin, label: 'LinkedIn', url: activeMember.linkedin },
                      { icon: FiMail, label: 'Email', url: activeMember.email },
                    ].map((s) => {
                      const Icon = s.icon;
                      return (
                        <a
                          key={s.label}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="glass-frosted glass-interactive inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200 transition-all hover:border-cyan-400/40 hover:text-cyan-200"
                        >
                          <Icon className="h-3 w-3 text-cyan-300" />
                          <span>{s.label}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>

                {/* Key Architectural Contributions List */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 backdrop-blur-md">
                  <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300 flex items-center gap-2">
                    <FiCheckCircle className="h-3.5 w-3.5" />
                    Key Contributions
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {activeMember.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-300">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 shadow-[0_0_8px_#22d3ee]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  {activeMember.isLeader && (
                    <div className="mt-3.5 pt-2.5 border-t border-white/10 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                      <span className="text-cyan-300">Full-Stack System Owner</span>
                      <span className="text-slate-500">SignSpeak AI Lead</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── College Affiliation Ribbon ── */}
        <Reveal delay={0.25}>
          <div className="glass-card mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-2xl border border-white/12 bg-slate-950/80 px-5 py-3.5 text-center shadow-lg backdrop-blur-xl">
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Ramaiah College of Arts, Science & Commerce — Autonomous
            </span>
            <span className="hidden h-3.5 w-px bg-white/10 md:block" aria-hidden="true" />
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-cyan-300 font-semibold">
              Bachelor of Computer Applications · V Semester
            </span>
          </div>
        </Reveal>

        {/* ── Future Work Roadmap ── */}
        <div className="mt-14 sm:mt-16">
          <Reveal>
            <div className="mb-6 text-center">
              <span className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300 font-semibold">
                Upcoming Evolution
              </span>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
                The Roadmap <span className="grad-text">Ahead</span>
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm text-slate-400">
                Strategic technical milestones advancing SignSpeak AI into multilingual and bidirectional accessibility.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {FUTURE.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.1} className="h-full">
                <div className="glass-card group relative flex h-full flex-col justify-between rounded-2xl border border-white/12 bg-slate-950/90 p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.2)]">
                  <div>
                    {/* Top Header Row with Milestone Counter & Phase Tag cleanly aligned */}
                    <div className="mb-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-cyan-400/15 border border-cyan-400/35 font-mono text-[10px] font-bold text-cyan-300">
                          0{i + 2}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                          Next Stage
                        </span>
                      </div>
                      <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan-300 border border-cyan-500/35 font-semibold shrink-0">
                        {f.tag}
                      </span>
                    </div>

                    <h4 className="font-display text-lg font-bold text-white tracking-tight leading-snug">
                      {f.title}
                    </h4>
                    <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-300">
                      {f.text}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-white/8 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" /> Planned Phase
                    </span>
                    <span className="text-slate-500">SignSpeak AI</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
