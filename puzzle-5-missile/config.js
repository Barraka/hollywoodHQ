module.exports = {
  // Server
  httpPort: 3003,

  // Missile path: sequence of city waypoints with SVG coordinates
  // The villain's origin is the FIRST city. The missile target is the LAST city.
  // Players must reverse the missile from LAST back to FIRST.
  path: [
    { name: 'Moscow',     x: 496.1, y: 357.8 },  // origin (villain)
    { name: 'Istanbul',   x: 454.6, y: 392.5 },  // left (& slightly down — treated as left)
    { name: 'Cairo',      x: 454.6, y: 450.0 },  // down
    { name: 'Nairobi',    x: 500.0, y: 520.8 },  // right (& down — treated as down... hmm)
    { name: 'Mumbai',     x: 585.3, y: 449.9 },  // right
    { name: 'Bangkok',    x: 585.3, y: 500.0 },  // down
    { name: 'Tokyo',      x: 724.7, y: 404.6 },  // right
    { name: 'Sydney',     x: 760.4, y: 629.3 },  // down (final target)
  ],

  // Direction for each leg (forward direction: path[i] → path[i+1])
  // Must be exactly: 'left', 'right', 'up', or 'down'
  // Length = path.length - 1
  directions: [
    'left',   // Moscow → Istanbul
    'down',   // Istanbul → Cairo
    'down',   // Cairo → Nairobi
    'right',  // Nairobi → Mumbai
    'down',   // Mumbai → Bangkok
    'right',  // Bangkok → Tokyo
    'down',   // Tokyo → Sydney
  ],

  // Animation timing (seconds)
  forwardAnimDuration: 8,   // total time for forward missile animation
  legAnimDuration: 0.8,     // time to animate one leg during reverse

  // GPIO pins for 4-direction joystick (BCM numbering)
  joystickPins: {
    up: 16,
    down: 20,
    left: 19,
    right: 26,
  },

  // Room Controller
  roomControllerUrl: null,
  propId: 'puzzle-5-missile',
};
