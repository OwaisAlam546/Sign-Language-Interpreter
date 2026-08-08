// CONTACT — glass form with floating labels, inline validation and a success state.
import { useState } from 'react';
import { FiSend, FiCheck, FiMail, FiMapPin } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';
import Reveal from '../components/Reveal.jsx';

function Field({ label, name, type = 'text', value, onChange, textarea }) {
  const filled = value.length > 0;
  const Input = textarea ? 'textarea' : 'input';
  return (
    <div className="relative">
      <Input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={textarea ? 4 : undefined}
        required
        className={`peer field w-full rounded-2xl px-4 text-white placeholder-transparent transition-all ${
          textarea ? 'min-h-[130px] resize-none pt-6 pb-3' : 'h-14 pt-5 pb-1'
        }`}
        placeholder=" "
        aria-label={label}
        aria-invalid={false}
      />
      <label
        htmlFor={name}
        className={`pointer-events-none absolute left-4 transition-all duration-300 ${
          filled
            ? textarea
              ? 'top-3 text-[10px] uppercase tracking-widest text-cyan-300'
              : 'top-1.5 text-[10px] uppercase tracking-widest text-cyan-300'
            : textarea
              ? 'top-6 text-sm text-slate-500'
              : 'top-1/2 -translate-y-1/2 text-sm text-slate-500'
        }`}
      >
        {label}
      </label>
    </div>
  );
}

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [touched, setTouched] = useState({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const valid = form.name.trim().length > 1 && emailOk && form.message.trim().length > 4;

  const submit = (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, message: true });
    if (!valid) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setSent(true);
      setForm({ name: '', email: '', message: '' });
      setTimeout(() => setSent(false), 6000);
    }, 900);
  };

  const err = (k) => touched[k] && ((k === 'email' ? emailOk : form[k].length > (k === 'message' ? 4 : 1)) ? null : true);

  return (
    <section id="contact" className="relative z-10 px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="Get In Touch"
          title="Let’s Talk Accessibility"
          sub="Questions, collaborations or internship opportunities — I’d love to hear from you."
        />

        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
          {/* info side */}
          <Reveal>
            <div className="flex h-full flex-col gap-4">
              <div className="glass flex items-center gap-4 rounded-2xl p-5">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 ring-1 ring-white/10"><FiMail className="h-5 w-5 text-cyan-300" aria-hidden="true" /></span>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Email</div>
                  <div className="text-sm text-white">mohdowaisalam177@gmail.com</div>
                </div>
              </div>
              <div className="glass flex items-center gap-4 rounded-2xl p-5">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 ring-1 ring-white/10"><FiMapPin className="h-5 w-5 text-violet-300" aria-hidden="true" /></span>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Institution</div>
                  <div className="text-sm text-slate-200">Ramaiah College · BCA · Bengaluru</div>
                </div>
              </div>
              <div className="glass-deep relative flex-1 overflow-hidden rounded-2xl p-5">
                <span className="watermark bottom-[-10px] right-[-6px] text-5xl opacity-60" aria-hidden="true">AI</span>
                <p className="font-display text-lg font-medium text-white">“Breaking communication barriers through AI.”</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">Ready for the next chapter — open to internships, research and assistive-tech roles.</p>
              </div>
            </div>
          </Reveal>

          {/* form side */}
          <Reveal delay={0.1}>
            <form onSubmit={submit} noValidate className="glass-deep flex flex-col gap-4 rounded-3xl p-6 md:p-8">
              <Field label="Your Name" name="name" value={form.name} onChange={set('name')} />
              {err('name') && <p className="-mt-2 font-mono text-[10px] text-rose-400">Please enter your name</p>}
              <Field label="Email Address" name="email" type="email" value={form.email} onChange={set('email')} />
              {err('email') && <p className="-mt-2 font-mono text-[10px] text-rose-400">Enter a valid email address</p>}
              <Field label="Your Message" name="message" textarea value={form.message} onChange={set('message')} />
              {err('message') && <p className="-mt-2 font-mono text-[10px] text-rose-400">Message too short</p>}

              <button
                type="submit"
                disabled={busy}
                className="btn-shimmer mt-2 inline-flex items-center justify-center gap-2 self-start rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-violet-500 px-8 py-3.5 font-display text-sm font-semibold text-ink-950 shadow-glow transition-transform hover:scale-105 disabled:opacity-70"
              >
                <FiSend className="h-4 w-4" aria-hidden="true" /> {busy ? 'Sending…' : 'Send Message'}
              </button>

              {sent && (
                <p className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 font-mono text-xs text-emerald-300">
                  <FiCheck className="h-4 w-4" aria-hidden="true" /> Thanks! Your message has been received — we’ll be in touch.
                </p>
              )}
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}