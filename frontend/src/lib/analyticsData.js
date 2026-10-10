// Centralized Analytics Data Structure for SignSpeak AI
// Directly powered by verified benchmark evaluation results on 1,762 held-out test frames
import benchmarkRaw from './benchmarkEvaluationData.json';

// Handshape anatomical descriptions & camera signing tips for ASL letters A–Z
const HANDSHAPE_DETAILS = {
  A: {
    handshape: 'Closed fist, thumb resting flat against index side',
    tip: 'Keep thumb resting flat on the side of index finger rather than folded across front.',
  },
  B: {
    handshape: 'Four upright fingers held together, thumb folded across palm',
    tip: 'Keep all four fingers upright and touching each other with thumb tucked across palm.',
  },
  C: {
    handshape: 'Curved fingers and thumb forming an open C curve',
    tip: 'Curve fingers and thumb smoothly towards each other without closing the gap.',
  },
  D: {
    handshape: 'Index finger upright, thumb touching curled middle/ring/pinky',
    tip: 'Keep the index finger straight up and let the other three fingertips touch thumb tip.',
  },
  E: {
    handshape: 'Fingers curled tightly down resting over tucked thumb',
    tip: 'Curl all four fingertips firmly down on top of the thumb; avoid extending the pinky.',
  },
  F: {
    handshape: 'Index and thumb touching in circle, remaining 3 fingers spread',
    tip: 'Form an OK circle with index and thumb while keeping middle, ring, and pinky spread wide.',
  },
  G: {
    handshape: 'Index points horizontally forward, thumb held parallel',
    tip: 'Hold the hand sideways so the camera sees the horizontal gap between index and thumb.',
  },
  H: {
    handshape: 'Index and middle extended forward horizontally together',
    tip: 'Keep both index and middle fingers touching and pointing horizontally across camera view.',
  },
  I: {
    handshape: 'Pinky finger extended upright, remaining fingers closed in fist',
    tip: 'Raise pinky fully upright and ensure the thumb is firmly closed across the other fingers.',
  },
  J: {
    handshape: 'Pinky extended upright tracing a swooping J curve in air',
    tip: 'In live signing, J involves a smooth swooping hook motion with the upright pinky.',
  },
  K: {
    handshape: 'Index upright, middle angled forward, thumb between them',
    tip: 'Place thumb tip on the middle finger knuckle with index upright and middle angled forward.',
  },
  L: {
    handshape: 'Index upright, thumb extended horizontally forming 90° L',
    tip: 'Hold index straight up and thumb straight out horizontally to form a clear right angle.',
  },
  M: {
    handshape: 'Three fingers draped forward over tucked thumb',
    tip: 'Fold three fingers (index, middle, ring) over the thumb; keep knuckles visible to the camera.',
  },
  N: {
    handshape: 'Two fingers draped forward over tucked thumb',
    tip: 'Fold two fingers (index, middle) forward over the thumb with ring and pinky curled into palm.',
  },
  O: {
    handshape: 'All fingertips curved inward meeting the thumb tip',
    tip: 'Form a closed circular ring with all five fingertips touching each other.',
  },
  P: {
    handshape: 'Downward angled K handshape pointing index forward',
    tip: 'Angle the K handshape downward so the index finger points forward towards the desk.',
  },
  Q: {
    handshape: 'Downward pointing G handshape with thumb parallel',
    tip: 'Point index and thumb downward together with a visible parallel gap between them.',
  },
  R: {
    handshape: 'Index and middle fingers crossed upright',
    tip: 'Cross index and middle fingers firmly upright with middle finger wrapping in front.',
  },
  S: {
    handshape: 'Solid fist with thumb wrapped across front of curled fingers',
    tip: 'Wrap thumb across the front of the curled fingers rather than beside the index.',
  },
  T: {
    handshape: 'Thumb tucked securely between index and middle fingers',
    tip: 'Tuck thumb tip between the index and middle finger knuckles in a closed fist.',
  },
  U: {
    handshape: 'Index and middle fingers held upright together',
    tip: 'Keep index and middle fingers straight up and touching together, not hooked or spread.',
  },
  V: {
    handshape: 'Peace sign — index and middle upright spread apart',
    tip: 'Spread index and middle fingers apart into an open V shape.',
  },
  W: {
    handshape: 'Index, middle, and ring fingers spread upright',
    tip: 'Hold three fingers (index, middle, ring) upright and spread apart like a letter W.',
  },
  X: {
    handshape: 'Index finger hooked / bent at joint in a fist',
    tip: 'Hook only the index finger at the knuckle joint; keep the remaining fingers closed into a fist.',
  },
  Y: {
    handshape: 'Thumb and pinky extended wide, middle fingers curled',
    tip: 'Spread thumb and pinky wide in a hang-loose shape while curling index, middle, and ring.',
  },
  Z: {
    handshape: 'Index finger extended tracing a dynamic Z in air',
    tip: 'In natural ASL, Z traces a small zigzag path in the air using the upright index finger.',
  },
};

