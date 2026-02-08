const EventEmitter = require('events');
const config = require('../config');

class Encoders extends EventEmitter {
  constructor(mock = false) {
    super();
    this.mock = mock;
    this.destroyed = false;

    if (mock) {
      this._initMock();
    } else {
      this._initGPIO();
    }
  }

  // --- Real GPIO (Raspberry Pi) ---

  _initGPIO() {
    let Gpio;
    try {
      Gpio = require('onoff').Gpio;
    } catch {
      console.warn('[encoders] onoff not available, falling back to mock mode');
      this.mock = true;
      this._initMock();
      return;
    }

    // Encoder pins from config.js
    // NOTE: These GPIO pins are shared with Puzzle 1 (Simon buttons) and Puzzle 5 (Joystick)
    // This is safe because puzzles run sequentially
    const xPins = config.encoderPins.x;
    const yPins = config.encoderPins.y;

    this.encoderX = { clk: new Gpio(xPins.clk, 'in', 'both'), dt: new Gpio(xPins.dt, 'in') };
    this.encoderY = { clk: new Gpio(yPins.clk, 'in', 'both'), dt: new Gpio(yPins.dt, 'in') };

    this.encoderX.lastClk = this.encoderX.clk.readSync();
    this.encoderY.lastClk = this.encoderY.clk.readSync();

    this.encoderX.clk.watch((err, value) => {
      if (err || this.destroyed) return;
      const dt = this.encoderX.dt.readSync();
      // Quadrature decoding: if CLK leads DT, direction is positive (clockwise)
      const direction = value !== dt ? 1 : -1;
      this.emit('turn', 'x', direction);
    });

    this.encoderY.clk.watch((err, value) => {
      if (err || this.destroyed) return;
      const dt = this.encoderY.dt.readSync();
      const direction = value !== dt ? 1 : -1;
      this.emit('turn', 'y', direction);
    });

    console.log(`[encoders] GPIO initialized (X: CLK=${xPins.clk} DT=${xPins.dt}, Y: CLK=${yPins.clk} DT=${yPins.dt})`);
  }

  // --- Mock mode (keyboard input via stdin or WebSocket commands) ---

  _initMock() {
    console.log('[encoders] Mock mode — use arrow keys or WASD in the browser to simulate encoders');
  }

  // Called by the server when it receives keyboard input from the frontend
  simulateTurn(axis, direction) {
    if (!this.mock) return;
    this.emit('turn', axis, direction);
  }

  destroy() {
    this.destroyed = true;
    if (!this.mock && this.encoderX) {
      this.encoderX.clk.unexport();
      this.encoderX.dt.unexport();
      this.encoderY.clk.unexport();
      this.encoderY.dt.unexport();
    }
  }
}

module.exports = Encoders;
