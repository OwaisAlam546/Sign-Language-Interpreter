/**
 * ─────────────────────────────────────────────────────────────────────────────
 * lib/swipeDeleteDetector.js — Real-Time Left-Swipe Gesture Detector
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects deliberate horizontal leftward hand swipes for the DELETE/BACKSPACE action.
 *
 * Designed for real-time webcam human-computer interaction:
 *  - Tracks wrist landmark (index 0) over consecutive frames with timestamps.
 *  - Maintains a rolling history of 5–12 timestamped positions.
 *  - Normalizes horizontal displacement relative to palm scale (wrist-to-MCP9 & MCP5-to-MCP17).
 *  - Accurately mirrors coordinates so user-visible leftward motion is always detected.
 *  - Rejects slow drifts, small jitter, vertical hand drops, and sign-to-sign transitions.
 *  - Implements a strict cooldown & settlement state machine (single delete per swipe).
 *  - Provides live telemetry for HUD diagnostics.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const DEFAULT_SWIPE_CONFIG = Object.freeze({
  minDisplacement: 0.70,     // Minimum normalized horizontal displacement (in palm-widths)
  minVelocity: 2.0,          // Minimum normalized horizontal velocity (palm-widths / second)
  dominanceRatio: 1.20,      // Horizontal displacement must exceed vertical by this ratio
  minWindowMs: 80,           // Minimum gesture duration window in milliseconds
  maxWindowMs: 450,          // Maximum gesture duration window in milliseconds
  cooldownMs: 600,           // Cooldown period after a triggered swipe before re-arming
  settledVelocity: 0.75,     // Hand velocity must fall below this to consider the hand settled
  bufferCapacity: 12,        // Maximum number of rolling history frames
  minPalmScale: 0.035,       // Minimum palm size to filter out noise or distant hands
});

function getPointCoords(pt) {
  if (!pt) return null;
  const x = typeof pt.x === 'number' ? pt.x : (Array.isArray(pt) ? pt[0] : null);
  const y = typeof pt.y === 'number' ? pt.y : (Array.isArray(pt) ? pt[1] : null);
  if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
}

/**
 * Computes palm scale based on the maximum of palm length (wrist to MCP9)
 * and palm width (MCP5 to MCP17). Invariant to hand orientation and distance.
 */
export function computeHandScale(landmarks) {
  if (!landmarks || landmarks.length < 21) return 0.04;
  const p0 = getPointCoords(landmarks[0]);   // Wrist
  const p5 = getPointCoords(landmarks[5]);   // Index MCP
  const p9 = getPointCoords(landmarks[9]);   // Middle MCP
  const p17 = getPointCoords(landmarks[17]); // Pinky MCP

  if (!p0 || !p5 || !p9 || !p17) return 0.04;

  const palmLength = Math.hypot(p9.x - p0.x, p9.y - p0.y);
  const palmWidth = Math.hypot(p17.x - p5.x, p17.y - p5.y);
  return Math.max(palmLength, palmWidth, 0.04);
}

export class SwipeDeleteDetector {
  constructor(config = {}) {
    this.config = { ...DEFAULT_SWIPE_CONFIG, ...config };
    this.history = []; // Array of { timestamp, rawX, rawY, userX, userY, palmScale }
    this.lastTriggerTime = 0;
    this.inCooldown = false;
    this.consumed = false;
    this.lastDirection = 'NONE';
    this.status = 'IDLE'; // 'IDLE' | 'ARMED' | 'TRIGGERED' | 'COOLDOWN' | 'SETTLING'
    this.lastDiagnostics = {
      triggered: false,
      status: 'IDLE',
      wristPosition: { x: 0, y: 0, userX: 0 },
      normDeltaX: 0,
      normDeltaY: 0,
      velocity: 0,
      direction: 'NONE',
      reason: 'No hand detected',
      inCooldown: false,
      consumed: false,
      candidate: false,
      palmScale: 0.04,
    };
  }

  /**
   * Resets all tracking state and clears the history buffer.
   */
  reset() {
    this.history = [];
    this.inCooldown = false;
    this.consumed = false;
    this.lastDirection = 'NONE';
    this.status = 'IDLE';
    this.lastDiagnostics = {
      triggered: false,
      status: 'IDLE',
      wristPosition: { x: 0, y: 0, userX: 0 },
      normDeltaX: 0,
      normDeltaY: 0,
      velocity: 0,
      direction: 'NONE',
      reason: 'Tracking reset / No hand detected',
      inCooldown: false,
      consumed: false,
      candidate: false,
      palmScale: 0.04,
    };
  }

