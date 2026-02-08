module.exports = {
  // Server
  httpPort: 3004,

  // Button GPIO pins (BCM numbering)
  // 10-button Simon: All same color, players press when lit
  // Runs on Props Pi (Raspberry Pi #1)
  // Button pins 1-4 shared with Puzzle 2 (Encoders) and Puzzle 5 (Joystick)
  // This is safe because puzzles run sequentially
  buttons: [
    { id: 1,  buttonPin: 16, ledPin: 0,  color: 'white' }, // Button shared with Puzzle 2 & 5
    { id: 2,  buttonPin: 19, ledPin: 1,  color: 'white' }, // Button shared with Puzzle 2 & 5
    { id: 3,  buttonPin: 20, ledPin: 22, color: 'white' }, // Button shared with Puzzle 2 & 5
    { id: 4,  buttonPin: 26, ledPin: 23, color: 'white' }, // Button shared with Puzzle 2 & 5
    { id: 5,  buttonPin: 5,  ledPin: 2,  color: 'white' }, // Unique button pins
    { id: 6,  buttonPin: 6,  ledPin: 3,  color: 'white' },
    { id: 7,  buttonPin: 13, ledPin: 4,  color: 'white' },
    { id: 8,  buttonPin: 27, ledPin: 7,  color: 'white' },
    { id: 9,  buttonPin: 17, ledPin: 8,  color: 'white' },
    { id: 10, buttonPin: 14, ledPin: 9,  color: 'white' },
  ],

  // Timing (milliseconds)
  blinkIntervalMin: 1000,  // Minimum blink interval
  blinkIntervalMax: 3000,  // Maximum blink interval
  blinkDuration: 600,      // How long LED stays on during blink
  wrongFlashDuration: 300, // Duration of red flash on wrong press

  // Room Controller
  roomControllerUrl: null,
  propId: 'puzzle-1-simon',
};
