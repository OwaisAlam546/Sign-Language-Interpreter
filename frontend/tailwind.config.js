/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0B0F19',
          900: '#0F1524',
          800: '#111827',
          700: '#1F2937',
        },
        electric: '#38BDF8',
        volt: '#22D3EE',
        violet: '#8B5CF6',
        magenta: '#C084FC',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 14s linear infinite',
        'spin-slower': 'spin 30s linear infinite',
        'float': 'float 7s ease-in-out infinite',
        'float-slow': 'float 11s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.6s ease-in-out infinite',
        'marquee': 'marquee 28s linear infinite',
        'marquee-reverse': 'marquee 28s linear infinite reverse',
        'grid-pan': 'gridPan 24s linear infinite',
        'scan': 'scan 2.4s ease-in-out infinite',
        'wave': 'wave 1.1s ease-in-out infinite',
        'shimmer': 'shimmer 3.2s linear infinite',
        'blink': 'blink 1.1s step-end infinite',
        'orb': 'orb 18s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-18px) rotate(3deg)' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.06)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        gridPan: {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '0 48px' },
        },
        scan: {
          '0%': { top: '8%', opacity: '0' },
          '12%': { opacity: '1' },
          '88%': { opacity: '1' },
          '100%': { top: '88%', opacity: '0' },
        },
        wave: {
          '0%,100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        blink: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        orb: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '100%': { transform: 'translate(60px,-40px) scale(1.15)' },
        },
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(34,211,238,0.45)',
        'glow-violet': '0 0 44px -8px rgba(139,92,246,0.5)',
        'glow-lg': '0 0 90px -18px rgba(34,211,238,0.55)',
        panel: '0 24px 70px -30px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'grad-text': 'linear-gradient(100deg, #7DD3FC 0%, #22D3EE 35%, #A78BFA 70%, #C084FC 100%)',
        'grad-text-soft': 'linear-gradient(100deg, #E2E8F0 0%, #7DD3FC 45%, #A78BFA 100%)',
        'mesh': 'radial-gradient(60% 60% at 20% 15%, rgba(56,189,248,0.14) 0%, transparent 60%), radial-gradient(50% 50% at 85% 25%, rgba(139,92,246,0.14) 0%, transparent 60%), radial-gradient(60% 60% at 50% 90%, rgba(34,211,238,0.10) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
};
