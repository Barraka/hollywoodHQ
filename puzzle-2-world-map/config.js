module.exports = {
  // Server
  httpPort: 3000,
  wsPort: 3000, // same as HTTP (ws upgrades the connection)

  // Puzzle target (normalized 0–1, where 0=left/top edge, 1=right/bottom edge)
  targetX: 0.63,
  targetY: 0.41,

  // How close each axis must be to count as "correct" (0–1 range)
  tolerance: 0.05,

  // Seconds both axes must stay in the tolerance zone to solve
  holdDuration: 2,

  // Encoder steps from one edge to the other
  stepsX: 200,
  stepsY: 150,

  // Starting position (normalized 0–1)
  startX: 0.15,
  startY: 0.75,

  // Beep timing (milliseconds)
  minBeepInterval: 100,  // when right on target
  maxBeepInterval: 2000, // when at maximum distance

  // Beep sound
  beepFrequencyHz: 800,
  beepDurationMs: 60,

  // GPIO pins for rotary encoders (BCM numbering)
  // NOTE: These pins are shared with Puzzle 1 (Simon) and Puzzle 5 (Missile)
  // This is safe because puzzles run sequentially
  encoderPins: {
    x: { clk: 16, dt: 20 },  // X encoder (horizontal crosshair)
    y: { clk: 19, dt: 26 },  // Y encoder (vertical crosshair)
  },

  // Room Controller WebSocket (set to null to disable)
  roomControllerUrl: null, // e.g. 'ws://localhost:3001'
  propId: 'puzzle-2-world-map',
};
