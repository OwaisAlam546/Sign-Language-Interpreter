// ─────────────────────────────────────────────────────────────
//  seed/gestures.seed.js — GESTURE DICTIONARY SEEDER
//  Idempotent (upsert by label — safe to run any number of times).
//  Run: npm run seed
//  Exporting seedGestures() lets the verify script reuse it.
// ─────────────────────────────────────────────────────────────
const { connectDB, disconnectDB } = require('../config/db');
const Gesture = require('../models/gesture.model');
const logger = require('../utils/logger');

const GESTURES = [
  // ── Letters A–Z ────────────────────────────────────────────
  { label: 'A', category: 'letter', difficulty: 'easy', description: 'Closed fist with the thumb resting beside the index finger.' },
  { label: 'B', category: 'letter', difficulty: 'easy', description: 'Open palm, fingers held together, thumb tucked across the palm.' },
  { label: 'C', category: 'letter', difficulty: 'easy', description: 'Hand curved into a C shape, fingers together.' },
  { label: 'D', category: 'letter', difficulty: 'easy', description: 'Index finger raised, other fingers curled, thumb resting over them.' },
  { label: 'E', category: 'letter', difficulty: 'medium', description: 'Fingertips folded down toward the palm, thumb across them.' },
  { label: 'F', category: 'letter', difficulty: 'medium', description: 'Index finger and thumb form a circle, three fingers raised.' },
  { label: 'G', category: 'letter', difficulty: 'medium', description: 'Index finger pointing forward, thumb parallel beside it.' },
  { label: 'H', category: 'letter', difficulty: 'medium', description: 'Index and middle fingers extended together sideways, thumb supporting.' },
  { label: 'I', category: 'letter', difficulty: 'easy', description: 'Pinky raised straight, other fingers curled, thumb across them.' },
  { label: 'J', category: 'letter', difficulty: 'hard', description: 'Pinky raised, tracing a J shape through the air.' },
  { label: 'K', category: 'letter', difficulty: 'medium', description: 'Index and middle fingers up in a V, thumb tucked between them.' },
  { label: 'L', category: 'letter', difficulty: 'easy', description: 'Index finger and thumb extended, forming an L shape.' },
  { label: 'M', category: 'letter', difficulty: 'hard', description: 'Index, middle and ring fingers folded over the thumb.' },
  { label: 'N', category: 'letter', difficulty: 'hard', description: 'Index and middle fingers folded over the thumb.' },
  { label: 'O', category: 'letter', difficulty: 'easy', description: 'All fingers and thumb curved together to form an O.' },
  { label: 'P', category: 'letter', difficulty: 'hard', description: 'Index finger pointing forward, thumb below, hand tilted down.' },
  { label: 'Q', category: 'letter', difficulty: 'hard', description: 'Index finger pointing down, thumb beside it, like a rotated P.' },
  { label: 'R', category: 'letter', difficulty: 'medium', description: 'Index and middle fingers crossed, other fingers curled.' },
  { label: 'S', category: 'letter', difficulty: 'easy', description: 'Closed fist with the thumb crossing over the fingers.' },
  { label: 'T', category: 'letter', difficulty: 'medium', description: 'Fist with the thumb tucked between index and middle fingers.' },
  { label: 'U', category: 'letter', difficulty: 'easy', description: 'Index and middle fingers together, pointing straight up.' },
  { label: 'V', category: 'letter', difficulty: 'easy', description: 'Index and middle fingers spread apart in a V shape.' },
  { label: 'W', category: 'letter', difficulty: 'medium', description: 'Index, middle and ring fingers raised, pinky and thumb folded.' },
  { label: 'X', category: 'letter', difficulty: 'medium', description: 'Index finger bent into a hook, other fingers curled.' },
  { label: 'Y', category: 'letter', difficulty: 'easy', description: 'Thumb and pinky extended out, other fingers folded down.' },
  { label: 'Z', category: 'letter', difficulty: 'hard', description: 'Index finger extended, tracing the letter Z in the air.' },

  // ── Core words (10) ─────────────────────────────────────────
  { label: 'HELLO', category: 'word', difficulty: 'easy', description: 'Open hand waving side to side at head level.' },
  { label: 'THANK YOU', category: 'word', difficulty: 'easy', description: 'Flat hand starting at the chin, moving outward and down.' },
  { label: 'PLEASE', category: 'word', difficulty: 'easy', description: 'Open palm making a circular motion over the chest.' },
  { label: 'SORRY', category: 'word', difficulty: 'medium', description: 'Closed fist making a circular motion over the chest.' },
  { label: 'YES', category: 'word', difficulty: 'easy', description: 'Fist nodding up and down like a head nodding.' },
  { label: 'NO', category: 'word', difficulty: 'easy', description: 'Index and middle fingers extended, closing onto the thumb.' },
  { label: 'HELP', category: 'word', difficulty: 'medium', description: 'Thumbs-up hand resting on the open opposite palm, lifting up.' },
  { label: 'GOOD', category: 'word', difficulty: 'easy', description: 'Flat hand moving from the chin outward, palm up.' },
  { label: 'LOVE', category: 'word', difficulty: 'easy', description: 'Thumb, index and pinky extended, crossing the arms over the chest.' },
  { label: 'WATER', category: 'word', difficulty: 'medium', description: 'W hand shape (three fingers up) tapping the chin twice.' },
];

// Upsert every gesture — safe to run repeatedly.
async function seedGestures() {
  let upserted = 0;
  for (const gesture of GESTURES) {
    await Gesture.updateOne({ label: gesture.label }, { $set: gesture }, { upsert: true });
    upserted += 1;
  }
  return upserted;
}

async function main() {
  await connectDB();
  const count = await seedGestures();
  logger.info(`Seeded ${count} gestures (26 letters + 10 words).`);
  await disconnectDB();
}

// Run directly via `npm run seed`, or import for tests/verify
if (require.main === module) {
  main().catch((err) => {
    logger.error('Seed failed', err);
    process.exit(1);
  });
}

module.exports = { seedGestures, GESTURES };
