module.exports = {
  // Server
  httpPort: 3001,

  // Situations: each has a video clip and a correct 4-digit code
  situations: [
    { video: 'situation-1.mp4', correctCode: '4729' },
    { video: 'situation-2.mp4', correctCode: '8153' },
    { video: 'situation-3.mp4', correctCode: '3946' },
  ],

  // Video clips
  videos: {
    intro: 'intro.mp4',
    correct: 'correct.mp4',
    wrong: 'wrong.mp4',
    solved: 'solved.mp4',
    idle: 'idle.mp4',
  },

  // Input
  codeLength: 4,

  // GPIO pins for the 3 LEDs (BCM numbering)
  ledPins: [24, 25, 12],

  // GPIO pins for Wiegand keypad (BCM numbering)
  keypadPins: {
    d0: 17, // Wiegand DATA0 (green wire)
    d1: 27, // Wiegand DATA1 (white wire)
  },

  // Room Controller WebSocket (set to null to disable)
  roomControllerUrl: null,
  propId: 'puzzle-3-gadget-code',
};
