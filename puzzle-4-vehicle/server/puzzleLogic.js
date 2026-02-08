const EventEmitter = require('events');
const config = require('../config');

const INACTIVE = 'inactive';
const BROWSING = 'browsing';
const FEEDBACK = 'feedback'; // showing correct/wrong feedback briefly
const SOLVED = 'solved';

class PuzzleLogic extends EventEmitter {
  constructor() {
    super();
    this.state = INACTIVE;
    this.currentVehicle = 0;
    this.levers = new Array(config.leverCount).fill(1); // all levers at position 1
  }

  activate() {
    if (this.state !== INACTIVE) return;
    console.log('[puzzle4] Activating');
    this.state = BROWSING;
    this.currentVehicle = 0;
    this.levers = new Array(config.leverCount).fill(1);
    this.emit('vehicleChanged', this.currentVehicle);
    this.emit('stateChange', this.getState());
  }

  navigate(direction) {
    if (this.state !== BROWSING) return;

    const total = config.vehicles.length;
    if (direction === 'left') {
      this.currentVehicle = (this.currentVehicle - 1 + total) % total;
    } else if (direction === 'right') {
      this.currentVehicle = (this.currentVehicle + 1) % total;
    }

    console.log(`[puzzle4] Vehicle: ${config.vehicles[this.currentVehicle].name} (${this.currentVehicle + 1}/${total})`);
    this.emit('vehicleChanged', this.currentVehicle);
    this.emit('stateChange', this.getState());
  }

  setLever(leverIndex, position) {
    if (this.state !== BROWSING) return;
    if (leverIndex < 0 || leverIndex >= config.leverCount) return;
    if (position < 1 || position > config.leverPositions) return;

    this.levers[leverIndex] = position;
    console.log(`[puzzle4] Lever ${leverIndex + 1} → ${position}  [${this.levers.join('-')}]`);
    this.emit('leversChanged', [...this.levers]);
    this.emit('stateChange', this.getState());
  }

  setLevers(positions) {
    // Update all levers from GPIO reading
    // positions is an array like [2, 7, 4, 5] or may contain nulls for unwired positions
    if (this.state !== BROWSING) return;

    let changed = false;
    for (let i = 0; i < positions.length && i < config.leverCount; i++) {
      const pos = positions[i];
      if (pos !== null && pos >= 1 && pos <= config.leverPositions) {
        if (this.levers[i] !== pos) {
          this.levers[i] = pos;
          changed = true;
        }
      }
    }

    if (changed) {
      console.log(`[puzzle4] Levers updated: [${this.levers.join('-')}]`);
      this.emit('leversChanged', [...this.levers]);
      this.emit('stateChange', this.getState());
    }
  }

  adjustLever(leverIndex, delta) {
    if (this.state !== BROWSING) return;
    if (leverIndex < 0 || leverIndex >= config.leverCount) return;

    const newPos = Math.max(1, Math.min(config.leverPositions, this.levers[leverIndex] + delta));
    if (newPos !== this.levers[leverIndex]) {
      this.setLever(leverIndex, newPos);
    }
  }

  validate() {
    if (this.state !== BROWSING) return;

    const vehicle = config.vehicles[this.currentVehicle];
    const leverCode = this.levers.join('-');
    const vehicleCode = vehicle.code.join('-');

    console.log(`[puzzle4] Validate: levers=${leverCode}, vehicle="${vehicle.name}" code=${vehicleCode}`);

    if (this.currentVehicle === config.correctVehicleIndex &&
        leverCode === vehicleCode) {
      // Correct vehicle with correct code!
      this.state = SOLVED;
      this.emit('validateResult', true, vehicle.name);
      this.emit('stateChange', this.getState());
      console.log('[puzzle4] SOLVED!');
    } else {
      // Wrong
      this.state = FEEDBACK;
      this.emit('validateResult', false, vehicle.name);

      // Return to browsing after a brief delay
      setTimeout(() => {
        if (this.state === FEEDBACK) {
          this.state = BROWSING;
          this.emit('stateChange', this.getState());
        }
      }, 2000);
    }
  }

  forceSolve() {
    if (this.state === SOLVED) return;
    console.log('[puzzle4] Force-solved by GM');
    this.currentVehicle = config.correctVehicleIndex;
    this.levers = [...config.vehicles[config.correctVehicleIndex].code];
    this.state = SOLVED;
    this.emit('vehicleChanged', this.currentVehicle);
    this.emit('leversChanged', [...this.levers]);
    this.emit('validateResult', true, config.vehicles[this.currentVehicle].name);
    this.emit('stateChange', this.getState());
  }

  reset() {
    console.log('[puzzle4] Resetting');
    this.state = INACTIVE;
    this.currentVehicle = 0;
    this.levers = new Array(config.leverCount).fill(1);
    this.emit('stateChange', this.getState());
  }

  getState() {
    const vehicle = config.vehicles[this.currentVehicle];
    return {
      state: this.state,
      currentVehicle: this.currentVehicle,
      totalVehicles: config.vehicles.length,
      vehicleName: vehicle ? vehicle.name : '',
      vehicleVideo: vehicle ? vehicle.video : '',
      levers: [...this.levers],
      leverCount: config.leverCount,
      leverPositions: config.leverPositions,
    };
  }
}

module.exports = PuzzleLogic;
