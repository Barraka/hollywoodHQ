const EventEmitter = require('events');
const config = require('../config');

class PuzzleLogic extends EventEmitter {
  constructor(encoders, audio) {
    super();
    this.encoders = encoders;
    this.audio = audio;

    // Current position (normalized 0–1)
    this.x = config.startX;
    this.y = config.startY;

    // Step size per encoder click
    this.stepX = 1 / config.stepsX;
    this.stepY = 1 / config.stepsY;

    // Puzzle state
    this.solved = false;
    this.active = true;
    this._holdTimer = null;
    this._holdStart = null;

    // Listen to encoder turns
    this.encoders.on('turn', (axis, direction) => {
      if (!this.active || this.solved) return;
      this._onTurn(axis, direction);
    });

    // Initial audio distances
    this._updateAudio();
  }

  _onTurn(axis, direction) {
    if (axis === 'x') {
      this.x = Math.max(0, Math.min(1, this.x + direction * this.stepX));
    } else {
      this.y = Math.max(0, Math.min(1, this.y + direction * this.stepY));
    }

    this._updateAudio();
    this._checkSolved();

    this.emit('position', { x: this.x, y: this.y });
  }

  _updateAudio() {
    const distX = Math.abs(this.x - config.targetX);
    const distY = Math.abs(this.y - config.targetY);

    // Normalize distance relative to max possible (0.5 in a 0-1 range, but use 1 for full range)
    this.audio.setDistance('x', Math.min(distX / 0.5, 1));
    this.audio.setDistance('y', Math.min(distY / 0.5, 1));
  }

  _checkSolved() {
    const inX = Math.abs(this.x - config.targetX) <= config.tolerance;
    const inY = Math.abs(this.y - config.targetY) <= config.tolerance;

    if (inX && inY) {
      // Both axes in tolerance zone
      if (!this._holdStart) {
        this._holdStart = Date.now();
        this._holdTimer = setInterval(() => {
          const elapsed = (Date.now() - this._holdStart) / 1000;
          this.emit('holdProgress', elapsed / config.holdDuration);

          if (elapsed >= config.holdDuration) {
            this._solve();
          }
        }, 100);
      }
    } else {
      // Drifted out — reset hold timer
      this._cancelHold();
    }
  }

  _cancelHold() {
    if (this._holdTimer) {
      clearInterval(this._holdTimer);
      this._holdTimer = null;
    }
    if (this._holdStart) {
      this._holdStart = null;
      this.emit('holdProgress', 0);
    }
  }

  _solve() {
    this._cancelHold();
    this.solved = true;
    this.audio.stop();
    this.emit('solved');
    console.log('[puzzle] SOLVED!');
  }

  reset() {
    this._cancelHold();
    this.solved = false;
    this.active = true;
    this.x = config.startX;
    this.y = config.startY;
    this._updateAudio();
    this.emit('position', { x: this.x, y: this.y });
    this.emit('reset');
    console.log('[puzzle] Reset to start position');
  }

  forceSolve() {
    if (!this.solved) {
      this.x = config.targetX;
      this.y = config.targetY;
      this.emit('position', { x: this.x, y: this.y });
      this._solve();
      console.log('[puzzle] Force-solved by GM');
    }
  }

  getState() {
    return {
      x: this.x,
      y: this.y,
      solved: this.solved,
      active: this.active,
    };
  }
}

module.exports = PuzzleLogic;
