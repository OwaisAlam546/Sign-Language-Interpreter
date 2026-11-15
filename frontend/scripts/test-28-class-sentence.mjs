// frontend/scripts/test-28-class-sentence.mjs
// Verification suite: 28-Class Sentence Construction & Control Gestures (SPACE, DEL, Timeout)
import assert from 'node:assert/strict';
import { isAcceptedPrediction } from '../src/lib/recognitionPolicy.js';

console.log('================================================================');
console.log('SIGNSPEAK AI: 28-CLASS SENTENCE CONSTRUCTION & CONTROL TEST');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function testAssert(name, condition, extra = '') {
  totalTests++;
  if (!condition) {
    console.error(`  [FAIL] ${name} ${extra ? `(${extra})` : ''}`);
    throw new Error(`Assertion failed: ${name}`);
  }
  console.log(`  [PASS] ${name}`);
  passedTests++;
}

// Simulated LiveDemo state harness that models exact LiveDemo logic
class LiveDemoSimulator {
  constructor() {
    this.rec = '';
    this.words = [];
    this.spokenTexts = [];
    this.speaking = false;
    this.gesture = '';
    this.recognitionState = 'standby';
    this.statusMessage = '';
    this.state = { candidate: '', count: 0, neutral: 0, armed: true, last: '' };
    this.idleTimer = null;
    this.WORD_PAUSE_MS = 1200;
  }

  speak(text) {
    if (text) {
      this.spokenTexts.push(text.toLowerCase());
      this.speaking = true;
    }
  }

  resolveSpelledText(value) {
    const raw = String(value || '').trim().toUpperCase();
    return raw;
  }

  clearIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  finishWord() {
    if (this.idleTimer) return;
    this.idleTimer = setTimeout(() => {
      const spelled = this.rec;
      const trimmed = spelled.trim();
      if (trimmed) {
        const word = this.resolveSpelledText(trimmed);
        this.words.push(word);
        this.speak(word);
        this.rec = '';
      }
      this.state.last = '';
      this.idleTimer = null;
    }, 50); // shortened timeout for fast testing
  }

  acceptPrediction(data) {
    const rawLabel = typeof data?.gesture === 'string' ? data.gesture.trim().toUpperCase() : '';
    let label = null;
    if (/^[A-Z]$/.test(rawLabel)) label = rawLabel;
    else if (rawLabel === 'DEL' || rawLabel === 'SPACE') label = rawLabel;

    const valid = isAcceptedPrediction({
      gesture: label,
      confidence: data?.confidence ?? 0.95,
      margin: data?.margin ?? 0.8,
      displayed: true,
      serviceState: 'local',
    });

    if (!valid) {
      this.recognitionState = 'uncertain';
      return;
    }

    this.clearIdle();

    const state = this.state;
    state.neutral = 0;

    if (state.candidate === label) {
      state.count += 1;
    } else {
      state.candidate = label;
      state.count = 1;
      if (label !== state.last) state.armed = true;
    }

    if (state.count >= 2 || label === state.last) {
      this.recognitionState = 'stable';
      this.gesture = label;
    }

    const requiredStable = 4; // STABLE_FRAMES_STATIC
    if (state.armed && state.count >= requiredStable && label !== state.last) {
      this.recognitionState = 'committed';
      if (label === 'SPACE') {
        if (this.rec.length > 0 && !this.rec.endsWith(' ')) {
          this.rec += ' ';
        }
      } else if (label === 'DEL') {
        if (this.rec.length > 0) {
          this.rec = this.rec.slice(0, -1);
        }
      } else if (/^[A-Z]$/.test(label)) {
        this.rec += label;
      }
      state.last = label;
      state.armed = false;
      state.count = 0;
    }
  }

  feedFrames(label, frameCount = 5, confidence = 0.95) {
    for (let i = 0; i < frameCount; i++) {
      this.acceptPrediction({ gesture: label, confidence, margin: 0.8 });
    }
  }

