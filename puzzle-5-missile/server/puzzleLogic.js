const EventEmitter = require('events');
const config = require('../config');

const INACTIVE = 'inactive';
const FORWARD_ANIM = 'forward_animation';
const REVERSING = 'reversing';
const ANIMATE_LEG = 'animate_leg';
const SOLVED = 'solved';

// Opposite directions
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

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
    this.emit('stateChange', this.getState());
  }

  _onDirection(dir) {
    if (this.state !== REVERSING) return;

    // The forward direction for the current leg (counting from the end)
    // reverseLeg 0 = last forward leg, which is directions[totalLegs - 1]
    const forwardIndex = this.totalLegs - 1 - this.reverseLeg;
    const forwardDir = config.directions[forwardIndex];
    const expectedDir = OPPOSITE[forwardDir];

    console.log(`[puzzle5] Input: ${dir} | Expected: ${expectedDir} (reverse of ${forwardDir})`);

    if (dir === expectedDir) {
      // Correct! Animate missile one leg back
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
        }
      }, config.legAnimDuration * 1000 + 200);
    } else {
      // Wrong direction
      this.emit('wrongInput', dir, expectedDir);
    }
  }

  forceSolve() {
    if (this.state === SOLVED) return;
    console.log('[puzzle5] Force-solved by GM');
    this.missileAt = 0;
    this.reverseLeg = this.totalLegs;
    this.state = SOLVED;
    this.emit('stateChange', this.getState());
  }

  reset() {
    console.log('[puzzle5] Resetting');
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
    };
  }
}

module.exports = PuzzleLogic;
