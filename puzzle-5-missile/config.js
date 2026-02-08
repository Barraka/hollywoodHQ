module.exports = {
  // Server
  httpPort: 3003,

  // Missile path: sequence of city waypoints with SVG coordinates
  // The villain's origin is the FIRST city. The missile target is the LAST city.
  // Players must reverse the missile from LAST back to FIRST.
  // This route covers all major continents: North America → South America → Africa → Europe → Asia → Oceania
  path: [
    { name: 'Los Angeles',    x: 130.6, y: 405.6 },  // origin (villain) - USA West Coast
    { name: 'New York',       x: 218.3, y: 389.2 },  // USA East Coast
    { name: 'Mexico',         x: 170.6, y: 446.0 },  // Central America
    { name: 'Lima',           x: 232.3, y: 530.0 },  // South America West Coast
    { name: 'Rio de Janeiro', x: 303.7, y: 562.8 },  // South America East Coast
    { name: 'Le Cap',         x: 479.7, y: 630.0 },  // South Africa
    { name: 'Dakar',          x: 367.3, y: 470.0 },  // West Africa
    { name: 'Casablanca',     x: 389.0, y: 431.6 },  // Northwest Africa
    { name: 'Madrid',         x: 402.6, y: 425.3 },  // Spain
    { name: 'Paris',          x: 405.4, y: 402.7 },  // France
    { name: 'Berlin',         x: 427.6, y: 394.0 },  // Germany
    { name: 'Moscou',         x: 496.1, y: 357.8 },  // Russia
    { name: 'Pékin',          x: 675.0, y: 410.4 },  // China
    { name: 'Singapour',      x: 675.0, y: 500.0 },  // Southeast Asia
    { name: 'Jakarta',        x: 706.4, y: 530.0 },  // Indonesia
    { name: 'Nouméa',         x: 785.0, y: 590.0 },  // New Caledonia
    { name: 'Sydney',         x: 760.4, y: 629.3 },  // Australia (final target)
  ],

  // Direction for each leg (forward direction: path[i] → path[i+1])
  // 8-way directions: 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'
  // Calculated using actual geometric angles between cities
  // Length = path.length - 1
  directions: [
    'e',   // Los Angeles → New York (-10.6°)
    'sw',  // New York → Mexico (130.0°)
    'se',  // Mexico → Lima (53.7°)
    'se',  // Lima → Rio de Janeiro (24.7°)
    'e',   // Rio de Janeiro → Le Cap (20.9°)
    'nw',  // Le Cap → Dakar (-125.1°)
    'ne',  // Dakar → Casablanca (-60.5°)
    'ne',  // Casablanca → Madrid (-24.9°)
    'n',   // Madrid → Paris (-82.9°)
    'e',   // Paris → Berlin (-21.4°)
    'ne',  // Berlin → Moscou (-27.9°)
    'e',   // Moscou → Pékin (16.4°)
    's',   // Pékin → Singapour (90.0°)
    'se',  // Singapour → Jakarta (43.7°)
    'se',  // Jakarta → Nouméa (37.4°)
    'sw',  // Nouméa → Sydney (122.0°)
  ],

  // Animation timing (seconds)
  forwardAnimDuration: 8,   // total time for forward missile animation
  legAnimDuration: 0.8,     // time to animate one leg during reverse

  // Timer settings
  inputTimeLimit: 4,        // seconds per input before timeout (puzzle resets)

  // GPIO pins for 8-way joystick (BCM numbering)
  // NOTE: These pins are shared with Puzzle 1 (Simon buttons) and Puzzle 2 (Encoders)
  // This is safe because puzzles run sequentially
  // Diagonal directions detected by reading switch combinations
  joystickPins: {
    up: 16,    // shared with Puzzle 1 & 2
    down: 20,  // shared with Puzzle 1 & 2
    left: 19,  // shared with Puzzle 1 & 2
    right: 26, // shared with Puzzle 1 & 2
  },

  // Room Controller
  roomControllerUrl: null,
  propId: 'puzzle-5-missile',
};
