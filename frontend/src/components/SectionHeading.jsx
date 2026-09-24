// Section heading lockup: eyebrow chip + huge headline + sub copy.
import SplitText from './SplitText.jsx';
import Reveal from './Reveal.jsx';

export default function SectionHeading({ eyebrow, title, sub, align = 'center' }) {
  const alignCls = align === 'center' ? 'text-center items-center' : 'text-left items-start';
  return (
    <div className={`relative z-10 mb-14 flex flex-col gap-5 md:mb-20 ${alignCls}`}>
      <Reveal>
        <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 status-dot" />
          {eyebrow}
        </span>
      </Reveal>
      <SplitText
        text={title}
        className="max-w-4xl font-display text-[clamp(2.2rem,5.2vw,4.4rem)] font-semibold leading-[1.02] tracking-tight text-white"
      />
      {sub && (
        <Reveal delay={0.15}>
          <p className={`max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg ${align === 'center' ? 'mx-auto' : ''}`}>
            {sub}
          </p>
        </Reveal>
      )}
    </div>
  );
}
