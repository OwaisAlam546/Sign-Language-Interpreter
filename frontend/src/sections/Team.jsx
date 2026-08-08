// TEAM — premium profile cards with gradient avatars, roles and social links.
import { FiGithub, FiLinkedin, FiMail } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import { TEAM } from '../lib/data.js';

export default function Team() {
  return (
    <section id="team" className="relative z-10 px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="The Team"
          title="Three Minds. One Mission."
          sub="BCA VI Semester · Ramaiah College of Arts, Science & Commerce — Autonomous. Guided by our department faculty."
        />

        <div className="grid gap-6 md:grid-cols-3">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.1} className="h-full">
              <article className="glass sheen group relative h-full overflow-hidden rounded-3xl p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-glow">
                {/* top accent */}
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${m.gradient} opacity-70`} aria-hidden="true" />

                {/* avatar */}
                <div className="relative mx-auto mb-6 w-fit">
                  <div className={`grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br ${m.gradient} p-[3px] transition-transform duration-500 group-hover:scale-105`}>
                    <div className="grid h-full w-full place-items-center rounded-full bg-ink-900">
                      <span className="font-display text-3xl font-bold text-white">{m.initials}</span>
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-ink-950 ring-4 ring-ink-950" title="Active contributor">
                    <FiGithub className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>

                <div className="text-center">
                  <h3 className="font-display text-xl font-semibold text-white">{m.name}</h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">{m.id}</p>
                  <div className="mx-auto mt-3 w-fit rounded-full bg-white/5 px-4 py-1.5 font-mono text-[11px] text-cyan-300 ring-1 ring-white/10">
                    {m.role}
                  </div>
                </div>

                <ul className="mt-6 space-y-2">
                  {m.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-sm text-slate-400">
                      <span className="h-1 w-4 rounded-full bg-gradient-to-r from-cyan-400/70 to-violet-400/70" aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex justify-center gap-3 border-t border-white/8 pt-5">
                  {[FiGithub, FiLinkedin, FiMail].map((Icon, j) => (
                    <a
                      key={j}
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      aria-label="Social link"
                      className="grid h-10 w-10 place-items-center rounded-xl border border-white/8 text-slate-400 transition-all duration-300 hover:border-cyan-400/40 hover:text-white hover:shadow-glow"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* college ribbon */}
        <Reveal delay={0.2}>
          <div className="glass mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl px-6 py-5 text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">Ramaiah College of Arts, Science & Commerce — Autonomous</span>
            <span className="hidden h-4 w-px bg-white/10 md:block" aria-hidden="true" />
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-300">Bachelor of Computer Applications · VI Semester</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
