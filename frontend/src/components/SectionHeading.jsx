// Section heading lockup: eyebrow chip + huge headline + sub copy.
import SplitText from './SplitText.jsx';
import Reveal from './Reveal.jsx';

export default function SectionHeading({ eyebrow, title, sub, align = 'center', className = '' }) {
  const alignCls = align === 'center' ? 'text-center items-center' : 'text-left items-start';
  return (
    <div className={`relative z-10 mb-5 sm:mb-6 md:mb-7 flex flex-col gap-2 sm:gap-2.5 ${alignCls} ${className}`}>
      {eyebrow && (
        <Reveal>
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 status-dot" />
            {eyebrow}
          </span>
        </Reveal>
      )}
      <SplitText
        text={title}
        className="max-w-3xl font-display text-[clamp(1.85rem,3.4vw,2.95rem)] font-bold leading-[1.08] tracking-tight text-white"
      />
      {sub && (
        <Reveal delay={0.15}>
          <p className={`max-w-2xl text-xs sm:text-sm md:text-[15px] leading-relaxed text-slate-300/90 ${align === 'center' ? 'mx-auto' : ''}`}>
            {sub}
          </p>
        </Reveal>
      )}
    </div>
  );
}
