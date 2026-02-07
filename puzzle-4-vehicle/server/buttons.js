const EventEmitter = require('events');
const config = require('../config');

class Buttons extends EventEmitter {
  constructor(isMock) {
    super();
    this.isMock = isMock;
    this._gpios = {};

    if (!isMock) {
      try {
        const { Gpio } = require('onoff');

        // Navigation buttons
        const leftBtn = new Gpio(config.navigationPins.left, 'in', 'falling', { debounceTimeout: 50 });
        const rightBtn = new Gpio(config.navigationPins.right, 'in', 'falling', { debounceTimeout: 50 });

        leftBtn.watch(() => this.emit('navigate', 'left'));
        rightBtn.watch(() => this.emit('navigate', 'right'));

        // Validate button
        const validateBtn = new Gpio(config.validatePin, 'in', 'falling', { debounceTimeout: 50 });
        validateBtn.watch(() => this.emit('validate'));

        this._gpios = { leftBtn, rightBtn, validateBtn };
        console.log('[buttons] GPIO initialized');
      } catch (e) {
        console.log('[buttons] GPIO unavailable, falling back to mock:', e.message);
        this.isMock = true;
      }
    }

    if (this.isMock) {
      console.log('[buttons] Mock mode — use arrow keys + Enter');
    }
  }

  // Called from WebSocket handler in mock mode
  simulateNavigate(direction) {
    if (direction === 'left' || direction === 'right') {
      this.emit('navigate', direction);
    }
  }

  simulateValidate() {
    this.emit('validate');
  }

  destroy() {
    for (const gpio of Object.values(this._gpios)) {
      if (gpio && gpio.unexport) gpio.unexport();
    }
  }
}

module.exports = Buttons;
