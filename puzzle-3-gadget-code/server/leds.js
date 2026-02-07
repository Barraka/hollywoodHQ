const config = require('../config');

class LEDs {
  constructor(isMock) {
    this.isMock = isMock;
    this.states = new Array(config.ledPins.length).fill(false);
    this._gpios = [];

    if (!isMock) {
      try {
        const { Gpio } = require('onoff');
        for (const pin of config.ledPins) {
          const led = new Gpio(pin, 'out');
          led.writeSync(0);
          this._gpios.push(led);
        }
        console.log('[leds] GPIO LEDs initialized on pins', config.ledPins);
      } catch (e) {
        console.log('[leds] GPIO unavailable, falling back to mock:', e.message);
        this.isMock = true;
      }
    }

    if (this.isMock) {
      console.log('[leds] Mock mode — LED state logged to console');
    }
  }

  set(index, on) {
    if (index < 0 || index >= this.states.length) return;
    this.states[index] = on;

    if (!this.isMock && this._gpios[index]) {
      this._gpios[index].writeSync(on ? 1 : 0);
    }

    const display = this.states.map((s, i) => s ? `LED${i + 1}:ON` : `LED${i + 1}:off`).join('  ');
    console.log(`[leds] ${display}`);
  }

  allOff() {
    for (let i = 0; i < this.states.length; i++) {
      this.set(i, false);
    }
  }

  allOn() {
    for (let i = 0; i < this.states.length; i++) {
      this.set(i, true);
    }
  }

  getStates() {
    return [...this.states];
  }

  destroy() {
    if (!this.isMock) {
      for (const gpio of this._gpios) {
        gpio.writeSync(0);
        gpio.unexport();
      }
    }
  }
}

module.exports = LEDs;
