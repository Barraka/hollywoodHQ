const EventEmitter = require('events');
const config = require('../config');

// States
const INACTIVE = 'inactive';
const INTRO = 'intro';
const PLAYING_CLIP = 'playing_clip'; // correct/wrong clip is playing, input blocked
const SITUATION = 'situation';       // waiting for code input
const SOLVED = 'solved';

class PuzzleLogic extends EventEmitter {
  constructor(leds) {
    super();
    this.leds = leds;
    this.state = INACTIVE;
    this.currentSituation = 0; // 0-indexed (0, 1, 2)
    this.codeBuffer = '';
  }

  activate() {
    if (this.state !== INACTIVE) return;
    console.log('[puzzle3] Activating — playing intro');
    this.state = INTRO;
    this.currentSituation = 0;
    this.codeBuffer = '';
    this.leds.allOff();
    this.emit('playClip', config.videos.intro, 'intro');
    this.emit('stateChange', this.getState());
  }

  // Called by frontend when a video clip finishes playing
  clipEnded(clipId) {
    console.log(`[puzzle3] Clip ended: ${clipId}`);

    if (this.state === INTRO && clipId === 'intro') {
      // Intro finished → play first situation clip
      this._playSituation();
    } else if (this.state === PLAYING_CLIP && clipId === 'correct') {
      // Correct feedback ended → advance
      if (this.currentSituation >= config.situations.length) {
        // All situations solved → play solved clip
        this.state = PLAYING_CLIP;
        this.emit('playClip', config.videos.solved, 'solved');
      } else {
        // Play next situation
        this._playSituation();
      }
    } else if (this.state === PLAYING_CLIP && clipId === 'wrong') {
      // Wrong feedback ended → return to current situation (idle)
      this.state = SITUATION;
      this.emit('showIdle', this.currentSituation);
      this.emit('stateChange', this.getState());
    } else if (this.state === PLAYING_CLIP && clipId === 'solved') {
      // Solved clip ended
      this.state = SOLVED;
      this.emit('stateChange', this.getState());
      console.log('[puzzle3] SOLVED!');
    }
  }

  _playSituation() {
    const sit = config.situations[this.currentSituation];
    console.log(`[puzzle3] Playing situation ${this.currentSituation + 1}: ${sit.video}`);
    this.state = PLAYING_CLIP;
    this.emit('playClip', sit.video, `situation-${this.currentSituation + 1}`);
  }

  // Called when situation video finishes
  situationClipEnded() {
    this.state = SITUATION;
    this.codeBuffer = '';
    console.log(`[puzzle3] Waiting for code input (situation ${this.currentSituation + 1})`);
    this.emit('showIdle', this.currentSituation);
    this.emit('stateChange', this.getState());
  }

  // Process a digit from the numpad
  digitPressed(digit) {
    if (this.state !== SITUATION) return;
    if (this.codeBuffer.length >= config.codeLength) return;

    this.codeBuffer += digit;
    console.log(`[puzzle3] Digit: ${digit} → buffer: ${this.codeBuffer}`);
    this.emit('codeProgress', this.codeBuffer.length, config.codeLength);
  }

  // Process Enter key (submit code)
  submitCode() {
    if (this.state !== SITUATION) return;
    if (this.codeBuffer.length === 0) return;

    const entered = this.codeBuffer;
    const expected = config.situations[this.currentSituation].correctCode;
    this.codeBuffer = '';

    console.log(`[puzzle3] Code submitted: ${entered} (expected: ${expected})`);

    if (entered === expected) {
      // Correct!
      this.leds.set(this.currentSituation, true);
      this.currentSituation++;
      this.state = PLAYING_CLIP;
      this.emit('codeResult', true, entered);
      this.emit('playClip', config.videos.correct, 'correct');
      this.emit('stateChange', this.getState());
    } else {
      // Wrong
      this.state = PLAYING_CLIP;
      this.emit('codeResult', false, entered);
      this.emit('playClip', config.videos.wrong, 'wrong');
    }
  }

  // Clear the current code buffer (Backspace/Escape)
  clearCode() {
    if (this.state !== SITUATION) return;
    this.codeBuffer = '';
    this.emit('codeProgress', 0, config.codeLength);
  }

  // Delete last digit (Backspace)
  deleteDigit() {
    if (this.state !== SITUATION) return;
    if (this.codeBuffer.length === 0) return;
    this.codeBuffer = this.codeBuffer.slice(0, -1);
    this.emit('codeProgress', this.codeBuffer.length, config.codeLength);
  }

  forceSolve() {
    if (this.state === SOLVED) return;
    console.log('[puzzle3] Force-solved by GM');
    this.leds.allOn();
    this.currentSituation = config.situations.length;
    this.state = PLAYING_CLIP;
    this.emit('playClip', config.videos.solved, 'solved');
    this.emit('stateChange', this.getState());
  }

  reset() {
    console.log('[puzzle3] Resetting');
    this.state = INACTIVE;
    this.currentSituation = 0;
    this.codeBuffer = '';
    this.leds.allOff();
    this.emit('stateChange', this.getState());
  }

  getState() {
    return {
      state: this.state,
      currentSituation: this.currentSituation,
      totalSituations: config.situations.length,
      codeLength: config.codeLength,
      codeProgress: this.codeBuffer.length,
      leds: this.leds.getStates(),
    };
  }
}

module.exports = PuzzleLogic;
