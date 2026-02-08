const EventEmitter = require('events');
const config = require('../config');

// Conditionally load GPIO library
let Gpio;
try {
  Gpio = require('onoff').Gpio;
} catch {
  Gpio = null;
}

class ButtonManager extends EventEmitter {
  constructor(isMock = false) {
    super();
    this.isMock = isMock;
    this.buttons = new Map();
    this.leds = new Map();

    if (!isMock && Gpio) {
      this._initGPIO();
    }
  }

  _initGPIO() {
    // NOTE: Button input GPIO pins are shared with Puzzle 2 (Encoders) and Puzzle 5 (Joystick)
    // This is safe because puzzles run sequentially, not simultaneously
    config.buttons.forEach(btn => {
      // Button input (pull-up resistor, detect falling edge)
      const buttonGpio = new Gpio(btn.buttonPin, 'in', 'falling', { debounceTimeout: 50 });
      buttonGpio.watch(() => this._onButtonPress(btn.id));
      this.buttons.set(btn.id, buttonGpio);

      // LED output (unique to this puzzle)
      const ledGpio = new Gpio(btn.ledPin, 'out');
      ledGpio.writeSync(0); // Off initially
      this.leds.set(btn.id, ledGpio);
    });

    console.log('[buttons] GPIO initialized for', config.buttons.length, 'buttons');
  }

  _onButtonPress(buttonId) {
    console.log(`[buttons] Button ${buttonId} pressed`);
    this.emit('press', buttonId);
  }

  // Mock input simulation (for dev)
  simulatePress(buttonId) {
    if (this.isMock) {
      this._onButtonPress(buttonId);
    }
  }

  // Set LED state (on/off)
  setLED(buttonId, state) {
    if (this.isMock) {
      console.log(`[buttons] Mock LED ${buttonId} = ${state ? 'ON' : 'OFF'}`);
      this.emit('ledChange', buttonId, state);
      return;
    }

    const led = this.leds.get(buttonId);
    if (led) {
      led.writeSync(state ? 1 : 0);
    }
  }

  // Turn off all LEDs
  allOff() {
    for (let i = 1; i <= config.buttons.length; i++) {
      this.setLED(i, false);
    }
  }

  // Flash all LEDs (wrong press feedback)
  flashAll(duration) {
    for (let i = 1; i <= config.buttons.length; i++) {
      this.setLED(i, true);
    }
    setTimeout(() => {
      for (let i = 1; i <= config.buttons.length; i++) {
        this.setLED(i, false);
      }
    }, duration);
  }

  destroy() {
    if (!this.isMock && Gpio) {
      this.buttons.forEach(btn => btn.unexport());
      this.leds.forEach(led => led.unexport());
    }
  }
}

module.exports = ButtonManager;
