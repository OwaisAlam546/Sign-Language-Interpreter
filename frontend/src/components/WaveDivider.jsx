// Lightweight, responsive SVG flowing wave divider component
// Creates smooth organic transitions between White and Platinum/Elevated sections in Light Mode
// In Dark Mode, gracefully blends into the midnight navy/deep canvas without visual intrusion.

export default function WaveDivider({
  flip = false,
  fillColor = '#E6EBF1',
  darkFillColor = 'rgba(8, 21, 34, 0.4)',
  className = '',
  height = 48,
}) {
  return (
    <div
      className={`pointer-events-none w-full overflow-hidden leading-none select-none transition-colors duration-500 ${
        flip ? 'wave-divider-exit' : 'wave-divider-enter'
      } ${className}`}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        className={`h-full w-full block ${flip ? 'rotate-180' : ''}`}
      >
        <path
          className="transition-colors duration-500"
          style={{
            fill: 'var(--wave-fill, currentColor)',
          }}
          d="M0,24 C280,56 520,8 820,40 C1100,68 1320,16 1440,36 L1440,65 L0,65 Z"
        />
        <path
          className="wave-curve-border transition-colors duration-500"
          style={{
            stroke: 'var(--wave-stroke, transparent)',
            fill: 'none',
            strokeWidth: '1.2px',
            vectorEffect: 'non-scaling-stroke',
          }}
          d="M0,24 C280,56 520,8 820,40 C1100,68 1320,16 1440,36"
        />
      </svg>
    </div>
  );
}
