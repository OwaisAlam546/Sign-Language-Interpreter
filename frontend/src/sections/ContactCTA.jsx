import { FiArrowUpRight } from 'react-icons/fi';
import Reveal from '../components/Reveal.jsx';
import { useRouter } from '../context/RouterContext.jsx';

export default function ContactCTA() {
  const { navigate } = useRouter();

  return (
    <section
      id="contact-cta"
      aria-labelledby="contact-cta-heading"
      className="relative z-10 px-4 pt-10 sm:pt-12 md:pt-14 pb-16 sm:pb-20 md:pb-24 text-center overflow-hidden bg-transparent"
    >
      {/* Subtle hairline gradient transition from Roadmap section */}
      <div
        className="mx-auto mb-6 sm:mb-8 h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-[var(--border-subtle)] to-transparent opacity-70"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl flex flex-col items-center gap-2.5 sm:gap-3">
        {/* Soft cyan/blue ambient glow centered behind content (continuous with background canvas) */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-44 w-full max-w-lg rounded-full bg-gradient-to-r from-[#00D9FF]/12 via-[#168BFF]/08 to-transparent blur-3xl opacity-50"
          aria-hidden="true"
        />

        {/* Eyebrow */}
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300 backdrop-blur-md shadow-[0_0_12px_rgba(0,217,255,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span>LET&apos;S CONNECT</span>
          </div>
        </Reveal>

        {/* Heading */}
        <Reveal delay={0.08}>
          <h2
            id="contact-cta-heading"
            className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-[var(--text-main)] leading-[1.15]"
          >
            Technology is better when it brings people{' '}
            <span className="grad-text">closer.</span>
          </h2>
        </Reveal>

        {/* Supporting text */}
        <Reveal delay={0.14}>
          <p className="max-w-xl text-sm sm:text-base leading-relaxed text-[var(--text-sub)]">
            Have an idea, feedback, or a vision for accessible communication? Let&apos;s make it meaningful together.
          </p>
        </Reveal>

        {/* Button */}
        <Reveal delay={0.2}>
          <div className="mt-5 sm:mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="btn-shimmer group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#00D9FF] via-[#83E8F5] to-[#168BFF] px-8 py-3.5 font-display text-sm font-bold text-slate-950 shadow-[0_0_30px_rgba(0,217,255,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(0,217,255,0.55)] cursor-pointer active:scale-95"
              aria-label="Get in Touch with SignSpeak AI team"
            >
              <span>Get in Touch</span>
              <FiArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
