const EventEmitter = require('events');
const config = require('../config');

class Joystick extends EventEmitter {
  constructor(isMock) {
    super();
    this.isMock = isMock;
    this._gpios = {};
    this._pollInterval = null;
    this._lastDirection = null;

    if (!isMock) {
      try {
        const { Gpio } = require('onoff');
        // Initialize GPIO pins for 8-way joystick (no edge detection, we'll poll)
        // NOTE: GPIO pins are shared with Puzzle 1 (Simon) and Puzzle 2 (Encoders)
        // This is safe because puzzles run sequentially
        for (const [dir, pin] of Object.entries(config.joystickPins)) {
          this._gpios[dir] = new Gpio(pin, 'in', 'both');
        }
        const pinList = Object.values(config.joystickPins).join(', ');
        console.log(`[joystick] GPIO initialized (8-way, pins: ${pinList})`);
        this._startPolling();
      } catch (e) {
        console.log('[joystick] GPIO unavailable, falling back to mock:', e.message);
        this.isMock = true;
      }
    }

    if (this.isMock) {
      console.log('[joystick] Mock mode — use arrow keys or numpad');
    }
  }

  _startPolling() {
    // Poll GPIO pins every 50ms to detect 8-way combinations
    this._pollInterval = setInterval(() => {
      const dir = this._detectDirection();
      if (dir && dir !== this._lastDirection) {
        this._lastDirection = dir;
        this.emit('direction', dir);
      } else if (!dir) {
        this._lastDirection = null;
      }
    }, 50);
  }

  _detectDirection() {
    const up = !this._gpios.up.readSync();
    const down = !this._gpios.down.readSync();
    const left = !this._gpios.left.readSync();
    const right = !this._gpios.right.readSync();

    // 8-way detection via switch combinations (diagonals first)
    if (up && right) return 'ne';
    if (down && right) return 'se';
    if (down && left) return 'sw';
    if (up && left) return 'nw';

    // Cardinal directions
    if (up) return 'n';
    if (down) return 's';
    if (left) return 'w';
    if (right) return 'e';

    return null;
  }

  simulateDirection(dir) {
    const validDirs = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    if (validDirs.includes(dir)) {
      this.emit('direction', dir);
    }
  }

  destroy() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
    for (const gpio of Object.values(this._gpios)) {
      if (gpio && gpio.unexport) gpio.unexport();
    }
  }
}

module.exports = Joystick;
