const EventEmitter = require('events');
const config = require('../config');

const INACTIVE = 'inactive';
const ACTIVE = 'active';
const SOLVED = 'solved';

class PuzzleLogic extends EventEmitter {
  constructor(buttonManager) {
    super();
    this.buttonManager = buttonManager;
    this.state = INACTIVE;

    // Track which buttons are pressed (locked)
    this.pressedButtons = new Set();

    // Track blinking state for each button
    this.blinkTimers = new Map();
    this.blinkStates = new Map(); // button ID -> true/false (lit or not)

    // Wire button presses
    this.buttonManager.on('press', (buttonId) => this._onButtonPress(buttonId));
  }

  activate() {
    if (this.state !== INACTIVE) return;
    console.log('[puzzle1] Activating — starting random blink patterns');
    this.state = ACTIVE;
    this.pressedButtons.clear();
    this.buttonManager.allOff();
    this._startBlinking();
    this.emit('stateChange', this.getState());
  }

  _startBlinking() {
    config.buttons.forEach(btn => {
      this._blinkButton(btn.id);
    });
  }

  _blinkButton(buttonId) {
    if (this.state !== ACTIVE) return;
    if (this.pressedButtons.has(buttonId)) return; // Already pressed, don't blink

    // Random interval between min and max
    const interval = Math.random() * (config.blinkIntervalMax - config.blinkIntervalMin) + config.blinkIntervalMin;

    const timer = setTimeout(() => {
      // Turn LED on
      this.blinkStates.set(buttonId, true);
      this.buttonManager.setLED(buttonId, true);
      this.emit('buttonBlink', buttonId, true);

      // Turn LED off after blinkDuration
      setTimeout(() => {
        if (!this.pressedButtons.has(buttonId)) {
          this.blinkStates.set(buttonId, false);
          this.buttonManager.setLED(buttonId, false);
          this.emit('buttonBlink', buttonId, false);
        }

        // Schedule next blink
        this._blinkButton(buttonId);
      }, config.blinkDuration);
    }, interval);

    this.blinkTimers.set(buttonId, timer);
  }

  _onButtonPress(buttonId) {
    if (this.state !== ACTIVE) return;

    // Check if this button is currently lit (blinking)
    const isLit = this.blinkStates.get(buttonId);

    if (isLit && !this.pressedButtons.has(buttonId)) {
      // Correct press!
      console.log(`[puzzle1] Correct press: Button ${buttonId}`);
      this.pressedButtons.add(buttonId);

      // Stop blinking this button
      clearTimeout(this.blinkTimers.get(buttonId));
      this.blinkTimers.delete(buttonId);

      // Keep LED on (locked)
      this.buttonManager.setLED(buttonId, true);
      this.emit('correctPress', buttonId);
      this.emit('stateChange', this.getState());

      // Check if all buttons pressed
      if (this.pressedButtons.size === config.buttons.length) {
        this._onSolved();
      }
    } else {
      // Wrong press (button not lit or already pressed)
      console.log(`[puzzle1] Wrong press: Button ${buttonId}`);
      this.emit('wrongPress', buttonId);
      this.buttonManager.flashAll(config.wrongFlashDuration);
    }
  }

  _onSolved() {
    console.log('[puzzle1] SOLVED! All buttons pressed');
    this.state = SOLVED;

    // Stop all blinking
    this.blinkTimers.forEach(timer => clearTimeout(timer));
    this.blinkTimers.clear();

    // All LEDs solid
    config.buttons.forEach(btn => {
      this.buttonManager.setLED(btn.id, true);
    });

    this.emit('stateChange', this.getState());
  }

  forceSolve() {
    if (this.state === SOLVED) return;
    console.log('[puzzle1] Force-solved by GM');
    this.blinkTimers.forEach(timer => clearTimeout(timer));
    this.blinkTimers.clear();
    this.state = SOLVED;
    this.pressedButtons = new Set(config.buttons.map(b => b.id));
    config.buttons.forEach(btn => this.buttonManager.setLED(btn.id, true));
    this.emit('stateChange', this.getState());
  }

  reset() {
    console.log('[puzzle1] Resetting');
    this.blinkTimers.forEach(timer => clearTimeout(timer));
    this.blinkTimers.clear();
    this.blinkStates.clear();
    this.state = INACTIVE;
    this.pressedButtons.clear();
    this.buttonManager.allOff();
    this.emit('stateChange', this.getState());
  }

  getState() {
    return {
      state: this.state,
      totalButtons: config.buttons.length,
      pressedCount: this.pressedButtons.size,
      pressedButtons: Array.from(this.pressedButtons),
    };
  }
}

module.exports = PuzzleLogic;
