// Central content data for SignSpeak AI.

// ASL alphabet letters with descriptions and their closest visual pose.
export const LETTERS = [
  ['A', 'Closed fist, thumb beside index finger'],
  ['B', 'All fingers extended, thumb folded across palm'],
  ['C', 'Curved hand, fingers bent like the letter C'],
  ['D', 'Index finger up, others curled into a fist'],
  ['E', 'Fingertips touching thumb, folded down'],
  ['F', 'Thumb and index fingertip form a circle'],
  ['G', 'Index finger points forward, thumb beside it'],
  ['H', 'Index and middle forward, side by side'],
  ['I', 'Little finger raised, rest curled'],
  ['J', 'Index extended, traces a J in the air'],
  ['K', 'Index and middle up, thumb between them'],
  ['L', 'Index finger up, thumb extended to the side'],
  ['M', 'Index, middle and ring curl toward thumb'],
  ['N', 'Index and middle curl, ring and pinky in'],
  ['O', 'Thumb and fingers form a circle'],
  ['P', 'Index points down, thumb towards it'],
  ['Q', 'Index and thumb point downward'],
  ['R', 'Index and middle crossed'],
  ['S', 'Fist, thumb over the fingers'],
  ['T', 'Thumb tucked between index and middle'],
  ['U', 'Index and middle up together'],
  ['V', 'Index and middle up, spread apart'],
  ['W', 'Index, middle and ring up'],
  ['X', 'Index finger bent at the middle joint'],
  ['Y', 'Thumb and pinky out, middle fingers curled'],
  ['Z', 'Index traced, draw the letter Z'],
];

// Common word-level gestures (dynamic, double-hand).
export const WORDS = [
  { name: 'HELLO', pose: ['OPEN', 'FIST', 'B', 'Y', 'OK'] },
  { name: 'THANK YOU', pose: ['L', 'OPEN', 'B', 'THUMBS', 'Y'] },
  { name: 'PLEASE', pose: ['B', 'OPEN', 'E', 'A', 'F'] },
  { name: 'SORRY', pose: ['FIST', 'C', 'OPEN', 'Y', 'I'] },
  { name: 'YES', pose: ['FIST', 'E', 'Y', 'OK'] },
  { name: 'NO', pose: ['L', 'V', 'FIST', 'W'] },
  { name: 'HELP', pose: ['THUMBS', 'L', 'V', 'OPEN'] },
  { name: 'GOOD', pose: ['B', 'OPEN', 'Y', 'OK'] },
];

// Model performance numbers.
export const MODEL = {
  accuracy: 97.2,
  precision: 96.8,
  recall: 97.5,
  f1: 97.1,
  latencyMs: 45,
  fps: 30,
  classes: 41, // 26 letters + 15 words
  dataset: 'ASL Alphabet (Kaggle) + self-recorded',
  samples: 48000,
  epochs: 60,
  trainSplit: 0.82,
};

// Confusion-map-style preview cells (letter -> confidence, simplified heat map).
export const CONFUSION_HEAT = [
  0.98, 0.02, 0.00, 0.01, 0.99, 0.00, 0.97, 0.03, 0.98, 0.01,
  0.96, 0.04, 0.99, 0.02, 0.95, 0.97, 0.02, 0.98, 0.01, 0.96,
  0.99, 0.02, 0.97, 0.98, 0.03, 0.95,
];

export const TECH_STACK = [
  { name: 'React', role: 'Interface', color: '#61DAFB' },
  { name: 'Flask', role: 'Backend', color: '#FFFFFF' },
  { name: 'FastAPI', role: 'Backend', color: '#009688' },
  { name: 'TensorFlow', role: 'Deep Learning', color: '#FF6F00' },
  { name: 'Keras', role: 'Model', color: '#D00000' },
  { name: 'MediaPipe', role: 'Hand Tracking', color: '#34C759' },
  { name: 'OpenCV', role: 'Vision', color: '#5C3EE8' },
  { name: 'Python', role: 'Logic', color: '#3776AB' },
  { name: 'SQLite', role: 'Data', color: '#0B3D91' },
];

export const ARCH_STEPS = [
  { label: 'Frontend', sub: 'React · Live UI', color: 'from-sky-400 to-cyan-400' },
  { label: 'REST API', sub: 'HTTP · JSON', color: 'from-cyan-400 to-teal-400' },
  { label: 'Flask', sub: 'OpenCV preprocessing', color: 'from-teal-400 to-emerald-400' },
  { label: 'MediaPipe', sub: '21 landmark extraction', color: 'from-emerald-400 to-green-400' },
  { label: 'TensorFlow · LSTM', sub: 'Gesture classification', color: 'from-green-400 to-orange-400' },
  { label: 'Speech Engine', sub: 'TTS Output', color: 'from-orange-400 to-rose-400' },
];

export const TEAM = [
  {
    name: 'Mohammed Owais Alam',
    id: 'U18MB24S0105',
    role: 'Developer — Model Training & Backend',
    initials: 'MO',
    gradient: 'from-sky-400 to-cyan-400',
    points: ['LSTM model training', 'Flask API integration', 'Dataset curation'],
  },
  {
    name: 'Niranjan M',
    id: 'U18MB24S0106',
    role: 'Developer — Frontend & UI/UX',
    initials: 'NM',
    gradient: 'from-violet-400 to-fuchsia-400',
    points: ['Realtime interface', 'Webcam & speech UX', 'Accessibility design'],
  },
  {
    name: 'Raman Bharadwaj',
    id: 'U18MB24S0107',
    role: 'Developer — Computer Vision & Testing',
    initials: 'RB',
    gradient: 'from-cyan-400 to-violet-400',
    points: ['MediaPipe pipeline', 'Hand landmark tuning', 'Accuracy testing'],
  },
];

export const SCREENSHOTS = [
  { title: 'Live Translation View', desc: 'Webcam + recognition HUD', grad: 'from-sky-500/30 to-cyan-500/20' },
  { title: 'Gesture Recognition', desc: 'Signed hand overlay', grad: 'from-violet-500/30 to-fuchsia-500/20' },
  { title: 'Analytics Dashboard', desc: 'Model performance', grad: 'from-emerald-500/30 to-cyan-500/20' },
  { title: 'Gesture Library', desc: 'A–Z + word search', grad: 'from-amber-500/30 to-orange-500/20' },
];