// Known benchmark test misclassification notes
const MISCLASSIFICATION_NOTES = {
  M: '1 sample misclassified as U (pitch angle foreshortened knuckles)',
  U: '1 sample misclassified as X (forward finger tilt foreshortened upright profile)',
  X: '1 sample misclassified as T (hooked knuckle flattened by camera angle)',
  E: '1 sample misclassified as I (loose pinky curl detected as upright pinky)',
  I: '1 sample misclassified as S (pinky angled slightly away from lens plane)',
  Y: '1 sample misclassified as Z (transition gesture mirrored index trajectory)',
};

// Compute per-class records from benchmark JSON
const classes = benchmarkRaw.classes;
const cm = benchmarkRaw.confusion_matrix;
const perClass = benchmarkRaw.per_class;

const classPerformance = classes.map((letter, i) => {
  const metric = perClass[letter] || { precision: 1, recall: 1, 'f1-score': 1, support: 0 };
  const support = metric.support;
  const correct = cm[i][i];
  const accuracy = support > 0 ? (correct / support) * 100 : 0;
  const precision = metric.precision * 100;
  const recall = metric.recall * 100;
  const f1 = metric['f1-score'] * 100;

  // Find any off-diagonal predictions for this row
  const offDiagonals = [];
  for (let j = 0; j < 26; j++) {
    if (i !== j && cm[i][j] > 0) {
      offDiagonals.push({
        predicted: classes[j],
        count: cm[i][j],
        rate: Number(((cm[i][j] / support) * 100).toFixed(1)),
      });
    }
  }

  const details = HANDSHAPE_DETAILS[letter] || { handshape: '', tip: '' };
  const status = offDiagonals.length > 0 ? 'attention' : 'strong';

  return {
    label: letter,
    accuracy: Number(accuracy.toFixed(1)),
    accuracyRaw: accuracy,
    correct,
    support,
    precision: Number(precision.toFixed(1)),
    recall: Number(recall.toFixed(1)),
    f1: Number(f1.toFixed(1)),
    status,
    misclassifications: offDiagonals,
    confusedWith: MISCLASSIFICATION_NOTES[letter] || null,
    handshape: details.handshape,
    tip: details.tip,
  };
});

