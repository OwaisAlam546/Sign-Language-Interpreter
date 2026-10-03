// Floating glass navbar: hides on scroll down, shows on scroll up,
// active-section indicator, animated hamburger, glass mobile drawer,
// and accessible Light/Dark mode theme toggle.
import { useEffect, useState } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext.jsx';
import { useRouter } from '../context/RouterContext.jsx';

const LINKS = [
  { id: 'demo', label: 'Live Demo', isSection: true },
  { id: 'how', label: 'How It Works', isSection: true },
  { id: 'gestures', label: 'Gestures', isSection: true },
  { id: 'model', label: 'Model', isSection: true },
  { id: 'team', label: 'Team', isSection: true },
  { id: 'contact', label: 'Contact Us', isPage: true, to: '/contact' },
];

function scrollTo(id) {
  if (window.__lenis) window.__lenis.scrollTo(`#${id}`, { offset: -90 });
  else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Navbar() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { path, navigate } = useRouter();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('hero');
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    if (path === '/contact') {
      setActive('contact');
      setProgress({ contact: 1 });
      return;
    }

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > lastY && y > 220);
      lastY = y;

      // active section
      let current = 'hero';
      for (const l of LINKS) {
        if (!l.isSection) continue;
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.42) current = l.id;
      }
      setActive(current);

      // section progress for indicator
      const p = {};
      for (const l of LINKS) {
        if (!l.isSection) continue;
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
  }, [path]);

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
          className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all duration-500 md:px-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] ${
            scrolled ? 'border-[var(--border-highlight)] shadow-[0_15px_40px_rgba(0,0,0,0.9)] bg-[var(--bg-card-hover)]' : ''
          }`}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              if (path !== '/') navigate('/');
              else scrollTo('hero');
            }}
            className="group flex items-center gap-3 cursor-pointer"
            aria-label="SignSpeak AI home"
          >
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#00D9FF] via-[#38BDF8] to-[#168BFF] shadow-glow transition-transform duration-500 group-hover:rotate-[10deg]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-950" fill="currentColor" aria-hidden="true">
                <path d="M12 2 L15.5 9.5 L23 12 L15.5 14.5 L12 22 L8.5 14.5 L1 12 L8.5 9.5 Z" />
              </svg>
            </span>
            <span className="flex flex-col justify-center">
              <span className="font-display text-[15px] font-bold tracking-tight text-[var(--text-main)] leading-tight">
                SignSpeak <span className="grad-text">AI</span>
              </span>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--accent-cyan)] font-medium leading-none">
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
                    href={l.isPage ? l.to : `/#${l.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (l.isPage) {
                        navigate(l.to);
                      } else {
                        if (path !== '/') {
                          navigate('/', l.id);
                        } else {
                          scrollTo(l.id);
                        }
                      }
                    }}
                    className={`relative block rounded-full px-4 py-2 font-sans text-[13px] font-medium transition-colors duration-300 cursor-pointer ${
                      isActive ? 'text-[var(--text-main)] font-semibold' : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/15" aria-hidden="true" />
                    )}
                    <span className="relative z-10">{l.label}</span>
                    {isActive && (
                      <span
                        className="absolute -bottom-[3px] left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#00D9FF] to-[#168BFF] transition-all shadow-[0_0_8px_rgba(0,217,255,0.7)]"
                        style={{ width: `${Math.max(18, pct * 36)}px`, opacity: 0.5 + pct * 0.5 }}
                        aria-hidden="true"
                      />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2.5">
            {/* Global Light/Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              type="button"
              className="glass-card relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--accent-cyan)] transition-colors duration-200 hover:border-[var(--accent-cyan)] hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 cursor-pointer"
              title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            >
              {isDark ? (
                <FiSun className="h-4.5 w-4.5 transition-transform duration-300 hover:rotate-45 text-[#83E8F5]" />
              ) : (
                <FiMoon className="h-4.5 w-4.5 transition-transform duration-300 hover:-rotate-12 text-[#087F9B]" />
              )}
            </button>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="glass-card hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-[var(--text-sub)] transition-all duration-300 hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] hover:shadow-[0_0_15px_var(--glow-cyan)] md:inline-block backdrop-blur-xl"
            >
              GitHub ↗
            </a>

            {/* Hamburger */}
            <button
              onClick={() => setOpen(!open)}
              className="glass-card grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] lg:hidden text-[var(--text-main)] hover:border-[var(--accent-cyan)]"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <span className="relative block h-3.5 w-5" aria-hidden="true">
                <span className={`absolute left-0 top-0 h-[2px] w-full rounded bg-current transition-all duration-300 ${open ? 'top-1/2 -translate-y-1/2 rotate-45' : ''}`} />
                <span className={`absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded bg-current transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
                <span className={`absolute left-0 bottom-0 h-[2px] w-full rounded bg-current transition-all duration-300 ${open ? 'bottom-1/2 translate-y-1/2 -rotate-45' : ''}`} />
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[79] bg-[var(--bg-main)]/95 backdrop-blur-2xl transition-opacity duration-400 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col items-center justify-center gap-3">
          {LINKS.map((l, i) => (
            <a
              key={l.id}
              href={l.isPage ? l.to : `/#${l.id}`}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                setTimeout(() => {
                  if (l.isPage) {
                    navigate(l.to);
                  } else {
                    if (path !== '/') {
                      navigate('/', l.id);
                    } else {
                      scrollTo(l.id);
                    }
                  }
                }, 80);
              }}
              className={`font-display text-3xl font-semibold tracking-tight text-[var(--text-sub)] transition-all duration-500 hover:text-[var(--text-main)] ${
                open ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
              style={{ transitionDelay: `${80 + i * 50}ms` }}
            >
              <span className={active === l.id ? 'grad-text' : ''}>{l.label}</span>
            </a>
          ))}

          {/* Theme Toggle Pill for Mobile */}
          <button
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
            type="button"
            className="glass-card mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-[var(--text-main)] shadow-lg"
          >
            {isDark ? (
              <>
                <FiSun className="h-4 w-4 text-[#83E8F5]" />
                <span>Light Theme</span>
              </>
            ) : (
              <>
                <FiMoon className="h-4 w-4 text-[#087F9B]" />
                <span>Dark Theme</span>
              </>
            )}
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className={`glass-card mt-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-2.5 font-mono text-xs uppercase tracking-widest text-[var(--text-sub)] transition-all duration-500 hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] ${open ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: '380ms' }}
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </>
  );
}
