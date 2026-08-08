// TECH STACK — glowing technology wall + giant marquee band.
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import Marquee from '../components/Marquee.jsx';
import { TECH_STACK } from '../lib/data.js';

export default function TechStack() {
  return (
    <section id="stack" className="relative z-10 py-24 md:py-32">
      {/* giant marquee band */}
      <Marquee
        words={['React', 'TensorFlow', 'MediaPipe', 'OpenCV', 'Flask', 'Keras', 'Python']}
        variant="outline"
        speed={34}
        className="mb-20"
      />

      <div className="px-5 md:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Built On"
            title="A Modern AI Stack"
            sub="Every layer chosen for one goal: real-time performance. From browser to model, each technology has a specific job."
          />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {TECH_STACK.map((t, i) => (
              <Reveal key={t.name} delay={(i % 4) * 0.06} className="h-full">
                <div
                  className="glass sheen group relative h-full overflow-hidden rounded-2xl p-6 text-center transition-all duration-500 hover:-translate-y-2"
                  style={{ '--glow': t.color }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 44px -6px ${t.color}66, 0 18px 40px -20px rgba(0,0,0,0.8)`)}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '')}
                >
                  {/* halo */}
                  <span
                    className="absolute left-1/2 top-0 h-20 w-40 -translate-x-1/2 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
                    style={{ background: t.color }}
                    aria-hidden="true"
                  />
                  <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl ring-1 ring-white/10" style={{ background: `${t.color}18`, color: t.color }}>
                    <span className="h-3 w-3 rounded-full" style={{ background: t.color, boxShadow: `0 0 12px ${t.color}` }} />
                  </span>
                  <div className="font-display text-lg font-semibold text-white">{t.name}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{t.role}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
