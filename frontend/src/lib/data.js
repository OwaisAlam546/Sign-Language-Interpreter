// Central content data for SignSpeak AI.

// ASL alphabet letters with descriptions and their closest visual pose.
export const LETTERS = [
  ['A', 'Closed fist, thumb straight against index side'],
  ['B', 'Four upright fingers together, thumb flat on palm'],
  ['C', 'Curved fingers and thumb forming a C shape'],
  ['D', 'Index finger straight up, thumb touching other fingers'],
  ['E', 'Fingers curled down, resting on tucked thumb'],
  ['F', 'Index and thumb form an OK circle, 3 fingers up'],
  ['G', 'Index points horizontally forward, thumb parallel'],
  ['H', 'Index and middle forward together, horizontally'],
  ['I', 'Pinky finger raised straight up, others in fist'],
  ['J', 'Pinky raised, traces a dynamic J swooping arc'],
  ['K', 'Index up, middle angled forward, thumb between'],
  ['L', 'Index up, thumb extended 90 degrees forming an L'],
  ['M', 'Three fingers folded over tucked thumb'],
  ['N', 'Two fingers folded over tucked thumb'],
  ['O', 'All fingertips curved together touching thumb'],
  ['P', 'Downward pointing K sign with index forward'],
  ['Q', 'Downward pointing G sign with thumb parallel'],
  ['R', 'Index and middle fingers crossed upright'],
  ['S', 'Solid fist with thumb wrapped across fingers'],
  ['T', 'Thumb tucked between index and middle in a fist'],
  ['U', 'Index and middle extended straight up together'],
  ['V', 'Peace sign — index and middle upright in a V'],
  ['W', 'Three fingers (index, middle, ring) spread upright'],
  ['X', 'Index finger hooked / bent at joint in a fist'],
  ['Y', 'Thumb and pinky extended wide (hang-loose sign)'],
  ['Z', 'Index extended, tracing a dynamic Z in the air'],
];

// Common word-level gestures with animated letter sequence and dynamic motion.
export const WORDS = [
  {
    name: 'HELLO',
    pose: ['H', 'E', 'L', 'L', 'O'],
    detail: 'Open hand salute waving outward from forehead',
  },
  {
    name: 'THANK YOU',
    pose: ['T', 'H', 'A', 'N', 'K', 'Y', 'O', 'U'],
    detail: 'Flat hand moves outward and forward from the chin',
  },
  {
    name: 'PLEASE',
    pose: ['P', 'L', 'E', 'A', 'S', 'E'],
    detail: 'Open flat palm moves in a circular motion over chest',
  },
  {
    name: 'SORRY',
    pose: ['S', 'O', 'R', 'R', 'Y'],
    detail: 'Closed fist rubs in a gentle circular motion on chest',
  },
  {
    name: 'YES',
    pose: ['Y', 'E', 'S'],
    detail: 'Closed fist nods up and down like a nodding head',
  },
  {
    name: 'NO',
    pose: ['N', 'O'],
    detail: 'Index and middle fingers snap shut against the thumb',
  },
  {
    name: 'HELP',
    pose: ['H', 'E', 'L', 'P'],
    detail: 'Closed fist with thumb upright lifted upward by flat palm',
  },
  {
    name: 'GOOD',
    pose: ['G', 'O', 'O', 'D'],
    detail: 'Flat fingers touch chin and transition downward to palm',
  },
  {
    name: 'LOVE',
    pose: ['L', 'O', 'V', 'E', 'LOVE'],
    detail: 'Crossed fists across chest or classic I-Love-You sign',
  },
  {
    name: 'PEACE',
    pose: ['P', 'E', 'A', 'C', 'E', 'PEACE'],
    detail: 'Index and middle fingers held in upright V peace sign',
  },
  {
    name: 'FRIEND',
    pose: ['F', 'R', 'I', 'E', 'N', 'D'],
    detail: 'Interlocking index fingers hooking together back and forth',
  },
  {
    name: 'WATER',
    pose: ['W', 'A', 'T', 'E', 'R'],
    detail: 'W sign tapped twice gently against the chin',
  },
  {
    name: 'WELCOME',
    pose: ['W', 'E', 'L', 'C', 'O', 'M', 'E'],
    detail: 'Open palm sweeping inwards towards the body',
  },
  {
    name: 'MORE',
    pose: ['M', 'O', 'R', 'E'],
    detail: 'Fingertips of both hands brought together repeatedly',
  },
  {
    name: 'UNDERSTAND',
    pose: ['U', 'N', 'D', 'E', 'R', 'S', 'T', 'A', 'N', 'D'],
    detail: 'Index finger flicking upward near the temple',
  },
];

// Model performance numbers.
export const MODEL = {
  accuracy: null,
  precision: null,
  recall: null,
  f1: null,
  latencyMs: null,
  fps: 30,
  classes: 27, // A–Z + synthetic HELLO
  dataset: 'Kaggle ASL Alphabet stills + synthetic HELLO',
  samples: 'not recorded',
  epochs: 'not recorded',
  trainSplit: 'not independently evaluated',
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

// Future-work roadmap (shown compactly inside the Team section).
export const FUTURE = [
  {
    title: 'Regional Language Support',
    text: 'Extend text and speech output to Hindi and Kannada for broader accessibility across India.',
    tag: 'Phase 2',
  },
  {
    title: 'Sentence-Level Grammar',
    text: 'Apply NLP to convert recognized gesture sequences into grammatically correct sentences.',
    tag: 'Phase 3',
  },
  {
    title: 'Two-Way Communication',
    text: 'Long-term vision — convert typed text back into sign gestures with an animated avatar for fully bidirectional conversation.',
    tag: 'Phase 4',
  },
];
