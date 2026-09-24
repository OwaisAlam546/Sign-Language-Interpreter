// Floating glass navbar: hides on scroll down, shows on scroll up,
// active-section indicator, animated hamburger, glass mobile drawer.
import { useEffect, useState } from 'react';

const LINKS = [
  { id: 'demo', label: 'Live Demo' },
  { id: 'how', label: 'How It Works' },
  { id: 'gestures', label: 'Gestures' },
  { id: 'model', label: 'Model' },
  { id: 'team', label: 'Team' },
  { id: 'contact', label: 'Contact' },
];

function scrollTo(id) {
  if (window.__lenis) window.__lenis.scrollTo(`#${id}`, { offset: -90 });
  else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Navbar() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('hero');
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > lastY && y > 220);
      lastY = y;

      // active section
      let current = 'hero';
      for (const l of LINKS) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.42) current = l.id;
      }
      setActive(current);

      // section progress for indicator
      const p = {};
      for (const l of LINKS) {
        const el = document.getElementById(l.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const total = rect.height;
        const passed = Math.min(Math.max(-rect.top, 0), total);
        p[l.id] = total ? passed / total : 0;
      }
      setProgress(p);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <header
        className={`fixed left-1/2 top-4 z-[80] w-[calc(100%-2rem)] max-w-6xl -translate-x-1/2 transition-all duration-500 ${
          hidden ? '-translate-y-24 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <nav
          className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all duration-500 md:px-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl border border-white/12 bg-slate-950/85 ${
            scrolled ? 'border-cyan-400/30 shadow-[0_15px_40px_rgba(0,0,0,0.9)] bg-slate-950/95' : ''
          }`}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <a
            href="#hero"
            onClick={(e) => { e.preventDefault(); scrollTo('hero'); }}
            className="group flex items-center gap-3"
            aria-label="SignSpeak AI home"
          >
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400 via-cyan-400 to-violet-500 shadow-glow transition-transform duration-500 group-hover:rotate-[10deg]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-950" fill="currentColor" aria-hidden="true">
                <path d="M12 2 L15.5 9.5 L23 12 L15.5 14.5 L12 22 L8.5 14.5 L1 12 L8.5 9.5 Z" />
              </svg>
            </span>
            <span className="flex flex-col justify-center">
              <span className="font-display text-[15px] font-bold tracking-tight text-white leading-tight">
                SignSpeak <span className="grad-text">AI</span>
              </span>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300/80 font-medium leading-none">
                v1.0 · BCA
              </span>
            </span>
          </a>

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => {
              const isActive = active === l.id;
              const pct = progress[l.id] || 0;
              return (
                <li key={l.id} className="relative">
                  <a
                    href={`#${l.id}`}
                    onClick={(e) => { e.preventDefault(); scrollTo(l.id); }}
                    className={`relative block rounded-full px-4 py-2 font-sans text-[13px] font-medium transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/15" aria-hidden="true" />
                    )}
                    <span className="relative z-10">{l.label}</span>
                    {isActive && (
                      <span className="absolute -bottom-[3px] left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                        style={{ width: `${Math.max(18, pct * 36)}px`, opacity: 0.5 + pct * 0.5 }}
                        aria-hidden="true" />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="glass-card hidden rounded-full border border-white/12 bg-slate-950/80 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-slate-300 transition-all duration-300 hover:border-cyan-400/50 hover:text-cyan-300 hover:shadow-[0_0_15px_rgba(34,211,238,0.25)] md:inline-block backdrop-blur-xl"
            >
              GitHub ↗
            </a>

            {/* Hamburger */}
            <button
              onClick={() => setOpen(!open)}
              className="glass-card grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-slate-950/80 lg:hidden text-white hover:border-cyan-400/40"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <span className="relative block h-3.5 w-5" aria-hidden="true">
                <span className={`absolute left-0 top-0 h-[2px] w-full rounded bg-white transition-all duration-300 ${open ? 'top-1/2 -translate-y-1/2 rotate-45' : ''}`} />
                <span className={`absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded bg-white transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
                <span className={`absolute left-0 bottom-0 h-[2px] w-full rounded bg-white transition-all duration-300 ${open ? 'bottom-1/2 translate-y-1/2 -rotate-45' : ''}`} />
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[79] bg-slate-950/95 backdrop-blur-2xl transition-opacity duration-400 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col items-center justify-center gap-2">
          {LINKS.map((l, i) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={(e) => { e.preventDefault(); setOpen(false); setTimeout(() => scrollTo(l.id), 80); }}
              className={`font-display text-3xl font-semibold tracking-tight text-slate-200 transition-all duration-500 hover:text-white ${
                open ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
              style={{ transitionDelay: `${80 + i * 60}ms` }}
            >
              <span className={active === l.id ? 'grad-text' : ''}>{l.label}</span>
            </a>
          ))}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className={`glass-card mt-6 rounded-full border border-white/12 bg-slate-950/80 px-6 py-3 font-mono text-xs uppercase tracking-widest text-slate-200 transition-all duration-500 hover:border-cyan-400/50 hover:text-cyan-300 ${open ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: '420ms' }}
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </>
  );
}
