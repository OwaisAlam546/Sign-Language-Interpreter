// Animated number counter, triggers when scrolled into view.
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Counter({ to, decimals = 0, suffix = '', prefix = '', duration = 2 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const obj = { v: 0 };
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        if (reduce) {
          setVal(to);
          return;
        }
        gsap.to(obj, {
          v: to,
          duration,
          ease: 'power3.out',
          onUpdate: () => setVal(obj.v),
        });
      },
    });
    return () => st.kill();
  }, [to, duration]);

  const formatted = val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{formatted}{suffix}
    </span>
  );
}
