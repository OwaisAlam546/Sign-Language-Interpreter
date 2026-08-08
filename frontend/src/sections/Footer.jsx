// FOOTER — big watermark, quick links, socials, back-to-top.
import { FiArrowUp, FiGithub, FiLinkedin, FiMail } from 'react-icons/fi';
import Marquee from '../components/Marquee.jsx';

const QUICK = [
  ['Live Demo', 'demo'],
  ['How It Works', 'how'],
  ['Gesture Library', 'gestures'],
  ['Model', 'model'],
  ['Team', 'team'],
  ['Contact', 'contact'],
];

function scrollTop() {
  if (window.__lenis) window.__lenis.scrollTo(0);
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function Footer() {
  return (
    <footer className="relative z-10 mt-10 overflow-hidden border-t border-white/6">
      <Marquee words={['SignSpeak AI', 'Accessible', 'Real-Time', 'AI']} variant="solid" speed={26} className="opacity-60" />

      <div className="relative px-5 pb-10 pt-14 md:px-10">
        {/* watermark */}
        <span className="watermark bottom-[-20px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[18vw] leading-none opacity-70" aria-hidden="true">
          SIGNSPEAK
        </span>

        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            {/* brand */}
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-400 via-cyan-400 to-violet-500 shadow-glow">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-950" fill="currentColor" aria-hidden="true"><path d="M12 2 L15.5 9.5 L23 12 L15.5 14.5 L12 22 L8.5 14.5 L1 12 L8.5 9.5 Z" /></svg>
                </span>
                <span className="font-display text-lg font-semibold text-white">SignSpeak <span className="grad-text">AI</span></span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
                A real-time sign language translator powered by computer vision and deep learning. Breaking communication barriers through AI.
              </p>
              <button onClick={scrollTop} className="glass mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-xs font-medium text-slate-200 transition-all duration-300 hover:border-cyan-400/40 hover:shadow-glow">
                Back to top <FiArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* quick links */}
            <nav aria-label="Footer navigation">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">Explore</div>
              <ul className="mt-4 space-y-2.5">
                {QUICK.map(([label, id]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      onClick={(e) => { e.preventDefault(); window.__lenis ? window.__lenis.scrollTo(`#${id}`, { offset: -70 }) : document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="text-sm text-slate-400 transition-colors hover:text-cyan-300"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* socials */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">Connect</div>
              <div className="mt-4 flex gap-3">
                {[
                  [FiGithub, 'https://github.com'],
                  [FiLinkedin, 'https://linkedin.com'],
                  [FiMail, 'mailto:mohdowaisalam177@gmail.com'],
                ].map(([Icon, href], i) => (
                  <a key={i} href={href} target="_blank" rel="noreferrer" className="grid h-11 w-11 place-items-center rounded-xl border border-white/8 text-slate-400 transition-all duration-300 hover:border-cyan-400/40 hover:text-white hover:shadow-glow" aria-label="Social link">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </a>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-600">
                Final Year Project<br />BCA VI Semester · Ramaiah College
              </p>
            </div>
          </div>

          {/* bottom bar */}
          <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-6">
            <p className="font-mono text-[11px] text-slate-600">© {new Date().getFullYear()} SignSpeak AI · Team Owais, Niranjan & Raman</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-600">Breaking Communication Barriers Through AI</p>
          </div>
        </div>
      </div>
    </footer>
  );
}