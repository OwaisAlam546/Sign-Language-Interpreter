// Generic GSAP scroll reveal wrapper (fade + rise).
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Reveal({ children, className = '', delay = 0, y = 32, scale = 0.97, once = true, as: Tag = 'div' }) {
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

    const rect = el.getBoundingClientRect();
    // If element is already visible in viewport, animate immediately
    if (rect.top < window.innerHeight * 0.92) {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: 'power3.out',
        delay: delay * 0.5,
        onComplete: () => {
          gsap.set(el, { clearProps: 'transform,willChange' });
        },
      });
      return;
    }

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once,
      onEnter: () => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.05,
          ease: 'power3.out',
          delay,
          onComplete: () => {
            gsap.set(el, { clearProps: 'transform,willChange' });
          },
        });
      },
    });
    return () => st.kill();
  }, [delay, once]);

  return (
    <Tag ref={ref} className={className} style={{ opacity: 0, transform: `translateY(${y}px) scale(${scale})`, willChange: 'opacity, transform' }}>
      {children}
    </Tag>
  );
}