  feedNeutral(frameCount = 4) {
    for (let i = 0; i < frameCount; i++) {
      this.state.neutral += 1;
      if (this.state.neutral >= 4) {
        this.state.armed = true;
        this.state.last = '';
      }
    }
  }

  feedHandsDown() {
    this.state.armed = true;
    this.state.last = '';
    this.finishWord();
  }
}

// -------------------------------------------------------------
// Test Case 1: Letter committing to spelled buffer
// -------------------------------------------------------------
console.log('--- Test 1: Spelled Letter Commit ---');
const sim1 = new LiveDemoSimulator();
sim1.feedFrames('A', 5);
testAssert('Letter A committed to rec buffer', sim1.rec === 'A');
testAssert('No speech triggered yet during spelling', sim1.spokenTexts.length === 0);

// -------------------------------------------------------------
// Test Case 2: SPACE appends space to active buffer, no speech
// -------------------------------------------------------------
console.log('\n--- Test 2: SPACE Control Sign ---');
sim1.feedNeutral(4);
sim1.feedFrames('B', 5);
testAssert('Buffer contains "AB"', sim1.rec === 'AB');
sim1.feedNeutral(4);
sim1.feedFrames('SPACE', 5);
testAssert('Buffer contains "AB "', sim1.rec === 'AB ');
testAssert('SPACE does NOT speak utterance', sim1.spokenTexts.length === 0);
testAssert('SPACE does NOT commit to words list', sim1.words.length === 0);

// -------------------------------------------------------------
// Test Case 3: Repeated SPACE held does not append multiple spaces
// -------------------------------------------------------------
console.log('\n--- Test 3: Repeated SPACE While Held ---');
sim1.feedFrames('SPACE', 10);
testAssert('Buffer still has single trailing space', sim1.rec === 'AB ');

// -------------------------------------------------------------
// Test Case 4: DEL removes last character, no speech
// -------------------------------------------------------------
console.log('\n--- Test 4: DEL Control Sign ---');
sim1.feedNeutral(4);
sim1.feedFrames('DEL', 5);
testAssert('DEL removed trailing space: buffer is "AB"', sim1.rec === 'AB');
testAssert('DEL does NOT speak utterance', sim1.spokenTexts.length === 0);

sim1.feedNeutral(4);
sim1.feedFrames('DEL', 5);
testAssert('DEL removed "B": buffer is "A"', sim1.rec === 'A');

// -------------------------------------------------------------
// Test Case 5: Repeated DEL while held does not repeatedly delete
// -------------------------------------------------------------
console.log('\n--- Test 5: Repeated DEL While Held ---');
sim1.feedFrames('DEL', 10);
testAssert('Held DEL did NOT delete again: buffer remains "A"', sim1.rec === 'A');

// -------------------------------------------------------------
// Test Case 6: DEL on empty buffer is safe
// -------------------------------------------------------------
console.log('\n--- Test 6: DEL on Empty Buffer ---');
const simEmpty = new LiveDemoSimulator();
simEmpty.feedFrames('DEL', 5);
testAssert('DEL on empty buffer remains empty', simEmpty.rec === '');
testAssert('DEL on empty buffer does not crash or speak', simEmpty.spokenTexts.length === 0);

// -------------------------------------------------------------
// Test Case 7: Hands-down timeout speaks text and resets buffer
// -------------------------------------------------------------
console.log('\n--- Test 7: Hands-Down Timeout Speaking ---');
const sim7 = new LiveDemoSimulator();
sim7.feedFrames('O', 5);
sim7.feedNeutral(4);
sim7.feedFrames('K', 5);
testAssert('Buffer contains "OK"', sim7.rec === 'OK');
sim7.feedHandsDown();

await new Promise((resolve) => setTimeout(resolve, 80));
testAssert('Words array received "OK"', sim7.words.length === 1 && sim7.words[0] === 'OK');
testAssert('TTS spoken utterance received "ok"', sim7.spokenTexts.length === 1 && sim7.spokenTexts[0] === 'ok');
testAssert('Buffer cleared after word finalized', sim7.rec === '');

