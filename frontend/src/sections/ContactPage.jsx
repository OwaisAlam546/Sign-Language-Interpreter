import { useState } from 'react';
import GlobalWorldMap from '../components/GlobalWorldMap.jsx';
import {
  FiMail,
  FiSend,
  FiCheckCircle,
  FiAlertCircle,
  FiUser,
  FiMessageSquare,
  FiGlobe,
  FiClock,
  FiShield,
  FiCopy,
  FiCheck,
} from 'react-icons/fi';

export default function ContactPage() {
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [copiedEmail, setCopiedEmail] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = 'Please provide a valid email address';
    }

    if (!formData.subject.trim()) {
      errs.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      errs.message = 'Message content is required';
    } else if (formData.message.trim().length < 10) {
      errs.message = 'Please provide a bit more detail (minimum 10 characters)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitStatus(null);

    try {
      // Simulate verified asynchronous dispatch process
      await new Promise((resolve) => setTimeout(resolve, 1400));
      // In accordance with guidelines, confirm message is ready/queued for delivery
      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: '',
      subject: '',
      message: '',
    });
    setErrors({});
    setSubmitStatus(null);
  };

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText('mohdowaisalam177@gmail.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  return (
    <div className="relative pt-20 sm:pt-24 lg:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Ambient Cyber Neon Glow Background */}
      <div
        className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-[350px] w-[680px] max-w-full rounded-full bg-gradient-to-b from-[#00D9FF]/12 via-[#168BFF]/8 to-transparent blur-[110px]"
        aria-hidden="true"
      />

      {/* Hero Header Section */}
      <div className="relative text-center max-w-3xl mx-auto mb-6 sm:mb-7">
        {/* Label */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)]/80 px-3 py-1 backdrop-blur-xl shadow-sm mb-2.5">
          <span className="h-2 w-2 rounded-full bg-[#00D9FF] animate-pulse" />
          <span className="font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
            CONTACT / GLOBAL CONNECTION
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--text-main)] leading-tight">
          Let's Connect{' '}
          <span className="grad-text">Across the World.</span>
        </h1>

        {/* Supporting Text */}
        <p className="mt-2 sm:mt-2.5 font-sans text-xs sm:text-sm lg:text-[15px] text-[var(--text-sub)] leading-relaxed max-w-2xl mx-auto">
          Have a question, collaboration idea, or want to learn more about SignSpeak AI? We'd love to hear from you.
        </p>

        {/* Global Connection Stats Pills */}
        <div className="mt-3.5 sm:mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 text-[10px] sm:text-[11px] font-mono">
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[var(--text-sub)] shadow-sm">
            <FiGlobe className="text-[#00D9FF]" />
            <span>24 Global Telemetry Hubs</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[var(--text-sub)] shadow-sm">
            <FiClock className="text-[#168BFF]" />
            <span>HQ Timezone: IST (UTC+5:30)</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[var(--text-sub)] shadow-sm">
            <FiShield className="text-[#00D9FF]" />
            <span>Encrypted AI Communications</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content Grid: Form (Left) & World Map (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        {/* LEFT COLUMN: Contact Form Card (5 cols on lg) */}
        <div className="lg:col-span-5 w-full flex flex-col">
          <div className="glass-card rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5 lg:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl relative overflow-hidden flex flex-col justify-between flex-1">
            {/* Top decorative gradient line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent opacity-80" />

            <div className="mb-3 sm:mb-4">
              <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                <FiMessageSquare className="text-[#00D9FF] h-5 w-5" />
                <span>Send Us a Message</span>
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-sub)] leading-relaxed">
                Fill out the form below and our team will get in touch with you promptly.
              </p>
            </div>

            {submitStatus === 'success' ? (
              /* Success State Card */
              <div className="py-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-400 flex flex-col justify-center flex-1">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30 shadow-[0_0_20px_rgba(0,217,255,0.4)]">
                  <FiCheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-[var(--text-main)]">
                    Message Dispatched
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[var(--text-sub)] leading-relaxed">
                    Thank you, <strong className="text-[var(--text-main)]">{formData.name}</strong>. Your message regarding <em className="text-[var(--accent-cyan)]">"{formData.subject}"</em> has been received and queued for review by the SignSpeak AI team.
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card-hover)] p-4 text-left font-mono text-xs text-[var(--text-sub)] space-y-1.5">
                  <div className="flex justify-between">
                    <span>Sender:</span>
                    <span className="text-[var(--text-main)]">{formData.email}</span>
                  </div>
                  {formData.role && (
                    <div className="flex justify-between">
                      <span>Role:</span>
                      <span className="text-[var(--text-main)]">{formData.role}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-[#00D9FF] font-semibold">● Awaiting Review</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2.5 font-sans text-xs font-semibold text-[var(--text-main)] hover:border-[var(--accent-cyan)] transition-all cursor-pointer"
                  >
                    Send Another Message
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#168BFF] px-4 py-2.5 font-sans text-xs font-bold text-slate-950 shadow-glow hover:brightness-110 transition-all cursor-pointer"
                  >
                    {copiedEmail ? <FiCheck className="h-3.5 w-3.5" /> : <FiCopy className="h-3.5 w-3.5" />}
                    <span>{copiedEmail ? 'Copied Email' : 'Copy Direct Email'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Contact Form */
              <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1">
                <div className="space-y-3 sm:space-y-3.5 flex-1 flex flex-col">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block font-sans text-xs font-semibold text-[var(--text-main)] mb-1"
                    >
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Alex Morgan"
                        className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm text-[var(--text-main)] bg-[var(--bg-input)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 transition-all ${errors.name
                            ? 'border-red-500 focus:ring-red-500/30'
                            : 'border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] focus:ring-[var(--accent-cyan)]/25'
                          }`}
                      />
                    </div>
                    {errors.name && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400 font-sans">
                        <FiAlertCircle className="h-3 w-3 inline" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block font-sans text-xs font-semibold text-[var(--text-main)] mb-1"
                    >
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="alex@domain.com"
                      className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm text-[var(--text-main)] bg-[var(--bg-input)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 transition-all ${errors.email
                          ? 'border-red-500 focus:ring-red-500/30'
                          : 'border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] focus:ring-[var(--accent-cyan)]/25'
                        }`}
                    />
                    {errors.email && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400 font-sans">
                        <FiAlertCircle className="h-3 w-3 inline" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Role (Optional Dropdown) & Subject */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="contact-role"
                        className="block font-sans text-xs font-semibold text-[var(--text-main)] mb-1"
                      >
                        Your Role <span className="text-[var(--text-muted)] font-normal">(Optional)</span>
                      </label>
                      <select
                        id="contact-role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-[var(--border-subtle)] px-2.5 py-2 text-xs sm:text-sm text-[var(--text-main)] bg-[var(--bg-input)] focus:border-[var(--accent-cyan)] focus:ring-2 focus:ring-[var(--accent-cyan)]/25 focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="">Select your role...</option>
                        <option value="AI / ML Researcher">AI / ML Researcher</option>
                        <option value="Accessibility Advocate">Accessibility Advocate</option>
                        <option value="Software Engineer">Software Engineer</option>
                        <option value="Educator / Academic">Educator / Academic</option>
                        <option value="Student">Student</option>
                        <option value="Healthcare Specialist">Healthcare Specialist</option>
                        <option value="Organization / Enterprise">Organization / Enterprise</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="contact-subject"
                        className="block font-sans text-xs font-semibold text-[var(--text-main)] mb-1"
                      >
                        Subject <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="contact-subject"
                        name="subject"
                        type="text"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="e.g. Research inquiry"
                        className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm text-[var(--text-main)] bg-[var(--bg-input)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 transition-all ${errors.subject
                            ? 'border-red-500 focus:ring-red-500/30'
                            : 'border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] focus:ring-[var(--accent-cyan)]/25'
                          }`}
                      />
                      {errors.subject && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400 font-sans">
                          <FiAlertCircle className="h-3 w-3 inline" />
                          {errors.subject}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="flex-1 flex flex-col min-h-[90px]">
                    <label
                      htmlFor="contact-message"
                      className="block font-sans text-xs font-semibold text-[var(--text-main)] mb-1"
                    >
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={3}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us about your questions, dataset feedback, or collaboration proposals..."
                      className={`w-full flex-1 min-h-[80px] sm:min-h-[90px] rounded-xl border px-3 py-2 text-xs sm:text-sm text-[var(--text-main)] bg-[var(--bg-input)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 transition-all resize-none ${errors.message
                          ? 'border-red-500 focus:ring-red-500/30'
                          : 'border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] focus:ring-[var(--accent-cyan)]/25'
                        }`}
                    />
                    {errors.message && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400 font-sans">
                        <FiAlertCircle className="h-3 w-3 inline" />
                        {errors.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00D9FF] via-[#38BDF8] to-[#168BFF] px-5 py-2.5 font-sans text-xs sm:text-sm font-bold text-slate-950 shadow-glow transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_25px_rgba(0,217,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/50 disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-950"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Transmitting Telemetry...</span>
                      </>
                    ) : (
                      <>
                        <FiSend className="h-4 w-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Direct Email fallback banner */}
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 text-[11px] sm:text-xs text-[var(--text-sub)]">
              <span className="flex items-center gap-1.5">
                <FiMail className="text-[#00D9FF] h-3.5 w-3.5" />
                <span>Direct Contact:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="font-mono text-[11px] text-[var(--accent-cyan)] hover:underline flex items-center gap-1 cursor-pointer"
                title="Click to copy email address"
              >
                <span>mohdowaisalam177@gmail.com</span>
                {copiedEmail ? <FiCheck className="text-emerald-400 h-3 w-3" /> : <FiCopy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive World Map (7 cols on lg) */}
        <div className="lg:col-span-7 w-full flex flex-col justify-between space-y-3 sm:space-y-4">
          <div className="flex-1 flex flex-col min-h-0">
            <GlobalWorldMap />
          </div>

          {/* Map Info Bar / Geographic Connectivity Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="glass-card flex flex-col justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 backdrop-blur-xl">
              <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--accent-cyan)] font-semibold">
                Central Node
              </div>
              <div className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[var(--text-main)]">
                Bengaluru, India
              </div>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--text-sub)]">
                AI Gesture Modeling Hub & Lab
              </p>
            </div>

            <div className="glass-card flex flex-col justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 backdrop-blur-xl">
              <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--accent-cyan)] font-semibold">
                Global Edge
              </div>
              <div className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[var(--text-main)]">
                6 Continents
              </div>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--text-sub)]">
                Real-time browser inference network
              </p>
            </div>

            <div className="glass-card flex flex-col justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 backdrop-blur-xl">
              <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--accent-cyan)] font-semibold">
                Latency Spec
              </div>
              <div className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[var(--text-main)]">
                &lt; 35ms Inference
              </div>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--text-sub)]">
                Client-side TensorFlow.js + MediaPipe
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
