// SUPPORTED GESTURES — searchable, filterable A–Z + words grid.
// Hovering a card reveals a small live-signing hand preview (rendered lazily).
import { useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import HandSkeleton from '../components/HandSkeleton.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import { LETTERS, WORDS } from '../lib/data.js';

export default function SupportedGestures() {
  const [tab, setTab] = useState('letters');
  const [q, setQ] = useState('');
  const [hoverId, setHoverId] = useState(null);

  const letters = useMemo(
    () => LETTERS.filter(([l, d]) => l.toLowerCase().includes(q.toLowerCase()) || d.toLowerCase().includes(q.toLowerCase())),
    [q]
  );
  const words = useMemo(
    () => WORDS.filter((w) => w.name.toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  return (
    <section id="gestures" className="relative z-10 px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Gesture Library"
          title="26 Letters. 15 Words. One Language."
          sub="A complete ASL alphabet with single-hand gestures alongside dynamic word-level signs performed with both hands."
        />

        {/* controls */}
        <Reveal>
          <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-4 sm:flex-row">
            {/* tabs */}
            <div className="glass flex rounded-full p-1">
              {[
                ['letters', `Letters (${LETTERS.length})`],
                ['words', `Words (${WORDS.length})`],
              ].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => { setTab(k); setHoverId(null); }}
                  className={`rounded-full px-5 py-2 font-display text-sm transition-all duration-300 ${
                    tab === k ? 'bg-gradient-to-r from-sky-500 via-cyan-400 to-violet-500 text-ink-950' : 'text-slate-400 hover:text-white'
                  }`}
                  aria-pressed={tab === k}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* search */}
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tab === 'letters' ? 'Search a letter or gesture…' : 'Search a word…'}
                className="field w-full rounded-full py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500"
                aria-label="Search gestures"
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>
        </Reveal>

        {/* grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {tab === 'letters' &&
            letters.map(([l, d], i) => (
              <GestureCard key={l} letter={l} detail={d} pre={i} hovered={hoverId === l} onHovered={(v) => setHoverId(v ? l : null)} />
            ))}
          {tab === 'words' &&
            words.map((w) => (
              <WordCard key={w.name} w={w} hoverId={hoverId} setHoverId={setHoverId} />
            ))}
        </div>

        {((tab === 'letters' && letters.length === 0) || (tab === 'words' && words.length === 0)) && (
          <p className="mt-10 text-center font-mono text-sm uppercase tracking-widest text-slate-500">No gestures match “{q}”.</p>
        )}
      </div>
    </section>
  );
}

function GestureCard({ letter, detail, pre = 0, hovered, onHovered }) {
  return (
    <Reveal delay={pre * 0.02} className="h-full">
      <div
        onMouseEnter={() => onHovered(true)}
        onMouseLeave={() => onHovered(false)}
        className={`glass sheen group relative h-full overflow-hidden rounded-2xl p-5 text-center transition-all duration-500 hover:-translate-y-1.5 hover:border-cyan-400/30 hover:shadow-glow ${hovered ? 'bg-ink-950/80' : ''}`}
      >
        <div className="relative mx-auto grid h-20 w-20 place-items-center">
          {hovered ? (
            <HandSkeleton pose={letter} className="h-16 w-16" glow={true} />
          ) : (
            <span className="font-display text-5xl font-bold grad-text transition-transform duration-500 group-hover:scale-110">{letter}</span>
          )}
        </div>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">Sign {letter}</div>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{detail}</p>
      </div>
    </Reveal>
  );
}

function WordCard({ w, hoverId, setHoverId }) {
  const active = hoverId === w.name;
  return (
    <Reveal className="h-full">
      <div
        onMouseEnter={() => setHoverId(w.name)}
        onMouseLeave={() => setHoverId(null)}
        className="glass sheen group relative h-full overflow-hidden rounded-3xl p-5 transition-all duration-500 hover:-translate-y-1.5 hover:border-violet-400/30 hover:shadow-glow-violet"
      >
        <div className="mb-2 flex h-14 items-center justify-center">
          {active ? (
            <HandSkeleton auto={w.pose} className="h-14 w-14" />
          ) : (
            <span className="font-display text-lg font-semibold text-white">{w.name}</span>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-1" aria-hidden="true">
          {w.pose.slice(0, 4).map((p) => (
            <span key={p} className="h-1.5 w-1.5 rounded-full bg-violet-400/70" />
          ))}
        </div>
        <div className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Dynamic · double-hand</div>
      </div>
    </Reveal>
  );
}