export const ANALYTICS_DATA = {
  // Raw benchmark artifacts
  raw: benchmarkRaw,
  classes,
  confusionMatrix: cm,

  // Evaluation Status & Model ID
  status: {
    badge: 'Verified Benchmark Evaluation',
    state: 'verified',
    engine: 'ONNX Runtime Web (WASM SIMD)',
    environment: 'Client-Side In-Browser Inference',
    modelName: 'alphabet_landmark_model.onnx (159 KB)',
    architecture: 'MediaPipe 21 Landmark Keypoints → 63-Feature MLP Classifier',
    dataset: 'Kaggle ASL Alphabet (1,762 Held-Out Test Frames, 11,742 Total)',
    description: 'Measured on 1,762 un-augmented test frames from the held-out Kaggle ASL partition.',
  },

  // Four Verified Headline Metrics (Secondary to visualizations)
  summary: {
    testAccuracy: {
      label: 'Held-Out Test Accuracy',
      value: `${(benchmarkRaw.accuracy * 100).toFixed(1)}%`,
      exactValue: `${(benchmarkRaw.accuracy * 100).toFixed(2)}%`,
      ratio: `1,756 / ${benchmarkRaw.total_samples}`,
      badge: 'Held-Out Test Partition',
      explanation: 'Evaluated on 1,762 un-augmented test images from the Kaggle ASL dataset. Live camera accuracy varies with real-world lighting and angles.',
    },
    macroF1: {
      label: 'Macro F1-Score',
      value: `${(benchmarkRaw.macro_f1 * 100).toFixed(1)}%`,
      exactValue: `${(benchmarkRaw.macro_f1 * 100).toFixed(2)}%`,
      badge: 'Balanced Across 26 Classes',
      explanation: 'Unweighted mean of F1 scores across all 26 alphabet classes, reflecting balanced precision and recall.',
    },
    classesEvaluated: {
      label: 'Classes Evaluated',
      value: '26 Classes',
      exactValue: '26 / 26',
      badge: 'Alphabet A–Z',
      explanation: 'Full ASL alphabet evaluated (A–Z). Word signs like HELLO and YES are sequence-based.',
    },
    testSamples: {
      label: 'Held-Out Test Samples',
      value: '1,762 Samples',
      exactValue: `${benchmarkRaw.total_samples} Test Frames`,
      badge: '15% Held-Out Split',
      explanation: 'Unseen test partition drawn from the 11,742 total Kaggle ASL Alphabet dataset.',
    },
  },

  // Per-Class Evaluation Performance (A–Z)
  classPerformance,

  // Benchmark Misclassifications (Only 6 errors recorded out of 1,762 samples)
  confusions: {
    totalErrors: 6,
    totalCorrect: 1756,
    testMisclassifications: [
      {
        expected: 'M',
        predicted: 'U',
        samples: 1,
        expectedDetail: 'Three fingers folded forward over tucked thumb',
        predictedDetail: 'Two upright fingers held together',
        explanation: 'Upward camera pitch foreshortens the three draped knuckles into an upright profile.',
        severity: 'minor',
      },
      {
        expected: 'U',
        predicted: 'X',
        samples: 1,
        expectedDetail: 'Two fingers held upright together',
        predictedDetail: 'Hooked index finger knuckle',
        explanation: 'Forward finger tilt toward the camera foreshortens upright fingers into a hooked knuckle profile.',
        severity: 'minor',
      },
      {
        expected: 'X',
        predicted: 'T',
        samples: 1,
        expectedDetail: 'Index finger hooked at knuckle in fist',
        predictedDetail: 'Thumb tucked between index and middle fingers',
        explanation: 'A hooked index finger viewed directly from the front can visually resemble a tucked thumb.',
        severity: 'minor',
      },
      {
        expected: 'E',
        predicted: 'I',
        samples: 1,
        expectedDetail: 'All four fingertips curled onto tucked thumb',
        predictedDetail: 'Pinky raised straight up',
        explanation: 'A relaxed pinky during a tight fist curl can register as an upright pinky landmark if edge contrast is low.',
        severity: 'minor',
      },
      {
        expected: 'I',
        predicted: 'S',
        samples: 1,
        expectedDetail: 'Pinky raised straight up in fist',
        predictedDetail: 'Solid fist with thumb wrapped across',
        explanation: 'When the pinky is angled slightly backward away from the camera, it may not register sufficient vertical protrusion.',
        severity: 'minor',
      },
      {
        expected: 'Y',
        predicted: 'Z',
        samples: 1,
        expectedDetail: 'Thumb and pinky extended wide',
        predictedDetail: 'Index finger tracing dynamic Z',
        explanation: 'During transition into a Y pose, an extended thumb and curled fingers can briefly mirror a dynamic index stroke.',
        severity: 'minor',
      },
    ],
  },

  // Global linguistic data preserved for ContactPage
  globalLinguistics: {
    regions: [
      { id: 'asl', name: 'United States & Canada', language: 'American Sign Language (ASL)', signersApprox: '~500K - 1M' },
      { id: 'bsl', name: 'United Kingdom', language: 'British Sign Language (BSL)', signersApprox: '~150K' },
      { id: 'isl', name: 'India', language: 'Indian Sign Language (ISL)', signersApprox: '~1.5M - 3M' },
    ],
  },
};
