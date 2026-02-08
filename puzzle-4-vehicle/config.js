module.exports = {
  // Server
  httpPort: 3002,

  // Vehicles: each has a name, looping video, and a lever code
  // Code digits are 1–10 matching lever positions
  // Codes are strategically chosen to minimize GPIO usage (sparse pin mapping)
  vehicles: [
    { name: 'Stealth Helicopter', video: 'vehicle-1.mp4', code: [2, 7, 4, 5] },
    { name: 'Armored SUV',       video: 'vehicle-2.mp4', code: [4, 7, 8, 1] },
    { name: 'Speedboat',         video: 'vehicle-3.mp4', code: [2, 9, 4, 6] },
    { name: 'Jet Fighter',       video: 'vehicle-4.mp4', code: [8, 3, 2, 1] },
    { name: 'Submarine',         video: 'vehicle-5.mp4', code: [4, 3, 8, 5] },
  ],

  // Which vehicle is correct (0-based index)
  correctVehicleIndex: 2, // Speedboat

  // Levers
  leverCount: 4,
  leverPositions: 10, // each lever goes 1–10

  // GPIO pins (Raspberry Pi, BCM numbering)
  navigationPins: { left: 5, right: 6 },
  validatePin: 13,

  // Lever GPIO pins (sparse mapping: only wire positions actually used)
  // Each lever specifies which positions are wired to which GPIO pins
  // Format: { position: gpioPin }
  leverPins: [
    // Lever 1: positions 2, 4, 8
    { 2: 2, 4: 3, 8: 4 },
    // Lever 2: positions 3, 7, 9
    { 3: 7, 7: 8, 9: 9 },
    // Lever 3: positions 2, 4, 8
    { 2: 10, 4: 11, 8: 14 },
    // Lever 4: positions 1, 5, 6
    { 1: 15, 5: 18, 6: 21 },
  ]

  // Room Controller
  roomControllerUrl: null,
  propId: 'puzzle-4-vehicle',
};
