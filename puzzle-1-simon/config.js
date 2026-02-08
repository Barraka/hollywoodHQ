module.exports = {
  // Server
  httpPort: 3004,

  // Button GPIO pins (BCM numbering)
  // Classic 4-button Simon game: Red, Blue, Green, Yellow
  // NOTE: Button pins are shared with Puzzle 2 (Encoders) and Puzzle 5 (Joystick)
  // This is safe because puzzles run sequentially
  // LED pins are unique to this puzzle
  buttons: [
    { id: 1, buttonPin: 16, ledPin: 22, color: 'red' },    // Button shared with Puzzle 2 & 5
    { id: 2, buttonPin: 19, ledPin: 23, color: 'blue' },   // Button shared with Puzzle 2 & 5
    { id: 3, buttonPin: 20, ledPin: 1,  color: 'green' },  // Button shared with Puzzle 2 & 5
    { id: 4, buttonPin: 26, ledPin: 0,  color: 'yellow' }, // Button shared with Puzzle 2 & 5
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
