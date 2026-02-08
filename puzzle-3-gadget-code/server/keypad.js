const EventEmitter = require('events');
const config = require('../config');

/**
 * Wiegand Keypad Reader
 * Reads 4-bit or 8-bit Wiegand protocol keypresses from GPIO pins
 * Commonly used on access control keypads
 */
class Keypad extends EventEmitter {
  constructor(isMock) {
    super();
    this.isMock = isMock;
    this._gpios = {};
    this._bitBuffer = [];
    this._timeout = null;

    if (!isMock) {
      try {
        const { Gpio } = require('onoff');

        // Initialize Wiegand data lines (D0 and D1)
        this._gpios.d0 = new Gpio(config.keypadPins.d0, 'in', 'falling');
        this._gpios.d1 = new Gpio(config.keypadPins.d1, 'in', 'falling');

        // Watch for falling edges on both data lines
        this._gpios.d0.watch(() => this._onPulse(0));
        this._gpios.d1.watch(() => this._onPulse(1));

        console.log('[keypad] Wiegand GPIO initialized');
      } catch (e) {
        console.log('[keypad] GPIO unavailable, falling back to mock:', e.message);
        this.isMock = true;
      }
    }

    if (this.isMock) {
      console.log('[keypad] Mock mode — use browser keyboard');
    }
  }

  _onPulse(bit) {
    // Add bit to buffer
    this._bitBuffer.push(bit);

    // Clear previous timeout
    if (this._timeout) {
      clearTimeout(this._timeout);
    }

    // Wait for end of transmission (50ms silence)
    this._timeout = setTimeout(() => {
      this._decodeBuffer();
    }, 50);
  }

  _decodeBuffer() {
    const bitCount = this._bitBuffer.length;

    // Wiegand 4-bit (keypad mode): 4 data bits
    // Wiegand 8-bit (keypad mode): 8 data bits
    // Wiegand 26-bit (card mode): we ignore this for keypads

    if (bitCount === 4) {
      // 4-bit keypad mode (0-9, *, #)
      const value = this._bitsToNumber(this._bitBuffer);
      this._emitKey(value);
    } else if (bitCount === 8) {
      // 8-bit keypad mode (0-9, *, #)
      const value = this._bitsToNumber(this._bitBuffer);
      this._emitKey(value);
    } else if (bitCount >= 26) {
      // Card swipe detected, ignore (or could emit 'card' event)
      console.log('[keypad] Card detected, ignoring');
    } else {
      console.log(`[keypad] Unknown bit count: ${bitCount}`);
    }

    // Clear buffer
    this._bitBuffer = [];
  }

  _bitsToNumber(bits) {
    let value = 0;
    for (let i = 0; i < bits.length; i++) {
      value = (value << 1) | bits[i];
    }
    return value;
  }

  _emitKey(value) {
    // Map Wiegand value to key character
    // Standard Wiegand keypad mapping:
    // 0-9 = digits
    // 10 (*) = ESC/Clear
    // 11 (#) = Enter/Submit

    let key;
    if (value >= 0 && value <= 9) {
      key = value.toString();
    } else if (value === 10) {
      key = '*'; // Often mapped to ESC/Clear
    } else if (value === 11) {
      key = '#'; // Often mapped to Enter/Submit
    } else {
      console.log(`[keypad] Unknown value: ${value}`);
      return;
    }

    console.log(`[keypad] Key pressed: ${key}`);
    this.emit('keypress', key);
  }

  destroy() {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    for (const gpio of Object.values(this._gpios)) {
      if (gpio && gpio.unexport) gpio.unexport();
    }
  }
}

module.exports = Keypad;
