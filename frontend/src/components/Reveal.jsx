// Generic GSAP scroll reveal wrapper (fade + rise).
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Reveal({ children, className = '', delay = 0, y = 42, once = true, as: Tag = 'div' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once,
      onEnter: () => {
        gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay });
      },
    });
    return () => st.kill();
  }, [delay, once]);

  return (
    <Tag ref={ref} className={className} style={{ opacity: 0, transform: `translateY(${y}px)` }}>
      {children}
    </Tag>
  );
}
