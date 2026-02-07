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

    // Encoder X: CLK on GPIO 17, DT on GPIO 27
    // Encoder Y: CLK on GPIO 22, DT on GPIO 23
    // Adjust pin numbers to match your wiring
    this.encoderX = { clk: new Gpio(17, 'in', 'both'), dt: new Gpio(27, 'in') };
    this.encoderY = { clk: new Gpio(22, 'in', 'both'), dt: new Gpio(23, 'in') };

    this.encoderX.lastClk = this.encoderX.clk.readSync();
    this.encoderY.lastClk = this.encoderY.clk.readSync();

    this.encoderX.clk.watch((err, value) => {
      if (err || this.destroyed) return;
      const dt = this.encoderX.dt.readSync();
      const direction = value !== dt ? 1 : -1;
      this.emit('turn', 'x', direction);
    });

    this.encoderY.clk.watch((err, value) => {
      if (err || this.destroyed) return;
      const dt = this.encoderY.dt.readSync();
      const direction = value !== dt ? 1 : -1;
      this.emit('turn', 'y', direction);
    });

    console.log('[encoders] GPIO initialized (pins: X=17/27, Y=22/23)');
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