  /**
   * Evaluates the latest frame landmarks for a left-swipe delete action.
   *
   * @param {Array} landmarks - 21 MediaPipe hand landmarks
   * @param {number} timestamp - Current frame timestamp (ms)
   * @param {boolean} mirror - Whether the camera preview is mirrored (default: true)
   * @returns {Object} Diagnostics and trigger result
   */
  update(landmarks, timestamp = performance.now(), mirror = true) {
    // 1. Validate hand landmarks
    if (!landmarks || landmarks.length < 21) {
      this.reset();
      return this.lastDiagnostics;
    }

    const wrist = getPointCoords(landmarks[0]);
    if (!wrist) {
      this.history = [];
      this.status = 'IDLE';
      this.lastDiagnostics = {
        ...this.lastDiagnostics,
        triggered: false,
        status: 'IDLE',
        reason: 'Non-finite wrist coordinates',
        direction: 'NONE',
      };
      return this.lastDiagnostics;
    }

    const palmScale = computeHandScale(landmarks);
    if (palmScale < this.config.minPalmScale) {
      this.history = [];
      this.status = 'IDLE';
      this.lastDiagnostics = {
        ...this.lastDiagnostics,
        triggered: false,
        status: 'IDLE',
        reason: 'Hand too distant or tracking quality insufficient',
        direction: 'NONE',
        palmScale,
      };
      return this.lastDiagnostics;
    }

    // 2. Map coordinates to user-visible display space
    // When mirrored, visual left is inverted from raw sensor x
    const userX = mirror ? (1.0 - wrist.x) : wrist.x;
    const userY = wrist.y;

    // Reset history if time gap exceeds 500ms (tracking interruption / dropped frames)
    if (this.history.length > 0) {
      const lastEntry = this.history[this.history.length - 1];
      if (timestamp - lastEntry.timestamp > 500) {
        this.history = [];
      }
    }

    // Push current sample to rolling buffer
    this.history.push({
      timestamp,
      rawX: wrist.x,
      rawY: wrist.y,
      userX,
      userY,
      palmScale,
    });

    if (this.history.length > this.config.bufferCapacity) {
      this.history.shift();
    }

    // 3. Handle Cooldown and Settling Phase
    if (this.inCooldown) {
      const elapsed = timestamp - this.lastTriggerTime;

      // Calculate recent short-term velocity to check if hand has settled
      let recentVel = 0;
      if (this.history.length >= 2) {
        const prev = this.history[this.history.length - 2];
        const dt = Math.max((timestamp - prev.timestamp) / 1000, 0.001);
        const dx = Math.abs(userX - prev.userX);
        recentVel = (dx / palmScale) / dt;
      }

      if (elapsed >= this.config.cooldownMs && recentVel < this.config.settledVelocity) {
        // Cooldown passed AND hand has settled: Re-arm detector
        this.inCooldown = false;
        this.consumed = false;
        this.status = 'ARMED';
      } else {
        this.status = elapsed < this.config.cooldownMs ? 'COOLDOWN' : 'SETTLING';
        this.lastDiagnostics = {
          triggered: false,
          status: this.status,
          wristPosition: { x: wrist.x, y: wrist.y, userX },
          normDeltaX: 0,
          normDeltaY: 0,
          velocity: recentVel,
          direction: this.lastDirection,
          reason: elapsed < this.config.cooldownMs
            ? `In cooldown (${Math.round(this.config.cooldownMs - elapsed)}ms remaining)`
            : `Waiting for hand to settle (vel: ${recentVel.toFixed(2)} >= ${this.config.settledVelocity})`,
          inCooldown: true,
          consumed: this.consumed,
          candidate: false,
          palmScale,
        };
        return this.lastDiagnostics;
      }
    }

    // 4. Scan rolling history for swipe trajectory
    // We inspect past samples within [minWindowMs, maxWindowMs]
    let bestCandidate = null;
    const current = this.history[this.history.length - 1];

    for (let i = this.history.length - 2; i >= 0; i--) {
      const past = this.history[i];
      const deltaT = current.timestamp - past.timestamp;

      if (deltaT < this.config.minWindowMs) continue;
      if (deltaT > this.config.maxWindowMs) break;

      const dtSec = deltaT / 1000;
      const deltaX = current.userX - past.userX;
      const deltaY = current.userY - past.userY;
      const normDeltaX = deltaX / palmScale;
      const normDeltaY = deltaY / palmScale;
      const velocity = Math.abs(normDeltaX) / dtSec;

      const candidate = {
        pastIndex: i,
        deltaT,
        deltaX,
        deltaY,
        normDeltaX,
        normDeltaY,
        velocity,
      };

      // We prioritize the sample with maximum negative (leftward) displacement
      if (!bestCandidate || candidate.normDeltaX < bestCandidate.normDeltaX) {
        bestCandidate = candidate;
      }
    }

    // If not enough history samples, report armed/waiting
    if (!bestCandidate) {
      this.status = 'ARMED';
      this.lastDiagnostics = {
        triggered: false,
        status: 'ARMED',
        wristPosition: { x: wrist.x, y: wrist.y, userX },
        normDeltaX: 0,
        normDeltaY: 0,
        velocity: 0,
        direction: 'NONE',
        reason: 'Accumulating motion history',
        inCooldown: false,
        consumed: false,
        candidate: false,
        palmScale,
      };
      return this.lastDiagnostics;
    }

    const { normDeltaX, normDeltaY, velocity } = bestCandidate;
    const isLeftward = normDeltaX < 0;
    const absNormX = Math.abs(normDeltaX);
    const absNormY = Math.abs(normDeltaY);
    const isDominant = absNormX > (this.config.dominanceRatio * absNormY);
    const hasDisplacement = absNormX >= this.config.minDisplacement;
    const hasVelocity = velocity >= this.config.minVelocity;
    const isCandidate = isLeftward && absNormX >= (this.config.minDisplacement * 0.45);

    // Determine direction string for telemetry
    const directionStr = Math.abs(normDeltaX) < 0.15 ? 'NONE' : (isLeftward ? 'LEFT' : 'RIGHT');

    // 5. Evaluate Trigger Conditions
    if (isLeftward && isDominant && hasDisplacement && hasVelocity) {
      // VALID SWIPE DETECTED
      this.lastTriggerTime = timestamp;
      this.inCooldown = true;
      this.consumed = true;
      this.status = 'TRIGGERED';
      this.lastDirection = 'LEFT';

      // Clear history up to the current sample to prevent multi-triggering
      this.history = [current];

      this.lastDiagnostics = {
        triggered: true,
        status: 'TRIGGERED',
        wristPosition: { x: wrist.x, y: wrist.y, userX },
        normDeltaX,
        normDeltaY,
        velocity,
        direction: 'LEFT',
        reason: 'Accepted: Fast leftward swipe detected',
        inCooldown: true,
        consumed: true,
        candidate: false,
        palmScale,
      };
      return this.lastDiagnostics;
    }

    // 6. Diagnostics reason when rejected
    let reason = 'Holding / Stationary';
    if (!isLeftward && absNormX > 0.25) {
      reason = 'Rejected: Rightward movement (must swipe left)';
    } else if (isLeftward && !isDominant) {
      reason = `Rejected: Movement not horizontal (dx: ${absNormX.toFixed(2)}, dy: ${absNormY.toFixed(2)})`;
    } else if (isLeftward && !hasDisplacement) {
      reason = `Rejected: Displacement too small (${absNormX.toFixed(2)} < ${this.config.minDisplacement})`;
    } else if (isLeftward && !hasVelocity) {
      reason = `Rejected: Movement too slow (${velocity.toFixed(2)} < ${this.config.minVelocity} palms/s)`;
    }

    this.status = 'ARMED';
    this.lastDirection = directionStr;
    this.lastDiagnostics = {
      triggered: false,
      status: 'ARMED',
      wristPosition: { x: wrist.x, y: wrist.y, userX },
      normDeltaX,
      normDeltaY,
      velocity,
      direction: directionStr,
      reason,
      inCooldown: false,
      consumed: false,
      candidate: isCandidate,
      palmScale,
    };

    return this.lastDiagnostics;
  }

  getDiagnostics() {
    return { ...this.lastDiagnostics };
  }
}
