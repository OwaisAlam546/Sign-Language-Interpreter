import { useLayoutEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import './ScrollStack.css';

export const ScrollStackItem = ({ children, itemClassName = '', style = {}, ...props }) => (
  <div
    className={`scroll-stack-card ${itemClassName}`.trim()}
    style={{
      backfaceVisibility: 'hidden',
      transformStyle: 'preserve-3d',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

const ScrollStack = ({
  children,
  className = '',
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 24,
  stackPosition = '20%',
  scaleEndPosition = '10%',
  baseScale = 0.85,
  scaleDuration = 0.5,
  rotationAmount = 0,
  blurAmount = 0,
  useWindowScroll = false,
  onStackComplete,
}) => {
  const scrollerRef = useRef(null);
  const stackCompletedRef = useRef(false);
  const animationFrameRef = useRef(null);
  const lenisRef = useRef(null);
  const cardsRef = useRef([]);
  const cardOffsetsRef = useRef([]);
  const endOffsetRef = useRef(0);
  const lastTransformsRef = useRef(new Map());
  const isUpdatingRef = useRef(false);
  const tickingRef = useRef(false);

  const calculateProgress = useCallback((scrollTop, start, end) => {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }, []);

  const parsePercentage = useCallback((value, containerHeight) => {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value);
  }, []);

  const getScrollData = useCallback(() => {
    if (useWindowScroll) {
      return {
        scrollTop: window.scrollY || document.documentElement.scrollTop || 0,
        containerHeight: window.innerHeight,
        scrollContainer: document.documentElement,
      };
    } else {
      const scroller = scrollerRef.current;
      return {
        scrollTop: scroller?.scrollTop || 0,
        containerHeight: scroller?.clientHeight || window.innerHeight,
        scrollContainer: scroller,
      };
    }
  }, [useWindowScroll]);

  // Static measurement of card offsets to avoid getBoundingClientRect() layout thrashing on scroll
  const measureOffsets = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !cardsRef.current.length) return;

    // Temporarily clear transforms to capture true static geometry
    const savedTransforms = cardsRef.current.map((card) => card?.style.transform || '');
    cardsRef.current.forEach((card) => {
      if (card) card.style.transform = 'none';
    });

    const scrollY = useWindowScroll
      ? (window.scrollY || document.documentElement.scrollTop || 0)
      : (scroller?.scrollTop || 0);

    const offsets = cardsRef.current.map((card) => {
      if (!card) return 0;
      if (useWindowScroll) {
        const rect = card.getBoundingClientRect();
        return rect.top + scrollY;
      } else {
        return card.offsetTop;
      }
    });
    cardOffsetsRef.current = offsets;

    const endElement = useWindowScroll
      ? document.querySelector('.scroll-stack-end')
      : scroller.querySelector('.scroll-stack-end');

    if (endElement) {
      if (useWindowScroll) {
        const endRect = endElement.getBoundingClientRect();
        endOffsetRef.current = endRect.top + scrollY;
      } else {
        endOffsetRef.current = endElement.offsetTop;
      }
    }

    // Restore transforms
    cardsRef.current.forEach((card, i) => {
      if (card && savedTransforms[i]) {
        card.style.transform = savedTransforms[i];
      }
    });
  }, [useWindowScroll]);

  const updateCardTransforms = useCallback(() => {
    if (!cardsRef.current.length || isUpdatingRef.current) return;
    if (!cardOffsetsRef.current.length) {
      measureOffsets();
    }

    isUpdatingRef.current = true;

    const { scrollTop, containerHeight } = getScrollData();
    const stackPositionPx = parsePercentage(stackPosition, containerHeight);
    const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight);
    const endElementTop = endOffsetRef.current || 0;

    // Single pre-pass to determine topCardIndex using cached offsets (O(N) instead of O(N^2))
    let topCardIndex = 0;
    if (blurAmount) {
      for (let j = 0; j < cardOffsetsRef.current.length; j++) {
        const jCardTop = cardOffsetsRef.current[j] || 0;
        const jTriggerStart = jCardTop - stackPositionPx - itemStackDistance * j;
        if (scrollTop >= jTriggerStart) {
          topCardIndex = j;
        }
      }
    }

    cardsRef.current.forEach((card, i) => {
      if (!card) return;

      // Always read from cached static layout offset — ZERO getBoundingClientRect() calls
      const cardTop = cardOffsetsRef.current[i] || 0;
      const triggerStart = cardTop - stackPositionPx - itemStackDistance * i;
      const triggerEnd = cardTop - scaleEndPositionPx;
      const pinStart = cardTop - stackPositionPx - itemStackDistance * i;
      const pinEnd = endElementTop - containerHeight / 2;

      const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
      const targetScale = baseScale + i * itemScale;
      const scale = 1 - scaleProgress * (1 - targetScale);

      // Alternating tilt: subtle alternating direction per card
      const alternatingSign = i % 2 === 0 ? 1 : -1;
      const rotation = rotationAmount ? alternatingSign * rotationAmount * scaleProgress : 0;

      // Quantized stepped blur to avoid GPU buffer churn during transitions
      let blur = 0;
      if (blurAmount && i < topCardIndex) {
        const depthInStack = topCardIndex - i;
        blur = Math.min(2, Math.round(depthInStack * blurAmount));
      }

      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

      if (isPinned) {
        translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
      }

      const newTransform = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 1000) / 1000,
        rotation: Math.round(rotation * 100) / 100,
        blur,
      };

      const lastTransform = lastTransformsRef.current.get(i);
      const hasChanged =
        !lastTransform ||
        Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
        Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
        Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
        lastTransform.blur !== newTransform.blur;

      if (hasChanged) {
        const transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
        card.style.transform = transform;

        // Apply blur filter only when changed and blurAmount > 0
        if (blurAmount) {
          if (newTransform.blur !== (lastTransform?.blur ?? -1)) {
            card.style.filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : '';
          }
        } else if (card.style.filter) {
          card.style.filter = '';
        }

        lastTransformsRef.current.set(i, newTransform);
      }

      if (i === cardsRef.current.length - 1) {
        const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isInView && !stackCompletedRef.current) {
          stackCompletedRef.current = true;
          onStackComplete?.();
        } else if (!isInView && stackCompletedRef.current) {
          stackCompletedRef.current = false;
        }
      }
    });

    isUpdatingRef.current = false;
  }, [
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    onStackComplete,
    calculateProgress,
    parsePercentage,
    getScrollData,
    measureOffsets,
  ]);

  // RequestAnimationFrame batching (tickingRef pattern)
  const requestTick = useCallback(() => {
    if (!tickingRef.current) {
      tickingRef.current = true;
      requestAnimationFrame(() => {
        updateCardTransforms();
        tickingRef.current = false;
      });
    }
  }, [updateCardTransforms]);

  const setupLenis = useCallback(() => {
    if (useWindowScroll) {
      // Connect ONLY to global Lenis from SmoothScroll if present — NO duplicate native listener
      if (typeof window !== 'undefined' && window.__lenis) {
        const globalLenis = window.__lenis;
        const onLenisScroll = () => requestTick();
        globalLenis.on('scroll', onLenisScroll);

        lenisRef.current = {
          destroy: () => {
            if (typeof globalLenis.off === 'function') {
              globalLenis.off('scroll', onLenisScroll);
            }
          },
        };
        return;
      }

      // Standalone window Lenis if no global instance exists
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.5,
        infinite: false,
        wheelMultiplier: 1,
        lerp: 0.1,
      });

      lenis.on('scroll', requestTick);

      const raf = (time) => {
        lenis.raf(time);
        animationFrameRef.current = requestAnimationFrame(raf);
      };
      animationFrameRef.current = requestAnimationFrame(raf);

      lenisRef.current = {
        destroy: () => {
          lenis.destroy();
        },
      };
      return lenis;
    } else {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const lenis = new Lenis({
        wrapper: scroller,
        content: scroller.querySelector('.scroll-stack-inner'),
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.5,
        infinite: false,
        wheelMultiplier: 1,
      });

      lenis.on('scroll', requestTick);

      const raf = (time) => {
        lenis.raf(time);
        animationFrameRef.current = requestAnimationFrame(raf);
      };
      animationFrameRef.current = requestAnimationFrame(raf);

      lenisRef.current = lenis;
      return lenis;
    }
  }, [requestTick, useWindowScroll]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = Array.from(
      useWindowScroll
        ? document.querySelectorAll('.scroll-stack-card')
        : scroller.querySelectorAll('.scroll-stack-card')
    );

    cardsRef.current = cards;
    const transformsCache = lastTransformsRef.current;

    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
      }
      card.style.willChange = 'transform';
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
      card.style.transform = 'translateZ(0)';
      card.style.webkitTransform = 'translateZ(0)';
      card.style.perspective = '1000px';
      card.style.webkitPerspective = '1000px';
    });

    measureOffsets();
    setupLenis();
    updateCardTransforms();

    const onResize = () => {
      measureOffsets();
      requestTick();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (lenisRef.current) {
        lenisRef.current.destroy();
      }
      stackCompletedRef.current = false;
      cardsRef.current = [];
      cardOffsetsRef.current = [];
      transformsCache.clear();
      isUpdatingRef.current = false;
      tickingRef.current = false;
    };
  }, [
    itemDistance,
    useWindowScroll,
    measureOffsets,
    setupLenis,
    updateCardTransforms,
    requestTick,
  ]);

  return (
    <div
      className={`scroll-stack-scroller ${useWindowScroll ? 'use-window-scroll' : ''} ${className}`.trim()}
      ref={scrollerRef}
    >
      <div className="scroll-stack-inner">
        {children}
        {/* Generous bottom spacer so Step 6 finishes pinning and releases cleanly */}
        <div className="scroll-stack-end" style={{ height: useWindowScroll ? '160px' : '1px' }} />
      </div>
    </div>
  );
};

export default ScrollStack;
