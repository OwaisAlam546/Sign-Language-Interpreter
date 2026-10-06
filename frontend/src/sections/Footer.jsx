import { useState } from 'react';
import { FiArrowUp, FiGithub, FiLinkedin, FiMail } from 'react-icons/fi';
import Marquee from '../components/Marquee.jsx';
import { useRouter } from '../context/RouterContext.jsx';

const QUICK = [
  ['Live Demo', 'demo'],
  ['How It Works', 'how'],
  ['Gesture Library', 'gestures'],
  ['Model Performance', 'model'],
  ['Model Analytics', 'analytics'],
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
    } else if (id === 'analytics') {
      navigate('/analytics');
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
    <footer className="relative z-10 mt-6 sm:mt-8 overflow-hidden border-t border-white/10">
      <Marquee words={['SignSpeak AI', 'Sign. Connect. Communicate.']} variant="solid" speed={26} className="opacity-70 text-xs py-1.5" />

      <div className="relative px-4 sm:px-6 md:px-8 pt-7 sm:pt-9 pb-5 sm:pb-6">
        {/* Soft cyan/blue ambient glow behind the watermark */}
        <div className="footer-ambient-glow" aria-hidden="true" />

        {/* Background Typography Watermark sitting flush just above copyright bar */}
        <div
          className="footer-watermark-wrap pointer-events-none absolute inset-x-0 bottom-[22px] sm:bottom-[26px] z-0 select-none overflow-hidden flex items-center justify-center px-4 sm:px-8"
          aria-hidden="true"
        >
          <span className="footer-watermark font-display font-black tracking-tight uppercase whitespace-nowrap text-center text-[clamp(1.85rem,5.8vw,4.8rem)] leading-none select-none">
            SIGNSPEAK AI
          </span>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="footer-columns grid gap-6 sm:gap-8 md:grid-cols-[1.3fr_0.85fr_1fr]">
            {/* brand */}
            <div>
              <div
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => (path !== '/' ? navigate('/') : scrollTop())}
              >
                <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-gradient-to-br from-[#00D9FF] via-[#83E8F5] to-[#168BFF] shadow-glow">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-950" fill="currentColor" aria-hidden="true"><path d="M12 2 L15.5 9.5 L23 12 L15.5 14.5 L12 22 L8.5 14.5 L1 12 L8.5 9.5 Z" /></svg>
                </span>
                <span className="font-display text-base sm:text-lg font-bold text-white tracking-tight">SignSpeak <span className="grad-text">AI</span></span>
              </div>
              <p className="mt-2.5 max-w-xs font-sans text-xs sm:text-[13px] leading-relaxed text-slate-400">
                A real-time sign language translator powered by computer vision and deep learning. Breaking communication barriers through AI.
              </p>
              <button onClick={scrollTop} className="glass-card inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/80 px-3.5 py-1.5 font-display text-[11px] font-semibold text-slate-200 shadow-md backdrop-blur-xl hover:border-cyan-400/50 hover:text-white transition-all mt-3 cursor-pointer">
                Back to top <FiArrowUp className="h-3 w-3 text-cyan-300" aria-hidden="true" />
              </button>
            </div>

            {/* quick links */}
            <nav aria-label="Footer navigation">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/80 font-semibold">Explore</div>
              <ul className="mt-2.5 space-y-1.5">
                {QUICK.map(([label, id]) => (
                  <li key={id}>
                    <a
                      href={id === 'contact' ? '/contact' : `/#${id}`}
                      onClick={(e) => handleLinkClick(e, id)}
                      className="font-sans text-xs sm:text-[13px] text-slate-400 transition-colors hover:text-cyan-300 cursor-pointer"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* socials */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/80 font-semibold">Connect</div>
              <div
                className="mt-2.5 flex items-center gap-2.5 py-1"
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
                      className={`glass-card grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl border transition-all duration-300 origin-center ${isHovered
                        ? 'scale-110 z-20 border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5)] ring-1 ring-cyan-400/40 -translate-y-0.5'
                        : isOtherHovered
                          ? 'scale-95 opacity-40 border-white/8 bg-slate-950/60 text-slate-500'
                          : 'scale-100 border-white/12 bg-slate-950/80 text-slate-300 shadow-sm'
                        }`}
                      aria-label={item.label}
                    >
                      <item.icon
                        className={`transition-all duration-300 ${isHovered ? 'h-4 w-4 stroke-[2.2]' : 'h-4 w-4'
                          }`}
                        aria-hidden="true"
                      />
                    </a>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/60 p-2.5 backdrop-blur-xl">
                <p className="font-mono text-[10px] sm:text-[11px] leading-relaxed text-slate-400">
                  <span className="text-cyan-300 font-semibold">Final Year Capstone Project</span><br />
                  BCA V Semester · Ramaiah College, Bengaluru
                </p>
              </div>
            </div>
          </div>

          {/* bottom bar */}
          <div className="mt-6 sm:mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3.5">
            <p className="font-mono text-[10px] sm:text-[11px] text-slate-400">© {new Date().getFullYear()} SignSpeak AI · Lead: Mohammed Owais Alam · Niranjan & Raman</p>
            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-400/80 font-medium">Breaking Communication Barriers Through AI</p>
          </div>
        </div>
      </div>
    </footer>
  );
}