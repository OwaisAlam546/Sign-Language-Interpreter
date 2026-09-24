// SUPPORTED GESTURES — 3D Infinite Circular Rotating Carousel & Grid Library.
// Rich glassmorphic cards with generous, luxurious padding and balanced typography.
// Search automatically rotates the searched alphabet/word directly in front of the user and highlights it with live signing.
// Uniform, calibrated rotational velocity for both Letters & Words with zero card overlap.
import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { FiSearch, FiChevronLeft, FiChevronRight, FiGrid, FiRotateCw, FiMove, FiX, FiArrowRight } from 'react-icons/fi';
import HandSkeleton, { TwoHandWordSign, isTwoHandedWord } from '../components/HandSkeleton.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';
import { LETTERS, WORDS } from '../lib/data.js';

// Helper for responsive word title typography
const getWordTitleClass = (text) => {
  if (text.length <= 3) return 'text-2xl sm:text-3xl font-bold';
  if (text.length <= 6) return 'text-xl sm:text-2xl font-bold';
  if (text.length <= 9) return 'text-base sm:text-lg font-bold tracking-tight';
  return 'text-sm sm:text-base font-bold tracking-tight';
};

// Synchronizes Word HandSkeleton with the exact palm heel connection node & topology as Letters.
function syncHandSvg(svg) {
  if (!svg) return;
  const circles = svg.querySelectorAll('circle:not(.palm-heel-dot)');
  const lines = svg.querySelectorAll('line:not([class*="palm-heel"])');
  if (circles.length < 21 || lines.length < 21) return;

  const isHand2 = Boolean(svg.querySelector('#hand-line-h2') || lines[0]?.getAttribute('stroke')?.includes('h2'));

  // 1. Hide the direct bone line [0, 17] (the 21st bone, index 20) to match Letters topology
  if (lines[20] && lines[20].style.display !== 'none') {
    lines[20].style.display = 'none';
    lines[20].setAttribute('display', 'none');
  }

  // 2. Match visual gradients and stroke styles
  const lineGradId = isHand2 ? 'url(#hand-line-h2)' : 'url(#hand-line-h1)';
  const dotGradId = isHand2 ? 'url(#hand-dot-h2)' : 'url(#hand-dot-h1)';
  const strokeW = isHand2 ? '1.3' : '1.4';
  const lineOpacity = isHand2 ? '0.80' : '0.85';

  // 4. Find or create palm heel elements
  let palmDot = svg.querySelector('.palm-heel-dot');
  let palmLineA = svg.querySelector('.palm-heel-line-17');
  let palmLineB = svg.querySelector('.palm-heel-line-0');

  const groups = svg.querySelectorAll('g');
  const boneGroup = groups[0] || svg;
  const dotGroup = groups[1] || svg;

  if (!palmDot) {
    palmDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    palmDot.setAttribute('class', 'palm-heel-dot');
    palmDot.setAttribute('r', '2.0');
    palmDot.setAttribute('fill', dotGradId);
    palmDot.setAttribute('stroke', '#0B0F19');
    palmDot.setAttribute('stroke-width', '0.6');
    palmDot.setAttribute('shape-rendering', 'geometricPrecision');
    palmDot.setAttribute('display', 'none');
    dotGroup.appendChild(palmDot);
  }

  if (!palmLineA) {
    palmLineA = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    palmLineA.setAttribute('class', 'palm-heel-line-17');
    palmLineA.setAttribute('stroke', lineGradId);
    palmLineA.setAttribute('stroke-width', strokeW);
    palmLineA.setAttribute('stroke-linecap', 'round');
    palmLineA.setAttribute('opacity', lineOpacity);
    palmLineA.setAttribute('shape-rendering', 'geometricPrecision');
    palmLineA.setAttribute('display', 'none');
    boneGroup.appendChild(palmLineA);
  }

  if (!palmLineB) {
    palmLineB = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    palmLineB.setAttribute('class', 'palm-heel-line-0');
    palmLineB.setAttribute('stroke', lineGradId);
    palmLineB.setAttribute('stroke-width', strokeW);
    palmLineB.setAttribute('stroke-linecap', 'round');
    palmLineB.setAttribute('opacity', lineOpacity);
    palmLineB.setAttribute('shape-rendering', 'geometricPrecision');
    palmLineB.setAttribute('display', 'none');
    boneGroup.appendChild(palmLineB);
  }

  // 5. Read coordinates from landmarks 0 (wrist), 5 (index MCP), 17 (pinky MCP)
  const x0 = parseFloat(circles[0].getAttribute('cx'));
  const y0 = parseFloat(circles[0].getAttribute('cy'));
  const x5 = parseFloat(circles[5].getAttribute('cx'));
  const y5 = parseFloat(circles[5].getAttribute('cy'));
  const x17 = parseFloat(circles[17].getAttribute('cx'));
  const y17 = parseFloat(circles[17].getAttribute('cy'));

  if (isNaN(x0) || isNaN(y0) || isNaN(x5) || isNaN(y5) || isNaN(x17) || isNaN(y17)) return;

  // 6. Affine invariant palm heel coordinate tracking
  const v1x = x17 - x5;
  const v1y = y17 - y5;
  const v2x = x17 - x0;
  const v2y = y17 - y0;

  const x21 = x0 + 0.74725 * v1x + 0.17445 * v2x;
  const y21 = y0 + 0.74725 * v1y + 0.17445 * v2y;

  const sX21 = x21.toFixed(2);
  const sY21 = y21.toFixed(2);
  const sX17 = x17.toFixed(2);
  const sY17 = y17.toFixed(2);
  const sX0 = x0.toFixed(2);
  const sY0 = y0.toFixed(2);

  palmDot.setAttribute('cx', sX21);
  palmDot.setAttribute('cy', sY21);
  palmDot.setAttribute('display', '');
  palmDot.style.display = '';

  palmLineA.setAttribute('x1', sX17);
  palmLineA.setAttribute('y1', sY17);
  palmLineA.setAttribute('x2', sX21);
  palmLineA.setAttribute('y2', sY21);
  palmLineA.setAttribute('display', '');
  palmLineA.style.display = '';

  palmLineB.setAttribute('x1', sX21);
  palmLineB.setAttribute('y1', sY21);
  palmLineB.setAttribute('x2', sX0);
  palmLineB.setAttribute('y2', sY0);
  palmLineB.setAttribute('display', '');
  palmLineB.style.display = '';
}