// -------------------------------------------------------------
// Test Case 8: Hands-down with whitespace only does NOT speak
// -------------------------------------------------------------
console.log('\n--- Test 8: Hands-Down with Whitespace Only ---');
const sim8 = new LiveDemoSimulator();
sim8.rec = '   ';
sim8.feedHandsDown();
await new Promise((resolve) => setTimeout(resolve, 80));
testAssert('Whitespace buffer does NOT speak', sim8.spokenTexts.length === 0);
testAssert('Whitespace buffer does NOT add to words', sim8.words.length === 0);

// -------------------------------------------------------------
// Test Case 9: Multi-word sentence construction flow
// -------------------------------------------------------------
console.log('\n--- Test 9: Multi-Word Sentence Construction Flow ---');
const simSentence = new LiveDemoSimulator();
// Spell O W A I S
for (const letter of ['O', 'W', 'A', 'I', 'S']) {
  simSentence.feedNeutral(4);
  simSentence.feedFrames(letter, 5);
}
testAssert('Spelled "OWAIS"', simSentence.rec === 'OWAIS');

// SPACE
simSentence.feedNeutral(4);
simSentence.feedFrames('SPACE', 5);
testAssert('Space added -> "OWAIS "', simSentence.rec === 'OWAIS ');

// Spell M Y
for (const letter of ['M', 'Y']) {
  simSentence.feedNeutral(4);
  simSentence.feedFrames(letter, 5);
}
testAssert('Spelled "OWAIS MY"', simSentence.rec === 'OWAIS MY');

// Hands drop -> timeout speaks sentence
simSentence.feedHandsDown();
await new Promise((resolve) => setTimeout(resolve, 80));

testAssert('Words received full sentence "OWAIS MY"', simSentence.words.includes('OWAIS MY'));
testAssert('TTS spoke "owais my" once', simSentence.spokenTexts.length === 1 && simSentence.spokenTexts[0] === 'owais my');
testAssert('Active buffer is now empty', simSentence.rec === '');

// -------------------------------------------------------------
// Test Case 10: DEL Correction during multi-word sentence
// -------------------------------------------------------------
console.log('\n--- Test 10: In-Sentence Typo Correction with DEL ---');
const simCorrect = new LiveDemoSimulator();
// Spell H E L L O
for (const letter of ['H', 'E', 'L', 'L', 'O']) {
  simCorrect.feedNeutral(4);
  simCorrect.feedFrames(letter, 5);
}
// Space
simCorrect.feedNeutral(4);
simCorrect.feedFrames('SPACE', 5);
// Typo W R
simCorrect.feedNeutral(4);
simCorrect.feedFrames('W', 5);
simCorrect.feedNeutral(4);
simCorrect.feedFrames('R', 5);
testAssert('Buffer with typo: "HELLO WR"', simCorrect.rec === 'HELLO WR');

// Correct typo with DEL
simCorrect.feedNeutral(4);
simCorrect.feedFrames('DEL', 5);
testAssert('DEL removed R -> "HELLO W"', simCorrect.rec === 'HELLO W');

// Finish word O R L D
for (const letter of ['O', 'R', 'L', 'D']) {
  simCorrect.feedNeutral(4);
  simCorrect.feedFrames(letter, 5);
}
testAssert('Corrected sentence buffer: "HELLO WORLD"', simCorrect.rec === 'HELLO WORLD');

// Hands down
simCorrect.feedHandsDown();
await new Promise((resolve) => setTimeout(resolve, 80));

testAssert('Words finalized as "HELLO WORLD"', simCorrect.words.includes('HELLO WORLD'));
testAssert('TTS spoken as "hello world"', simCorrect.spokenTexts.length === 1 && simCorrect.spokenTexts[0] === 'hello world');

console.log(`\n================================================================`);
console.log(`SENTENCE CONSTRUCTION VERIFICATION: ${passedTests} passed, 0 failed (${totalTests} total)`);
console.log(`================================================================\n`);
