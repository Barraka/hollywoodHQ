module.exports = {
  httpPort: 3012,

  // Tim Ferris video clips — filenames in public/videos/
  videos: {
    idle: 'tim-ferris-idle.mp4',          // Tim Ferris ambient loop
    intro: 'tim-ferris-intro.mp4',        // Tim Ferris first appears
    escape1: 'tim-ferris-escape-1.mp4',   // Escape attempt after puzzle 2
    escape2: 'tim-ferris-escape-2.mp4',   // Escape attempt after puzzle 4
    rescued: 'tim-ferris-rescued.mp4',    // Final rescue after puzzle 5
  },

  // Puzzle 3 connection
  puzzle3Url: 'ws://localhost:3001',

  // Room Controller
  roomControllerUrl: null,
  propId: 'screen-right',
};