// Wrapper for Words in 3D Wheel ensuring exact same palm/connection node rendering as Letters
function WordWheelHandSkeleton({ word, className = '', glow = true }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let animId;
    const sync = () => {
      if (containerRef.current) {
        const svgs = containerRef.current.querySelectorAll('svg');
        svgs.forEach((svg) => syncHandSvg(svg));
      }
      animId = requestAnimationFrame(sync);
    };
    sync();
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [word]);

  return (
    <div ref={containerRef} className="contents">
      {isTwoHandedWord(word) ? (
        <TwoHandWordSign
          key={word}
          word={word}
          className={className}
          glow={glow}
        />
      ) : (
        <HandSkeleton
          key={word}
          word={word}
          className={className}
          glow={glow}
        />
      )}
    </div>
  );
}

// Unified interactive Gesture Card Content with coordinated 600ms hover transition, scale-up & delayed sign animation
const GestureCardContent = memo(function GestureCardContent({
  item,
  isHovered,
  isSearchMatch,
  isActive = false,
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Manage mount lifecycle and delayed animation start (~600ms coordinated transition)
  useEffect(() => {
    let unmountTimer;
    let animTimer;

    if (isHovered) {
      setIsMounted(true);
      // Start live animation only after the 600ms coordinated hover transition finishes
      animTimer = setTimeout(() => {
        setIsAnimating(true);
      }, 550);
    } else {
      setIsAnimating(false);
      // Hide/unmount HandSkeleton completely once reverse transition finishes (600ms)
      unmountTimer = setTimeout(() => {
        setIsMounted(false);
      }, 600);
    }

    return () => {
      clearTimeout(unmountTimer);
      clearTimeout(animTimer);
    };
  }, [isHovered]);

  return (
    <div className="relative flex h-full w-full flex-col justify-between select-none">
      {/* 1. TOP TITLE / LABEL AREA (Smoothly glides between centered normal state & top label on hover) */}
      <div
        className="relative w-full z-20 shrink-0"
        style={{
          transform: isHovered
            ? 'translate3d(0, 0px, 0)'
            : 'translate3d(0, 42px, 0)',
          transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="flex flex-col items-center justify-center">
          {!item.isWord ? (
            <span
              className={`font-display font-bold tracking-tight ${
                isHovered
                  ? 'text-xs sm:text-[12px] font-mono uppercase tracking-widest text-cyan-300 font-semibold flex items-center justify-center gap-1.5'
                  : `text-white ${getWordTitleClass(item.title)}`
              } ${
                isSearchMatch && !isHovered
                  ? 'text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.85)]'
                  : ''
              }`}
              style={{
                transition: 'all 600ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {isHovered && (
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              )}
              <span>{isHovered ? `SIGN · ${item.title}` : item.title}</span>
            </span>
          ) : (
            <span
              className={`font-display font-bold tracking-tight inline-block ${getWordTitleClass(item.title)} ${
                isHovered
                  ? 'text-cyan-300'
                  : isSearchMatch
                  ? 'text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.85)]'
                  : 'text-white'
              }`}
              style={{
                transform: isHovered ? 'scale(0.70)' : 'scale(1.0)',
                transformOrigin: 'center center',
                transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1), color 600ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {item.title}
            </span>
          )}

          {/* "Hover to sign" badge — smoothly fades & collapses on hover */}
          <span
            className="inline-flex items-center rounded-full font-mono text-[8.5px] uppercase tracking-widest"
            style={{
              opacity: isHovered ? 0 : 1,
              maxHeight: isHovered ? '0px' : '24px',
              marginTop: isHovered ? '0px' : '8px',
              transform: `translate3d(0, ${isHovered ? '-6px' : '0px'}, 0)`,
              pointerEvents: isHovered ? 'none' : 'auto',
              overflow: 'hidden',
              transition: item.isWord
                ? 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), max-height 600ms cubic-bezier(0.16, 1, 0.3, 1), margin 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)'
                : 'opacity 500ms cubic-bezier(0.16, 1, 0.3, 1), max-height 500ms cubic-bezier(0.16, 1, 0.3, 1), margin 500ms cubic-bezier(0.16, 1, 0.3, 1), transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span
              className={`px-2.5 py-0.5 rounded-full transition-colors duration-200 ${
                isSearchMatch
                  ? 'bg-cyan-400/25 border border-cyan-400/60 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                  : 'bg-white/[0.06] border border-white/12 text-slate-300'
              }`}
            >
              {isSearchMatch ? 'Matched' : 'Hover to sign'}
            </span>
          </span>
        </div>
      </div>

      {/* 2. CENTRAL HANDSKELETON VISUAL CANVAS (Smoothly reveals & scales UP on hover, NOT rendered when resting) */}
      <div
        className="relative flex-1 w-full flex items-center justify-center my-auto"
        style={{
          minHeight: item.isWord ? '112px' : isHovered ? '136px' : '96px',
          transition: item.isWord ? 'none' : 'min-height 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            transform: isHovered
              ? isTwoHandedWord(item.title)
                ? 'scale(1.22) translate3d(0, 4px, 0)'
                : 'scale(1.36) translate3d(0, 6px, 0)'
              : 'scale(0.78) translate3d(0, 0, 0)',
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? 'auto' : 'none',
            transition: item.isWord
              ? 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)'
              : 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 550ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {isMounted && (
            item.isWord ? (
              <WordWheelHandSkeleton
                word={item.title}
                className={
                  isTwoHandedWord(item.title)
                    ? 'h-[96px] w-[130px] sm:h-[104px] sm:w-[138px]'
                    : 'h-[96px] w-[96px] sm:h-[104px] sm:w-[104px]'
                }
                glow={true}
              />
            ) : (
              <HandSkeleton
                key={isAnimating ? `${item.pose}-active` : `${item.pose}-static`}
                pose={item.pose}
                loop={isAnimating}
                className="h-[96px] w-[96px] sm:h-[104px] sm:w-[104px]"
                glow={true}
              />
            )
          )}
        </div>
      </div>

      {/* 3. BOTTOM DETAILS SECTION (Smoothly fades & collapses on hover, giving full card space to HandSkeleton) */}
      <div
        className="w-full text-center shrink-0"
        style={{
          maxHeight: isHovered ? '0px' : '90px',
          opacity: isHovered ? 0 : 1,
          paddingTop: isHovered ? '0px' : '10px',
          borderTop: isHovered ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)',
          transform: `translate3d(0, ${isHovered ? '10px' : '0px'}, 0)`,
          pointerEvents: isHovered ? 'none' : 'auto',
          overflow: 'hidden',
          transition: item.isWord
            ? 'max-height 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), padding 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1), border-color 600ms cubic-bezier(0.16, 1, 0.3, 1)'
            : 'max-height 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 500ms cubic-bezier(0.16, 1, 0.3, 1), padding 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1), border-color 400ms ease',
        }}
      >
        <div
          className={`font-mono text-[9px] uppercase tracking-[0.18em] font-semibold leading-none transition-colors duration-300 ${
            isSearchMatch ? 'text-cyan-300' : 'text-cyan-300/90'
          }`}
        >
          {item.subtitle}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-300 line-clamp-2 px-1">
          {item.detail}
        </p>
      </div>

      {/* Active Indicator Bar (for 3D Wheel) */}
      {isActive && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
      )}
    </div>
  );
});

// Memoized Gesture Card for the Grid View — Sophisticated AI-Product Card Hover Interaction
const GridGestureCard = memo(function GridGestureCard({
  item,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const rafRef = useRef(null);

  // Targets and lerped values for micro-tilt & ambient surface light
  const targetTilt = useRef({ x: 0, y: 0, lx: 50, ly: 50 });
  const currentTilt = useRef({ x: 0, y: 0, lx: 50, ly: 50 });
  const isInteracting = useRef(false);

  // Detect touch / reduced motion once
  const isTouchOrReduced = useRef(
    typeof window !== 'undefined' &&
      (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );

  // Smooth rAF loop for micro-tilt & light interpolation
  const startTiltLoop = useCallback(() => {
    if (rafRef.current) return;

    const tick = () => {
      // Lerp with critically damped easing (smooth, zero twitch)
      currentTilt.current.x += (targetTilt.current.x - currentTilt.current.x) * 0.10;
      currentTilt.current.y += (targetTilt.current.y - currentTilt.current.y) * 0.10;
      currentTilt.current.lx += (targetTilt.current.lx - currentTilt.current.lx) * 0.10;
      currentTilt.current.ly += (targetTilt.current.ly - currentTilt.current.ly) * 0.10;

      if (cardRef.current) {
        cardRef.current.style.setProperty('--rx', `${currentTilt.current.x.toFixed(2)}deg`);
        cardRef.current.style.setProperty('--ry', `${currentTilt.current.y.toFixed(2)}deg`);
        cardRef.current.style.setProperty('--lx', `${currentTilt.current.lx.toFixed(1)}%`);
        cardRef.current.style.setProperty('--ly', `${currentTilt.current.ly.toFixed(1)}%`);
      }

      // Keep ticking while interacting or until resting equilibrium is reached
      const isSettled =
        !isInteracting.current &&
        Math.abs(currentTilt.current.x) < 0.02 &&
        Math.abs(currentTilt.current.y) < 0.02;

      if (!isSettled) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        if (cardRef.current) {
          cardRef.current.style.setProperty('--rx', '0deg');
          cardRef.current.style.setProperty('--ry', '0deg');
        }
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleMouseEnter = () => {
    isInteracting.current = true;
    setIsHovered(true);
    if (!isTouchOrReduced.current) {
      startTiltLoop();
    }
  };

  const handleMouseMove = (e) => {
    if (isTouchOrReduced.current || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
    const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2; // -1 to 1

    // Subtle 3D tilt capped at max 2.2 degrees
    targetTilt.current.y = Math.max(-2.2, Math.min(2.2, normX * 2.2));
    targetTilt.current.x = Math.max(-2.2, Math.min(2.2, -normY * 2.2));

    // Specular light coordinates
    targetTilt.current.lx = ((e.clientX - rect.left) / rect.width) * 100;
    targetTilt.current.ly = ((e.clientY - rect.top) / rect.height) * 100;

    if (!rafRef.current) startTiltLoop();
  };

  const handleMouseLeave = () => {
    isInteracting.current = false;
    setIsHovered(false);
    targetTilt.current.x = 0;
    targetTilt.current.y = 0;
    targetTilt.current.lx = 50;
    targetTilt.current.ly = 50;
    if (!isTouchOrReduced.current) {
      startTiltLoop();
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onPointerLeave={handleMouseLeave}
      className={`relative h-full select-none ${isHovered ? 'z-30' : 'z-10'}`}
    >
      <div
        ref={cardRef}
        className={`card-3d-crisp card-border-glow group relative flex h-full min-h-[220px] sm:min-h-[245px] flex-col justify-between overflow-hidden rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 text-center transition-all duration-300 cursor-pointer ${
          isHovered
            ? 'is-hovered bg-slate-900/95 -translate-y-1'
            : 'bg-slate-950/90 shadow-2xl'
        }`}
      >
        {/* Subtle frosted glass specular light following cursor */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(280px circle at var(--lx, 50%) var(--ly, 50%), rgba(34, 211, 238, 0.08), rgba(139, 92, 246, 0.03) 40%, transparent 70%)`,
          }}
        />

        {/* Specular top rim border line light */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-[1.5px] transition-all duration-300 z-10 ${
            isHovered
              ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-100 shadow-[0_0_12px_rgba(34,211,238,0.9)]'
              : 'bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40 group-hover:via-cyan-400 group-hover:opacity-100'
          }`}
        />

        <GestureCardContent
          item={item}
          isHovered={isHovered}
          isSearchMatch={false}
        />
      </div>
    </div>
  );
});

export default function SupportedGestures() {
  const [tab, setTab] = useState('letters'); // 'letters' | 'words'
  const [viewMode, setViewMode] = useState('carousel'); // 'carousel' | 'grid'
  const [q, setQ] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverDirection, setHoverDirection] = useState(null); // 'left' | 'right' | 'center' | null
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Responsive dimensions for 3D cylinder
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;

  // Active items based on tab
  const rawItems = useMemo(() => {
    if (tab === 'letters') {
      return LETTERS.map(([letter, detail], idx) => ({
        id: letter,
        title: letter,
        subtitle: 'Alphabet Sign',
        detail,
        isWord: false,
        pose: letter,
        index: idx,
      }));
    } else {
      return WORDS.map((w, idx) => ({
        id: w.name,
        title: w.name,
        subtitle: 'Dynamic · double-hand',
        detail: w.detail,
        isWord: true,
        pose: w.pose,
        index: idx,
      }));
    }
  }, [tab]);

  // Search matching indices for active tab
  const matchingIndices = useMemo(() => {
    if (!q.trim()) return [];
    const query = q.trim().toLowerCase();
    const indices = [];
    rawItems.forEach((item, idx) => {
      if (tab === 'letters') {
        if (item.title.toLowerCase() === query) {
          indices.push(idx);
        }
      } else {
        if (item.title.toLowerCase().includes(query)) {
          indices.push(idx);
        }
      }
    });
    return indices;
  }, [q, rawItems, tab]);

  // Cross-tab search matches count (e.g. typing a word while on letters tab)
  const otherTabMatches = useMemo(() => {
    if (!q.trim()) return 0;
    const query = q.trim().toLowerCase();
    if (tab === 'letters') {
      return WORDS.filter((w) => w.name.toLowerCase().includes(query)).length;
    } else {
      return LETTERS.filter(([l]) => l.toLowerCase() === query).length;
    }
  }, [q, tab]);

  // Filtered items for Grid view
  const filteredGridItems = useMemo(() => {
    if (!q.trim()) return rawItems;
    return rawItems.filter((_, idx) => matchingIndices.includes(idx));
  }, [rawItems, q, matchingIndices]);

  // ── WHEEL GEOMETRY: 15-SLOT CYLINDER PROPORTIONS COPIED FROM WORDS ──
  const WHEEL_SLOTS = 15;
  const angleStep = 360 / WHEEL_SLOTS; // 24 degrees

  // Proportional sleek cards with larger, balanced luxurious dimensions
  const cardWidth = isMobile ? 130 : isTablet ? 156 : 186;
  const cardHeight = isMobile ? 194 : isTablet ? 230 : 260;
  const cardGap = isMobile ? 20 : isTablet ? 26 : 34;
  const targetChord = cardWidth + cardGap; // 220px on desktop

  // Unified cylinder radius based on the 15-slot cylinder
  const radius = useMemo(() => {
    return Math.max(330, Math.round(targetChord / (2 * Math.sin(Math.PI / WHEEL_SLOTS))));
  }, [targetChord]);

  const depthOffset = Math.round(radius * 0.28);
  const perspective = Math.max(1100, Math.round(radius * 1.7));

  // ── UNIFORM SPEED CALIBRATION: FAST, DYNAMIC & CRISP DRIFT ──
  const BASE_LINEAR_SPEED = 2.25; // fast, lively drift (~135 px/sec)
  const HOVER_MAX_LINEAR_SPEED = 11.0;

  const baseAngularSpeed = useMemo(() => {
    return -((BASE_LINEAR_SPEED / radius) * (180 / Math.PI));
  }, [radius]);

  // Animation & Physics Refs
  const stageRef = useRef(null);
  const cylinderRef = useRef(null);
  const rotationRef = useRef(0);
  const currentSpeedRef = useRef(baseAngularSpeed);
  const targetSpeedRef = useRef(baseAngularSpeed);
  const hoveredCardRef = useRef(null);
  const animTargetRef = useRef(null);
  const lastActiveRef = useRef(0);
  const lastStepRef = useRef(0);
  const [wheelStep, setWheelStep] = useState(0);

  // Sync speed when radius changes (viewport resize)
  useEffect(() => {
    targetSpeedRef.current = isSearchingRef.current ? 0 : baseAngularSpeed;
    currentSpeedRef.current = isSearchingRef.current ? 0 : baseAngularSpeed;
  }, [baseAngularSpeed]);

  const isSearchingRef = useRef(Boolean(q.trim()));

  // Drag & Flick momentum physics refs
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartAngleRef = useRef(0);
  const moveHistoryRef = useRef([]);
  const isFlickingRef = useRef(false);
  const flickVelocityRef = useRef(0);

  // Smooth rAF loop for hardware-accelerated 3D rotation with delta-time normalization
  useEffect(() => {
    let rafId;
    let lastTime = performance.now();

    const tick = (now) => {
      const dt = Math.min((now - lastTime) / 16.667, 2.0);
      lastTime = now;

      // 1. Direct Target Animation (when searching, clicking ribbon, or chevron)
      if (animTargetRef.current !== null) {
        const diff = animTargetRef.current - rotationRef.current;
        if (Math.abs(diff) < 0.04) {
          rotationRef.current = animTargetRef.current;
          animTargetRef.current = null;
          targetSpeedRef.current = isSearchingRef.current ? 0 : baseAngularSpeed;
          currentSpeedRef.current = isSearchingRef.current ? 0 : baseAngularSpeed;
        } else {
          // Silky smooth critically damped spring (frame-rate independent)
          const ease = 1 - Math.pow(0.001, dt * 0.055);
          rotationRef.current += diff * Math.min(ease, 0.20);
        }
      } else if (isDraggingRef.current) {
        // Direct manipulation handled synchronously in pointermove for instantaneous responsiveness
      } else if (isFlickingRef.current) {
        // 2. Momentum / Flick Physics with natural continuous friction decay (no 360 jump)
        rotationRef.current += flickVelocityRef.current * dt;
        flickVelocityRef.current *= Math.pow(0.955, dt); // silky momentum decay
        if (Math.abs(flickVelocityRef.current) < 0.03) {
          flickVelocityRef.current = 0;
          isFlickingRef.current = false;
          targetSpeedRef.current = isSearchingRef.current ? 0 : baseAngularSpeed;
          currentSpeedRef.current = isSearchingRef.current ? 0 : baseAngularSpeed;
        }
      } else {
        // 3. Continuous hover / drift velocity physics with silky smooth exponential damping (no 360 jump)
        const lerpFactor = 1 - Math.pow(0.005, dt * 0.045);
        currentSpeedRef.current += (targetSpeedRef.current - currentSpeedRef.current) * lerpFactor;
        rotationRef.current += currentSpeedRef.current * dt;
      }

      // Apply transform to cylinder using 3D hardware-accelerated matrix
      if (cylinderRef.current) {
        cylinderRef.current.style.transform = `translate3d(0, 0, -${depthOffset}px) rotate3d(0, 1, 0, ${rotationRef.current.toFixed(3)}deg)`;
      }

      // Update active center card index & slot mapping step smoothly
      const currentStep = Math.round(-rotationRef.current / angleStep);
      if (currentStep !== lastStepRef.current) {
        lastStepRef.current = currentStep;
        setWheelStep(currentStep);
        const total = rawItems.length;
        const currentActive = ((currentStep % total) + total) % total;
        if (currentActive !== lastActiveRef.current) {
          lastActiveRef.current = currentActive;
          setActiveIndex(currentActive);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [angleStep, depthOffset, rawItems.length, baseAngularSpeed]);

  // Rotate smoothly to specific card index so it comes DIRECTLY IN FRONT of the user
  const rotateToIndex = useCallback(
    (targetIdx) => {
      const total = rawItems.length;
      if (total <= 1) return;
      const currentActive = ((lastStepRef.current % total) + total) % total;
      let stepDiff = (targetIdx - currentActive) % total;
      if (stepDiff > total / 2) stepDiff -= total;
      if (stepDiff < -total / 2) stepDiff += total;
      const targetStep = lastStepRef.current + stepDiff;
      animTargetRef.current = -(targetStep * angleStep);
      targetSpeedRef.current = 0;
      currentSpeedRef.current = 0;
      setActiveIndex(targetIdx);
      lastActiveRef.current = targetIdx;
    },
    [rawItems.length, angleStep]
  );

  // SEARCH TRIGGER IN 3D WHEEL:
  // When user searches:
  // 1. Keep ALL cards visible (no removal, no hiding).
  // 2. Automatically rotate the matching card to FRONT CENTER.
  // 3. Stop the wheel once it reaches the front center.
  // 4. Highlight ONLY the searched card.
  // 5. When search is cleared: remove highlight and resume normal wheel rotation.
  useEffect(() => {
    isSearchingRef.current = Boolean(q.trim());
    if (q.trim()) {
      if (matchingIndices.length > 0) {
        rotateToIndex(matchingIndices[0]);
      } else {
        // No match: keep cards visible, stop drift in place
        animTargetRef.current = null;
        targetSpeedRef.current = 0;
        currentSpeedRef.current = 0;
      }
    } else {
      // Clear search: cancel target, resume normal drift rotation
      animTargetRef.current = null;
      targetSpeedRef.current = baseAngularSpeed;
    }
  }, [q, matchingIndices, rotateToIndex, baseAngularSpeed]);

  // Reset state when tab changes
  useEffect(() => {
    rotationRef.current = 0;
    animTargetRef.current = null;
    lastStepRef.current = 0;
    setWheelStep(0);
    setActiveIndex(0);
    lastActiveRef.current = 0;
    setHoveredId(null);
    hoveredCardRef.current = null;
    isDraggingRef.current = false;
    hasDraggedRef.current = false;
    isFlickingRef.current = false;
    flickVelocityRef.current = 0;
  }, [tab]);

  // Pointer interactions for Hover left/right & Drag-to-flick
  const handlePointerLeave = () => {
    if (!isDraggingRef.current && !isFlickingRef.current) {
      targetSpeedRef.current = isSearchingRef.current ? 0 : baseAngularSpeed;
      hoveredCardRef.current = null;
      setHoveredId(null);
      setHoverDirection(null);
    }
  };

  const handlePointerMove = (e) => {
    // 1. Handle active drag
    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartXRef.current;
      if (Math.abs(deltaX) > 5) {
        hasDraggedRef.current = true;
      }
      rotationRef.current = dragStartAngleRef.current + deltaX * 0.35;

      const now = performance.now();
      moveHistoryRef.current.push({ x: e.clientX, t: now });
      // Keep only recent samples (last 120ms)
      if (moveHistoryRef.current.length > 20) {
        moveHistoryRef.current = moveHistoryRef.current.filter((pt) => now - pt.t <= 120);
      }
      return;
    }

    // 2. If actively flicking, let momentum glide freely without hover interruption
    if (isFlickingRef.current) {
      return;
    }

    // 3. If hovering directly on a card, keep carousel firmly paused
    if (hoveredCardRef.current !== null) {
      targetSpeedRef.current = 0;
      currentSpeedRef.current = 0;
      return;
    }

    // 4. If search query is active, keep carousel firmly paused
    if (isSearchingRef.current) {
      targetSpeedRef.current = 0;
      currentSpeedRef.current = 0;
      return;
    }

    const stage = stageRef.current;
    if (!stage || rawItems.length <= 1) return;
    const rect = stage.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width; // 0 to 1
    const normX = (relX - 0.5) * 2; // -1 (far left) to +1 (far right)

    if (Math.abs(normX) < 0.15) {
      // Center zone: slow/pause
      targetSpeedRef.current = 0;
      setHoverDirection('center');
    } else if (normX < -0.15) {
      // Hovering LEFT: rewind cylinder backwards (26 to 1) with uniform linear speed
      const factor = (Math.abs(normX) - 0.15) / 0.85;
      const targetLinear = factor * HOVER_MAX_LINEAR_SPEED;
      targetSpeedRef.current = (targetLinear / radius) * (180 / Math.PI);
      setHoverDirection('left');
    } else {
      // Hovering RIGHT: advance cylinder forward (1 to 26) with uniform linear speed
      const factor = (normX - 0.15) / 0.85;
      const targetLinear = factor * HOVER_MAX_LINEAR_SPEED;
      targetSpeedRef.current = -((targetLinear / radius) * (180 / Math.PI));
      setHoverDirection('right');
    }
  };

  const handlePointerDown = (e) => {
    if (rawItems.length <= 1) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    isFlickingRef.current = false;
    flickVelocityRef.current = 0;
    animTargetRef.current = null;
    targetSpeedRef.current = 0;
    currentSpeedRef.current = 0;

    dragStartXRef.current = e.clientX;
    dragStartAngleRef.current = rotationRef.current;
    moveHistoryRef.current = [{ x: e.clientX, t: performance.now() }];
  };

  const handlePointerUp = (e) => {
    try {
      if (e && e.currentTarget && e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}

    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const now = performance.now();
    const history = moveHistoryRef.current || [];
    const recent = history.filter((pt) => now - pt.t <= 100);
    const oldest = recent.length > 0 ? recent[0] : history[history.length - 1];

    if (oldest && hasDraggedRef.current) {
      const dt = now - oldest.t;
      const dx = e.clientX - oldest.x;
      if (dt > 8 && Math.abs(dx) > 3) {
        const pxPerMs = dx / dt;
        const pxPerFrame = pxPerMs * 16.67;
        const degPerFrame = pxPerFrame * 0.35;
        // Clamp to a dynamic, natural flick speed range
        const clampedVel = Math.max(-26, Math.min(26, degPerFrame));

        if (Math.abs(clampedVel) > 0.35) {
          flickVelocityRef.current = clampedVel;
          isFlickingRef.current = true;
          currentSpeedRef.current = 0;
          targetSpeedRef.current = 0;
          setTimeout(() => {
            hasDraggedRef.current = false;
          }, 120);
          return;
        }
      }
    }

    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 80);

    // If no flick momentum, gently return to base drift (keep paused if search is active)
    targetSpeedRef.current = isSearchingRef.current ? 0 : baseAngularSpeed;
  };

  const handleCardHoverStart = (itemId) => {
    if (isDraggingRef.current || isFlickingRef.current) return;
    hoveredCardRef.current = itemId;
    currentSpeedRef.current = 0;
    targetSpeedRef.current = 0;
    animTargetRef.current = null;
    setHoveredId(itemId);
  };

  const handleCardHoverEnd = (itemId) => {
    if (!itemId || hoveredCardRef.current === itemId) {
      hoveredCardRef.current = null;
      setHoveredId(null);
      if (!isSearchingRef.current && !isDraggingRef.current && !isFlickingRef.current) {
        targetSpeedRef.current = baseAngularSpeed;
      }
    }
  };

  const currentActiveItem = rawItems[activeIndex] || rawItems[0];
  const activeSpotlightItem = hoveredId ? rawItems.find((it) => it.id === hoveredId) || currentActiveItem : currentActiveItem;

  return (
    <section id="gestures" className="relative z-10 px-4 py-24 md:px-8 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Interactive Sign Library"
          title="26 Letters. 15 Words. Live Animated Signs."
          sub="Experience sign language gestures in an interactive 3D circular wheel and grid. Search any letter or word to highlight matching signs with live signing."
        />

        {/* Controls Bar: Tabs, View Mode Switcher, Search */}
        <Reveal>
          <div className="mx-auto mb-8 flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
            {/* Category Tabs: Letters vs Words */}
            <div className="glass-card flex rounded-full p-1.5 shadow-2xl border border-white/12 bg-slate-950/80 backdrop-blur-xl">
              {[
                ['letters', `Letters (${LETTERS.length})`],
                ['words', `Words (${WORDS.length})`],
              ].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => {
                    setTab(k);
                    setHoveredId(null);
                    hoveredCardRef.current = null;
                  }}
                  className={`rounded-full px-5 py-2 font-display text-xs sm:text-sm font-medium transition-all duration-300 ${
                    tab === k
                      ? 'bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-500 text-slate-950 shadow-glow font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  aria-pressed={tab === k}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle: 3D Wheel vs Grid View */}
            <div className="glass-card flex items-center rounded-full p-1.5 shadow-2xl border border-white/12 bg-slate-950/80 backdrop-blur-xl">
              <button
                onClick={() => setViewMode('carousel')}
                className={`flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all duration-300 ${
                  viewMode === 'carousel'
                    ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.25)] font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                aria-pressed={viewMode === 'carousel'}
                title="3D Rotating Circular Carousel"
              >
                <FiRotateCw className="h-3.5 w-3.5" />
                <span>3D Wheel</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all duration-300 ${
                  viewMode === 'grid'
                    ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.25)] font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                aria-pressed={viewMode === 'grid'}
                title="Table Grid View"
              >
                <FiGrid className="h-3.5 w-3.5" />
                <span>Grid</span>
              </button>
            </div>

            {/* Search Box with Clear Button */}
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/70" aria-hidden="true" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tab === 'letters' ? 'Search letter (e.g. A, B, C)…' : 'Search word (e.g. Hello)…'}
                className="w-full rounded-full border border-white/12 bg-slate-950/80 py-2.5 pl-10 pr-9 font-sans text-xs text-white placeholder:text-slate-500 shadow-inner backdrop-blur-xl transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                aria-label="Search gestures"
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-white"
                  title="Clear search"
                >
                  <FiX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </Reveal>

        {/* Search Results Highlight Banner (Only for Grid mode) */}
        {viewMode === 'grid' && q.trim() && matchingIndices.length > 0 && (
          <div className="mx-auto mb-6 flex max-w-xl items-center justify-between rounded-2xl border border-cyan-400/40 bg-slate-950/90 px-5 py-3 text-xs backdrop-blur-2xl shadow-2xl">
            <span className="text-slate-200">
              Found <strong className="text-cyan-300 font-mono">{matchingIndices.length}</strong> match{matchingIndices.length === 1 ? '' : 'es'}
            </span>
            {otherTabMatches > 0 && (
              <button
                onClick={() => setTab(tab === 'letters' ? 'words' : 'letters')}
                className="flex items-center gap-1.5 font-mono text-[11px] text-violet-300 hover:text-white bg-violet-500/15 border border-violet-500/30 px-3 py-1 rounded-full transition-all shadow-sm"
              >
                <span>Found {otherTabMatches} in {tab === 'letters' ? 'Words' : 'Letters'}</span>
                <FiArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* ── 3D INFINITE CIRCULAR ROTATING CAROUSEL ── */}
        {viewMode === 'carousel' && (
          <div className="relative">
            {/* Active Gesture Spotlight Banner */}
            {activeSpotlightItem && (
              <div className="glass-card mx-auto mb-6 flex max-w-2xl items-center justify-between rounded-2xl border border-white/12 bg-slate-950/90 p-4 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
                <div className="flex items-center gap-4">
                  <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-600/25 border border-cyan-400/40 shadow-inner">
                    {activeSpotlightItem.isWord ? (
                      isTwoHandedWord(activeSpotlightItem.title) ? (
                        <TwoHandWordSign
                          word={activeSpotlightItem.title}
                          className="h-12 w-12"
                          glow={true}
                        />
                      ) : (
                        <HandSkeleton
                          word={activeSpotlightItem.title}
                          className="h-12 w-12"
                          glow={true}
                        />
                      )
                    ) : (
                      <HandSkeleton
                        pose={activeSpotlightItem.pose}
                        loop={true}
                        className="h-12 w-12"
                        glow={true}
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold text-white tracking-tight">
                        {activeSpotlightItem.title}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-300 rounded-full bg-cyan-400/15 px-2.5 py-0.5 border border-cyan-400/40 font-medium">
                        {activeSpotlightItem.isWord ? 'Dynamic Sign' : 'Alphabet Sign'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 line-clamp-1 max-w-sm sm:max-w-md">
                      {activeSpotlightItem.detail}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-400/15 px-3 py-1 font-mono text-[10px] text-cyan-300 border border-cyan-400/40 shrink-0 font-medium">
                  #{activeSpotlightItem.index + 1} of {rawItems.length}
                </span>
              </div>
            )}

            {/* 3D Circular Wheel Stage */}
            <div
              ref={stageRef}
              className="relative mx-auto h-[345px] sm:h-[405px] w-full max-w-7xl select-none touch-none overflow-visible cursor-grab active:cursor-grabbing rounded-3xl"
              style={{
                perspective: `${perspective}px`,
                perspectiveOrigin: '50% 50%',
              }}
              onPointerLeave={handlePointerLeave}
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Vignette Edge Fades for Atmospheric 3D Depth */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-20 sm:w-32 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-20 sm:w-32 bg-gradient-to-l from-slate-950 via-slate-950/70 to-transparent" />

              {/* Directional Hover Indicators */}
              <div
                className={`pointer-events-none absolute left-4 sm:left-8 top-1/2 z-20 -translate-y-1/2 flex flex-col items-center gap-1.5 transition-all duration-300 ${
                  hoverDirection === 'left' ? 'opacity-100 scale-110' : 'opacity-40'
                }`}
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-cyan-400/20 border border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                  <FiChevronLeft className="h-5 w-5 animate-pulse" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-300 hidden sm:block">Spin Left</span>
              </div>

              <div
                className={`pointer-events-none absolute right-4 sm:right-8 top-1/2 z-20 -translate-y-1/2 flex flex-col items-center gap-1.5 transition-all duration-300 ${
                  hoverDirection === 'right' ? 'opacity-100 scale-110' : 'opacity-40'
                }`}
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-violet-400/20 border border-violet-400/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                  <FiChevronRight className="h-5 w-5 animate-pulse" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-violet-300 hidden sm:block">Spin Right</span>
              </div>

              {/* 3D Rotating Cylinder Pivot */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 preserve-3d"
                style={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                }}
              >
                <div
                  ref={cylinderRef}
                  className="h-full w-full preserve-3d"
                  style={{
                    transform: `translateZ(-${depthOffset}px) rotateY(0deg)`,
                    willChange: 'transform',
                  }}
                >
                  {Array.from({ length: WHEEL_SLOTS }).map((_, slotIndex) => {
                    const cardAngle = slotIndex * angleStep;
                    const totalItems = rawItems.length;
                    const centerIdx = ((wheelStep % totalItems) + totalItems) % totalItems;
                    const frontSlot = ((wheelStep % WHEEL_SLOTS) + WHEEL_SLOTS) % WHEEL_SLOTS;
                    let diff = (slotIndex - frontSlot) % WHEEL_SLOTS;
                    if (diff > 7) diff -= WHEEL_SLOTS;
                    if (diff < -7) diff += WHEEL_SLOTS;
                    const itemIdx = ((centerIdx + diff) % totalItems + totalItems) % totalItems;
                    const item = rawItems[itemIdx] || rawItems[0];

                    const isHovered = hoveredId === item.id;
                    const isActive = activeIndex === item.index;
                    const isSearchMatch = Boolean(q.trim()) && matchingIndices.includes(item.index);

                    return (
                      <div
                        key={`slot-${slotIndex}`}
                        className="absolute inset-0"
                        style={{
                          // Lift active or hovered card 18px forward along its 3D normal vector
                          transform: `rotate3d(0, 1, 0, ${cardAngle}deg) translate3d(0, 0, ${radius + (isHovered ? 18 : 0)}px)`,
                          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          backfaceVisibility: isHovered ? 'visible' : 'hidden',
                          WebkitBackfaceVisibility: isHovered ? 'visible' : 'hidden',
                          zIndex: isHovered ? 50 : (isActive ? 10 : 1),
                        }}
                        onMouseEnter={() => handleCardHoverStart(item.id)}
                        onMouseLeave={() => handleCardHoverEnd(item.id)}
                        onPointerLeave={() => handleCardHoverEnd(item.id)}
                        onClick={(e) => {
                          if (hasDraggedRef.current) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                          }
                          rotateToIndex(item.index);
                        }}
                      >
                        <div
                          className={`card-3d-crisp card-border-glow group relative h-full w-full rounded-2xl px-4 py-3.5 sm:px-4.5 sm:py-4 text-center transition-all duration-200 cursor-pointer flex flex-col shadow-2xl ${
                            isHovered ? 'overflow-visible' : 'overflow-hidden'
                          } ${
                            isSearchMatch
                              ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_35px_rgba(34,211,238,0.5)] bg-slate-900/95 brightness-110 z-30 is-hovered'
                              : isHovered
                              ? 'border-cyan-400/80 ring-1 ring-cyan-400/40 shadow-[0_0_25px_rgba(34,211,238,0.25)] z-20 is-hovered'
                              : isActive
                              ? 'border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] border-white/12'
                              : 'border-white/12 bg-slate-950/90'
                          }`}
                        >
                          {/* Specular top rim reflection */}
                          <div
                            className={`absolute inset-x-4 top-0 h-px transition-opacity duration-200 ${
                              isSearchMatch
                                ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-100'
                                : isHovered
                                ? 'bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent opacity-100'
                                : 'bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60'
                            }`}
                          />

                          <GestureCardContent
                            item={item}
                            isHovered={isHovered}
                            isSearchMatch={isSearchMatch}
                            isActive={isActive}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Navigation Chevron Buttons & Interaction Guide */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => rotateToIndex((activeIndex - 1 + rawItems.length) % rawItems.length)}
                  className="glass-card flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/80 px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-300 hover:text-white hover:border-cyan-400/40 shadow-lg backdrop-blur-xl transition-all"
                  aria-label="Previous gesture"
                >
                  <FiChevronLeft className="h-4 w-4 text-cyan-300" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => rotateToIndex((activeIndex + 1) % rawItems.length)}
                  className="glass-card flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/80 px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-300 hover:text-white hover:border-violet-400/40 shadow-lg backdrop-blur-xl transition-all"
                  aria-label="Next gesture"
                >
                  <span>Next</span>
                  <FiChevronRight className="h-4 w-4 text-violet-300" />
                </button>
              </div>

              {/* Tactile Guide Pill */}
              <div className="glass-card hidden sm:flex items-center gap-2.5 rounded-full border border-white/12 bg-slate-950/80 px-4 py-1.5 font-mono text-[11px] text-slate-300 backdrop-blur-xl shadow-lg">
                <span className="flex items-center gap-1 text-cyan-300 font-medium">
                  <FiMove className="h-3.5 w-3.5 animate-pulse" /> Hover Left/Right to Spin
                </span>
                <span className="text-white/20">·</span>
                <span>Drag to Flick</span>
                <span className="text-white/20">·</span>
                <span>Hover Card to Sign</span>
              </div>

              {/* Progress Count */}
              <div className="font-mono text-xs text-slate-400">
                <span className="text-cyan-300 font-semibold">{activeIndex + 1}</span> / {rawItems.length}
              </div>
            </div>

            {/* A–Z Fast Selector Ribbon (for Letters) */}
            {tab === 'letters' && (
              <div className="mt-6 flex items-center justify-center gap-1 overflow-x-auto pb-2 scrollbar-none">
                {LETTERS.map(([letter], idx) => {
                  const isActive = activeIndex === idx;
                  const isSearched = q.trim() && letter.toLowerCase() === q.trim().toLowerCase();
                  return (
                    <button
                      key={letter}
                      onClick={() => {
                        setQ('');
                        rotateToIndex(idx);
                      }}
                      className={`h-7 w-7 shrink-0 rounded-lg font-mono text-xs transition-all duration-200 border ${
                        isSearched
                          ? 'bg-cyan-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(34,211,238,0.9)] scale-110 border-cyan-300'
                          : isActive
                          ? 'bg-gradient-to-br from-cyan-400 to-violet-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(34,211,238,0.5)] scale-110 border-cyan-400'
                          : 'bg-slate-950/80 border-white/10 text-slate-400 hover:border-cyan-400/40 hover:bg-white/10 hover:text-white'
                      }`}
                      aria-label={`Jump to letter ${letter}`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MODE 2: RESPONSIVE GRID VIEW (Search & Full Table) ── */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredGridItems.map((item) => (
              <Reveal key={item.id} delay={item.index * 0.02} className="h-full">
                <GridGestureCard
                  item={item}
                />
              </Reveal>
            ))}
          </div>
        )}

        {/* Empty Search Feedback with Cross-Tab Switch Option (Grid View) */}
        {viewMode === 'grid' && filteredGridItems.length === 0 && (
          <div className="glass-card mt-10 rounded-3xl p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.65)] border border-white/12 bg-slate-950/90 backdrop-blur-2xl max-w-lg mx-auto">
            <p className="font-mono text-sm uppercase tracking-widest text-slate-300">
              No {tab === 'letters' ? 'letters' : 'words'} match “{q}”.
            </p>
            {otherTabMatches > 0 && (
              <p className="mt-2 text-xs text-cyan-300">
                Found {otherTabMatches} matching {tab === 'letters' ? 'word' : 'letter'}{otherTabMatches > 1 ? 's' : ''} in the {tab === 'letters' ? 'Words' : 'Letters'} tab.
              </p>
            )}
            <div className="mt-5 flex items-center justify-center gap-3">
              {otherTabMatches > 0 && (
                <button
                  onClick={() => setTab(tab === 'letters' ? 'words' : 'letters')}
                  className="rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-500 px-6 py-2.5 font-mono text-xs font-bold text-slate-950 shadow-glow hover:scale-105 transition-transform"
                >
                  Switch to {tab === 'letters' ? 'Words' : 'Letters'}
                </button>
              )}
              <button
                onClick={() => setQ('')}
                className="rounded-full border border-white/12 bg-white/10 px-5 py-2.5 font-mono text-xs text-slate-300 hover:bg-white/20 hover:text-white transition-all"
              >
                Clear search
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}