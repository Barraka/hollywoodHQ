module.exports = {
  // Server
  httpPort: 3002,

  // Vehicles: each has a name, looping video, and a lever code
  // Code digits are 1–5 matching lever positions
  vehicles: [
    { name: 'Stealth Helicopter', video: 'vehicle-1.mp4', code: [3, 1, 4, 2] },
    { name: 'Armored SUV',       video: 'vehicle-2.mp4', code: [5, 2, 1, 3] },
    { name: 'Speedboat',         video: 'vehicle-3.mp4', code: [2, 4, 5, 1] },
    { name: 'Jet Fighter',       video: 'vehicle-4.mp4', code: [1, 3, 2, 5] },
    { name: 'Submarine',         video: 'vehicle-5.mp4', code: [4, 5, 3, 2] },
  ],

  // Which vehicle is correct (0-based index)
  correctVehicleIndex: 2, // Speedboat

  // Levers
  leverCount: 4,
  leverPositions: 5, // each lever goes 1–5

  // GPIO pins (Raspberry Pi, BCM numbering)
  navigationPins: { left: 5, right: 6 },
  validatePin: 13,
  // Lever reading is TBD (ADC or multi-position switches)

  // Room Controller
  roomControllerUrl: null,
  propId: 'puzzle-4-vehicle',
};
