import { useState } from 'react';
import { FiArrowUp, FiGithub, FiLinkedin, FiMail } from 'react-icons/fi';
import Marquee from '../components/Marquee.jsx';
import { useRouter } from '../context/RouterContext.jsx';

const QUICK = [
  ['Live Demo', 'demo'],
  ['How It Works', 'how'],
  ['Gesture Library', 'gestures'],
  ['Model', 'model'],
  ['Team', 'team'],
  ['Contact Us', 'contact'],
];

const SOCIALS = [
  { icon: FiGithub, href: 'https://github.com', label: 'GitHub' },
  { icon: FiLinkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  { icon: FiMail, href: 'mailto:mohdowaisalam177@gmail.com', label: 'Email' },
];

function scrollTop() {
  if (window.__lenis) window.__lenis.scrollTo(0);
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function Footer() {
  const [hoveredSocial, setHoveredSocial] = useState(null);
  const { path, navigate } = useRouter();

  const handleLinkClick = (e, id) => {
    e.preventDefault();
    if (id === 'contact') {
      navigate('/contact');
    } else {
      if (path !== '/') {
        navigate('/', id);
      } else {
        if (window.__lenis) window.__lenis.scrollTo(`#${id}`, { offset: -70 });
        else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="relative z-10 mt-10 overflow-hidden border-t border-white/10">
      <Marquee words={['SignSpeak AI', 'Accessible', 'Real-Time', 'AI', 'Mohammed Owais Alam', 'BCA Final Project']} variant="solid" speed={26} className="opacity-70" />

      <div className="relative px-5 pb-10 pt-14 md:px-10">
        {/* Soft cyan/blue ambient glow behind the watermark */}
        <div className="footer-ambient-glow" aria-hidden="true" />

        {/* Background Typography Watermark sitting flush just above copyright bar */}
        <div
          className="footer-watermark-wrap pointer-events-none absolute inset-x-0 bottom-[38px] sm:bottom-[44px] md:bottom-[48px] z-0 select-none overflow-hidden flex items-center justify-center px-4 sm:px-8 md:px-12"
          aria-hidden="true"
        >
          <span className="footer-watermark font-display font-black tracking-tight sm:tracking-normal uppercase whitespace-nowrap text-center text-[clamp(2.8rem,11vw,9.6rem)] leading-none select-none">
            SIGNSPEAK AI
          </span>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="footer-columns grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            {/* brand */}
            <div>
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => (path !== '/' ? navigate('/') : scrollTop())}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#00D9FF] via-[#83E8F5] to-[#168BFF] shadow-glow">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-950" fill="currentColor" aria-hidden="true"><path d="M12 2 L15.5 9.5 L23 12 L15.5 14.5 L12 22 L8.5 14.5 L1 12 L8.5 9.5 Z" /></svg>
                </span>
                <span className="font-display text-lg font-bold text-white tracking-tight">SignSpeak <span className="grad-text">AI</span></span>
              </div>
              <p className="mt-4 max-w-sm font-sans text-sm leading-relaxed text-slate-400">
                A real-time sign language translator powered by computer vision and deep learning. Breaking communication barriers through AI.
              </p>
              <button onClick={scrollTop} className="glass-card inline-flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/80 px-5 py-2.5 font-display text-xs font-semibold text-slate-200 shadow-lg backdrop-blur-xl hover:border-cyan-400/50 hover:text-white transition-all mt-6 cursor-pointer">
                Back to top <FiArrowUp className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
              </button>
            </div>

            {/* quick links */}
            <nav aria-label="Footer navigation">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/80 font-semibold">Explore</div>
              <ul className="mt-4 space-y-2.5">
                {QUICK.map(([label, id]) => (
                  <li key={id}>
                    <a
                      href={id === 'contact' ? '/contact' : `/#${id}`}
                      onClick={(e) => handleLinkClick(e, id)}
                      className="font-sans text-sm text-slate-400 transition-colors hover:text-cyan-300 cursor-pointer"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* socials */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/80 font-semibold">Connect</div>
              <div
                className="mt-4 flex items-center gap-4 py-2"
                onMouseLeave={() => setHoveredSocial(null)}
              >
                {SOCIALS.map((item, i) => {
                  const isHovered = hoveredSocial === i;
                  const isOtherHovered = hoveredSocial !== null && !isHovered;
                  return (
                    <a
                      key={i}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      onMouseEnter={() => setHoveredSocial(i)}
                      className={`glass-card grid h-12 w-12 place-items-center rounded-2xl border transition-all duration-300 origin-center ${isHovered
                        ? 'scale-125 z-20 border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.55)] ring-2 ring-cyan-400/40 -translate-y-1'
                        : isOtherHovered
                          ? 'scale-90 opacity-35 border-white/8 bg-slate-950/60 text-slate-500 blur-[0.2px]'
                          : 'scale-100 border-white/12 bg-slate-950/80 text-slate-300 shadow-md'
                        }`}
                      aria-label={item.label}
                    >
                      <item.icon
                        className={`transition-all duration-300 ${isHovered ? 'h-6 w-6 stroke-[2.2]' : 'h-5 w-5'
                          }`}
                        aria-hidden="true"
                      />
                    </a>
                  );
                })}
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-3 backdrop-blur-xl">
                <p className="font-mono text-[11px] leading-relaxed text-slate-400">
                  <span className="text-cyan-300 font-semibold">Final Year Capstone Project</span><br />
                  BCA V Semester · Ramaiah College, Bengaluru
                </p>
              </div>
            </div>
          </div>

          {/* bottom bar */}
          <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
            <p className="font-mono text-[11px] text-slate-400">© {new Date().getFullYear()} SignSpeak AI · Lead: Mohammed Owais Alam · Niranjan & Raman</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-400/80 font-medium">Breaking Communication Barriers Through AI</p>
          </div>
        </div>
      </div>
    </footer>
  );
}