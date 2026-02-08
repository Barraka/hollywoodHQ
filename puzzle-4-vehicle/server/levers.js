const EventEmitter = require('events');

/**
 * Levers GPIO module for Puzzle 4.
 * Reads 4 rotary cam switches (10 positions each) via GPIO.
 * Uses sparse pin mapping: only wires positions that are actually used in vehicle codes.
 *
 * Each lever has multiple GPIO pins corresponding to different positions.
 * When a lever is at position N, that pin reads LOW (connected to ground via switch).
 * All other pins read HIGH (pulled up).
 */
class Levers extends EventEmitter {
  constructor(mock = false) {
    super();
    this.mock = mock;
    this.levers = [];
    this.pins = [];
    this.pollInterval = null;
    this.lastPositions = [null, null, null, null];

    if (!mock) {
      try {
        this.Gpio = require('onoff').Gpio;
        console.log('[levers] GPIO mode active');
      } catch (err) {
        console.warn('[levers] onoff not available, falling back to mock mode');
        this.mock = true;
      }
    } else {
      console.log('[levers] Mock mode active');
    }
  }

  /**
   * Initialize GPIO pins for all levers
   * @param {Array} leverConfig - Array of lever configs, each with { positions: { posNum: gpioPin, ... } }
   *
   * Example:
   * [
   *   { positions: { 2: 14, 4: 15, 8: 18 } },  // Lever 1: position 2→GPIO14, 4→GPIO15, 8→GPIO18
   *   { positions: { 3: 23, 7: 8, 9: 7 } },    // Lever 2
   *   { positions: { 2: 1, 4: 12, 8: 16 } },   // Lever 3
   *   { positions: { 1: 20, 5: 21, 6: 26 } },  // Lever 4
   * ]
   */
  init(leverConfig) {
    if (this.mock) {
      // Mock mode: store config but don't initialize GPIO
      this.levers = leverConfig.map(() => ({}));
      console.log('[levers] Mock mode: no GPIO initialization');
      return;
    }

    // Initialize GPIO pins for each lever
    for (let i = 0; i < leverConfig.length; i++) {
      const config = leverConfig[i];
      const leverPins = {};

      for (const [posStr, pin] of Object.entries(config.positions)) {
        const pos = parseInt(posStr);
        try {
          const gpio = new this.Gpio(pin, 'in', 'both', { activeLow: false });
          leverPins[pos] = { gpio, pin };
          this.pins.push(gpio);
          console.log(`[levers] Lever ${i + 1} position ${pos} → GPIO ${pin}`);
        } catch (err) {
          console.error(`[levers] Failed to init GPIO ${pin} for lever ${i + 1} pos ${pos}:`, err.message);
        }
      }

      this.levers.push(leverPins);
    }

    // Start polling
    this.startPolling();
  }

  /**
   * Start polling lever positions
   */
  startPolling() {
    if (this.mock) return;

    this.pollInterval = setInterval(() => {
      const positions = this.readAllPositions();

      // Check if any lever changed
      for (let i = 0; i < positions.length; i++) {
        if (positions[i] !== this.lastPositions[i]) {
          console.log(`[levers] Lever ${i + 1} changed: ${this.lastPositions[i]} → ${positions[i]}`);
          this.lastPositions[i] = positions[i];
          this.emit('leverChanged', i, positions[i]);
          this.emit('leversChanged', positions);
        }
      }
    }, 100); // Poll every 100ms
  }

  /**
   * Read positions of all levers
   * @returns {Array} Array of current positions [lever1Pos, lever2Pos, lever3Pos, lever4Pos]
   */
  readAllPositions() {
    if (this.mock) {
      return this.lastPositions.slice();
    }

    const positions = [];

    for (let i = 0; i < this.levers.length; i++) {
      positions.push(this.readLeverPosition(i));
    }

    return positions;
  }

  /**
   * Read position of a single lever
   * @param {number} leverIndex - Lever index (0-3)
   * @returns {number|null} Current position (1-10) or null if unknown
   */
  readLeverPosition(leverIndex) {
    if (this.mock) {
      return this.lastPositions[leverIndex];
    }

    const leverPins = this.levers[leverIndex];

    // Check which pin reads LOW (active position)
    for (const [pos, pinData] of Object.entries(leverPins)) {
      const value = pinData.gpio.readSync();
      if (value === 0) {
        // Pin is LOW, this position is active
        return parseInt(pos);
      }
    }

    // No pin is LOW - lever is at an unwired position or between positions
    return null;
  }

  /**
   * Mock mode: simulate lever position change (for keyboard input)
   * @param {number} leverIndex - Lever index (0-3)
   * @param {number} position - New position (1-10)
   */
  setMockPosition(leverIndex, position) {
    if (!this.mock) return;

    this.lastPositions[leverIndex] = position;
    console.log(`[levers] Mock: Lever ${leverIndex + 1} set to position ${position}`);
    this.emit('leverChanged', leverIndex, position);
    this.emit('leversChanged', this.lastPositions.slice());
  }

  /**
   * Get current positions
   * @returns {Array} Current positions [lever1, lever2, lever3, lever4]
   */
  getPositions() {
    return this.lastPositions.slice();
  }

  /**
   * Clean up GPIO resources
   */
  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (!this.mock) {
      for (const gpio of this.pins) {
        try {
          gpio.unexport();
        } catch (err) {
          console.error('[levers] Error unexporting GPIO:', err.message);
        }
      }
    }

    console.log('[levers] Destroyed');
  }
}

module.exports = Levers;
