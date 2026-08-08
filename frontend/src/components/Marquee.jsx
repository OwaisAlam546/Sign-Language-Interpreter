// Decorative counter-scrolling marquee word bands.
export default function Marquee({ words = [], variant = 'solid', className = '', speed = 28 }) {
  const render = (arr, key) => (
    <div key={key} className="flex shrink-0 items-center">
      {arr.map((w, i) => (
        <span key={`${key}-${i}`} className="flex items-center">
          <span className={`whitespace-nowrap px-6 font-display text-[clamp(2.6rem,7vw,6rem)] font-bold leading-none tracking-tight ${
            variant === 'outline' ? 'text-stroke' : 'text-white/90'
          }`}>{w}</span>
          <span className="mx-4 text-2xl text-cyan-400/60">✦</span>
        </span>
      ))}
    </div>
  );

  const doubled = [...words, ...words];
  return (
    <div className="relative z-10 overflow-hidden border-y border-white/6 py-6" style={{ maskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)' }}>
      <div className="marquee-track" style={{ animation: `marquee ${speed}s linear infinite` }}>
        {render(doubled, 'a')}
        {render(doubled, 'b')}
      </div>
    </div>
  );
}