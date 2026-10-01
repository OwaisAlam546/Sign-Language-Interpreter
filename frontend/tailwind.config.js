/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dark Mode exact reference palette
        deep: '#05080D',
        midnight: '#081522',
        teal: {
          dark: '#0B2634',
        },
        ice: {
          cyan: '#00D9FF',
          light: '#00BBD9',
        },
        electric: '#168BFF',
        soft: {
          cyan: '#83E8F5',
        },
        cool: {
          white: '#EAF6FA',
        },
        slate: {
          blue: '#8296A8',
        },
        // Light Mode palette: Option B — Platinum & Navy
        platinum: '#F5F7FA',
        platinumSecondary: '#EDF1F5',
        platinumTertiary: '#E6EBF1',
        deepNavy: '#14283D',
        slateBlue: '#64748B',
        mutedSlate: '#8291A3',
        tealAccent: '#087F9B',
        softAccent: '#E1F5F8',
        softBorder: '#D9E0E8',
        strongBorder: '#C3CED9',
        pure: {
          white: '#FFFFFF',
        },

        // Backward compatibility aliases
        ink: {
          950: '#05080D',
          900: '#081522',
          800: '#0B2634',
          700: '#172738',
        },
        volt: '#00D9FF',
        violet: '#168BFF',
        magenta: '#00D9FF',
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
        glow: '0 0 35px -6px rgba(0,217,255,0.45)',
        'glow-lg': '0 0 70px -12px rgba(0,217,255,0.55)',
        'glow-soft': '0 0 25px rgba(131,232,245,0.3)',
        panel: '0 24px 70px -30px rgba(0,0,0,0.85)',
      },
      backgroundImage: {
        'grad-text': 'linear-gradient(110deg, #EAF6FA 0%, #00D9FF 45%, #168BFF 100%)',
        'grad-text-soft': 'linear-gradient(110deg, #EAF6FA 0%, #83E8F5 50%, #00D9FF 100%)',
      },
    },
  },
  plugins: [],
};
