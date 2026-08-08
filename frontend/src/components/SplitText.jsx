// GSAP word/char split reveal for headlines.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function useReduceMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function SplitText({ text, as: Tag = 'h2', className = '', delay = 0, once = true, play = false }) {
  const ref = useRef(null);
  const reduce = useReduceMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduce) {
      el.style.opacity = '1';
      return;
    }

    const words = text.split(' ');
    el.innerHTML = '';
    words.forEach((word, wi) => {
      const wrap = document.createElement('span');
      wrap.className = 'split-word';
      const inner = document.createElement('span');
      inner.className = 'split-word-inner inline-block will-change-transform';
      inner.innerHTML = '';
      [...word].forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'split-char';
        s.textContent = ch;
        inner.appendChild(s);
      });
      wrap.appendChild(inner);
      el.appendChild(wrap);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });

    const chars = el.querySelectorAll('.split-char');
    gsap.set(chars, { yPercent: 130, opacity: 0 });

    const tl = gsap.timeline({ delay });
    tl.to(chars, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'power4.out', stagger: 0.018 });

    if (play) {
      tl.play();
    } else {
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once,
        onEnter: () => tl.play(),
      });
      return () => st.kill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, play]);

  return (
    <Tag ref={ref} className={className} aria-label={text} style={{ opacity: 0 }}>
      {text}
    </Tag>
  );
}
