const EventEmitter = require('events');
const config = require('../config');

class Joystick extends EventEmitter {
  constructor(isMock) {
    super();
    this.isMock = isMock;
    this._gpios = {};

    if (!isMock) {
      try {
        const { Gpio } = require('onoff');
        for (const [dir, pin] of Object.entries(config.joystickPins)) {
          const btn = new Gpio(pin, 'in', 'falling', { debounceTimeout: 80 });
          btn.watch(() => this.emit('direction', dir));
          this._gpios[dir] = btn;
        }
        console.log('[joystick] GPIO initialized');
      } catch (e) {
        console.log('[joystick] GPIO unavailable, falling back to mock:', e.message);
        this.isMock = true;
      }
    }

    if (this.isMock) {
      console.log('[joystick] Mock mode — use arrow keys');
    }
  }

  simulateDirection(dir) {
    if (['up', 'down', 'left', 'right'].includes(dir)) {
      this.emit('direction', dir);
    }
  }

  destroy() {
    for (const gpio of Object.values(this._gpios)) {
      if (gpio && gpio.unexport) gpio.unexport();
    }
  }
}

module.exports = Joystick;
