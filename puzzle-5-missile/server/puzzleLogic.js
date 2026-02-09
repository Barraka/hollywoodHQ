const EventEmitter = require('events');
const config = require('../config');

const INACTIVE = 'inactive';
const FORWARD_ANIM = 'forward_animation';
const REVERSING = 'reversing';
const ANIMATE_LEG = 'animate_leg';
const SOLVED = 'solved';

// Opposite directions (8-way)
const OPPOSITE = {
  n: 's', s: 'n',
  e: 'w', w: 'e',
  ne: 'sw', sw: 'ne',
  se: 'nw', nw: 'se',
};

// Check if input matches expected direction (allows arrow keys to match diagonals in dev mode)
// e.g., 'n' input matches 'n', 'ne', 'nw' expected
function directionMatches(input, expected) {
  if (input === expected) return true; // Exact match

  // Arrow key shortcuts (n/s/e/w) can match diagonal directions
  if (input === 'n' && (expected === 'ne' || expected === 'nw')) return true;
  if (input === 's' && (expected === 'se' || expected === 'sw')) return true;
  if (input === 'e' && (expected === 'ne' || expected === 'se')) return true;
  if (input === 'w' && (expected === 'nw' || expected === 'sw')) return true;

  return false;
}

class PuzzleLogic extends EventEmitter {
  constructor(joystick) {
    super();
    this.joystick = joystick;
    this.state = INACTIVE;

    // During reverse: which leg the player is on (counting backwards)
    // reverseLeg 0 = last leg of forward path (path[N-1] → path[N-2])
    this.reverseLeg = 0;
    this.totalLegs = config.directions.length;

    // Current missile position index in path (during reverse, starts at last city)
    this.missileAt = config.path.length - 1;

    // Timer for input timeout
    this.timerId = null;
    this.timeRemaining = 0;

    // Wire joystick
    this.joystick.on('direction', (dir) => this._onDirection(dir));
  }

  activate() {
    if (this.state !== INACTIVE) return;
    console.log('[puzzle5] Activating — playing forward animation');
    this.state = FORWARD_ANIM;
    this.reverseLeg = 0;
    this.missileAt = config.path.length - 1;
    this.emit('forwardAnimation', config.path, config.directions, config.forwardAnimDuration);
    this.emit('stateChange', this.getState());
  }

  // Called by frontend when forward animation completes
  forwardAnimDone() {
    if (this.state !== FORWARD_ANIM) return;
    console.log('[puzzle5] Forward animation complete — ready for reverse input');
    this.state = REVERSING;
    this.missileAt = config.path.length - 1;
    this.reverseLeg = 0;
    this._startTimer();
    this.emit('stateChange', this.getState());
  }

  _startTimer() {
    this._stopTimer();
    this.timeRemaining = config.inputTimeLimit * 1000; // Convert to milliseconds
    this.emit('timerUpdate', this.timeRemaining);

    this.timerId = setInterval(() => {
      this.timeRemaining -= 100; // Decrease by 100ms
      this.emit('timerUpdate', this.timeRemaining);

      if (this.timeRemaining <= 0) {
        this._onTimeout();
      }
    }, 100); // Update every 100ms for smooth countdown
  }

  _stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.timeRemaining = 0;
  }

  _onTimeout() {
    console.log('[puzzle5] Timer expired — resetting to beginning of reversal');
    this._stopTimer();

    // Reset to beginning of reversal phase (keep forward animation done)
    // State changes to a waiting state (still REVERSING but timer is stopped)
    this.state = REVERSING;
    this.missileAt = config.path.length - 1;
    this.reverseLeg = 0;

    this.emit('timeout');
    this.emit('stateChange', this.getState());

    // DO NOT restart timer - wait for player to click START button
  }

  // Resume after timeout - called when player clicks START button
  resumeAfterTimeout() {
    if (this.state === REVERSING && this.reverseLeg === 0) {
      console.log('[puzzle5] Resuming after timeout — restarting timer');
      this._startTimer();
    }
  }

  _onDirection(dir) {
    if (this.state !== REVERSING) return;

    // The forward direction for the current leg (counting from the end)
    // reverseLeg 0 = last forward leg, which is directions[totalLegs - 1]
    const forwardIndex = this.totalLegs - 1 - this.reverseLeg;
    const forwardDir = config.directions[forwardIndex];
    const expectedDir = OPPOSITE[forwardDir];

    console.log(`[puzzle5] Input: ${dir} | Expected: ${expectedDir} (reverse of ${forwardDir})`);

    if (directionMatches(dir, expectedDir)) {
      // Correct! Stop timer and animate missile one leg back
      this._stopTimer();
      this.state = ANIMATE_LEG;
      const fromCity = this.missileAt;
      this.missileAt--;
      this.reverseLeg++;

      this.emit('correctInput', dir, fromCity, this.missileAt, config.legAnimDuration);

      // After animation, check if done
      setTimeout(() => {
        if (this.state !== ANIMATE_LEG) return;

        if (this.reverseLeg >= this.totalLegs) {
          // All legs reversed — solved!
          this.state = SOLVED;
          this.emit('stateChange', this.getState());
          console.log('[puzzle5] SOLVED! Missile returned to origin');
        } else {
          this.state = REVERSING;
          this.emit('stateChange', this.getState());
          // Restart timer for next input
          this._startTimer();
        }
      }, config.legAnimDuration * 1000 + 200);
    } else {
      // Wrong direction - just show error, keep position and timer running
      console.log('[puzzle5] Wrong input — try again (timer still running)');
      this.emit('wrongInput', dir, expectedDir);

      // Keep state as REVERSING, position unchanged, timer continues
      // Only timeout will reset position to beginning
    }
  }

  forceSolve() {
    if (this.state === SOLVED) return;
    console.log('[puzzle5] Force-solved by GM');
    this._stopTimer();
    this.missileAt = 0;
    this.reverseLeg = this.totalLegs;
    this.state = SOLVED;
    this.emit('stateChange', this.getState());
  }

  reset() {
    console.log('[puzzle5] Resetting');
    this._stopTimer();
    this.state = INACTIVE;
    this.reverseLeg = 0;
    this.missileAt = config.path.length - 1;
    this.emit('stateChange', this.getState());
  }

  getState() {
    return {
      state: this.state,
      missileAt: this.missileAt,
      reverseLeg: this.reverseLeg,
      totalLegs: this.totalLegs,
      totalCities: config.path.length,
      path: config.path,
      directions: config.directions,
      timeRemaining: this.timeRemaining,
    };
  }
}

module.exports = PuzzleLogic;
