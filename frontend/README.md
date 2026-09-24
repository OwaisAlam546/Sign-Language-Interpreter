# SignSpeak AI — Frontend

> **Breaking Communication Barriers Through AI** — Real-Time Sign Language Translator (Final Year Project · BCA VI · Ramaiah College)

A frontend for a real-time sign-language recognition prototype. Webcam → MediaPipe hand landmarks → server TensorFlow sequence prediction → text + speech. This repo is the **frontend presentation layer**; the model pipeline runs through the gateway to the FastAPI service.

## Tech

- **Vite + React 18** — component-based architecture
- **Tailwind CSS** — custom design system (dark glassmorphism, gradient text, glow)
- **GSAP + ScrollTrigger** — scroll reveals, split-text, timeline spines, scrub animations
- **Lenis** — buttery smooth scrolling
- **Framer Motion** — hero entrance, micro-interactions
- **react-icons** — feather icons

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
npm run preview    # serve production build
```

## Sections

| Section | Highlights |
|---|---|
| Hero | Editorial lockup, **auto-signing MediaPipe hand** (21 animated landmarks), magnetic CTAs, live stats |
| Live Demo | Real webcam via `getUserMedia`, 12-frame server-model inference, stability-gated text, wrapping committed words, confidence/FPS/latency HUD |
| How It Works | 6-step pipeline timeline with scroll-drawn spine |
| Features | Glass cards with glow + sheen |
| Gesture Library | Searchable A–Z + words grid, hover shows live-signing preview |
| Model | Gauge, animated counters, training-loss curve, per-letter bars, confusion heatmap |
| Tech Stack | Glowing tech wall + giant marquee |
| About | Problem statement, objective, scope, roadmap |
| Team | Owais · Niranjan · Raman — gradient cards |
| Architecture | Animated layered flow diagram |
| Screenshots | Snap carousel + fullscreen preview modal |
| Contact | Floating-label glass form with validation |
| Footer | Watermark, quick links, back-to-top |

## Notes

- The **Live Demo camera** requires browser permission (`getUserMedia`) and a running gateway plus AI service. It deliberately shows no simulated translations when either is unavailable.
- The bundled model is a 27-label prototype (A–Z plus synthetic `HELLO`). It needs an independently evaluated, signer-separated video dataset before accuracy claims can be made.
- Accessibility: `prefers-reduced-motion` respected, ARIA labels, keyboard-navigable, semantic landmarks.

## Folder Structure

```
src/
├── components/     # SmoothScroll, Cursor, Background, HandSkeleton, MagneticButton,
│                   # SplitText, Reveal, Counter, SectionHeading, Marquee, Navbar, ScrollProgress
├── sections/       # Hero, LiveDemo, HowItWorks, Features, SupportedGestures, Model,
│                   # TechStack, AboutProject, Team, Architecture, Screenshots, Contact, Footer
└── lib/            # data.js (content: letters, words, model stats, team…)
```
