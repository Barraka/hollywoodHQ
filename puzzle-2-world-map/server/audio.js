const config = require('../config');

class Audio {
  constructor(mock = false) {
    this.mock = mock;

    // Current beep interval per axis (ms). null = no beeping.
    this.intervalX = null;
    this.intervalY = null;

    // Timer handles
    this._timerX = null;
    this._timerY = null;

    this.destroyed = false;

    if (!mock) {
      this._initAudio();
    } else {
      console.log('[audio] Mock mode — beep events logged to console');
    }
  }

  _initAudio() {
    // On Raspberry Pi: use 'speaker' package to output stereo PCM
    // Left channel = X axis beep, Right channel = Y axis beep
    // For now, fall back to aplay with generated WAV buffers
    try {
      // Generate a short beep WAV in memory
      this._beepBuffer = this._generateBeepWav(config.beepFrequencyHz, config.beepDurationMs);
      console.log('[audio] Audio initialized (beep: ' + config.beepFrequencyHz + 'Hz, ' + config.beepDurationMs + 'ms)');
    } catch (err) {
      console.warn('[audio] Audio init failed, falling back to mock:', err.message);
      this.mock = true;
    }
  }

  _generateBeepWav(freqHz, durationMs) {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * durationMs / 1000);
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = numSamples * blockAlign;

    const buffer = Buffer.alloc(44 + dataSize);
    let offset = 0;

    // WAV header
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4;
    buffer.writeUInt16LE(1, offset); offset += 2; // PCM
    buffer.writeUInt16LE(numChannels, offset); offset += 2;
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;
    buffer.writeUInt32LE(byteRate, offset); offset += 4;
    buffer.writeUInt16LE(blockAlign, offset); offset += 2;
    buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(dataSize, offset); offset += 4;

    // Sine wave samples with fade-in/out to avoid clicks
    const fadeFrames = Math.floor(numSamples * 0.1);
    for (let i = 0; i < numSamples; i++) {
      let amplitude = 0.5;
      if (i < fadeFrames) amplitude *= i / fadeFrames;
      else if (i > numSamples - fadeFrames) amplitude *= (numSamples - i) / fadeFrames;
      const sample = Math.floor(amplitude * 32767 * Math.sin(2 * Math.PI * freqHz * i / sampleRate));
      buffer.writeInt16LE(sample, offset); offset += 2;
    }

    return buffer;
  }

  // Set the beep interval for an axis. distance is 0-1 (0 = on target, 1 = max distance)
  setDistance(axis, distance) {
    const d = Math.max(0, Math.min(1, distance));
    // Exponential curve: fast change near target, slow far away
    const t = Math.pow(d, 0.5);
    const interval = config.minBeepInterval + t * (config.maxBeepInterval - config.minBeepInterval);

    if (axis === 'x') {
      this.intervalX = Math.round(interval);
      this._reschedule('x');
    } else {
      this.intervalY = Math.round(interval);
      this._reschedule('y');
    }
  }

  _reschedule(axis) {
    if (axis === 'x') {
      if (this._timerX) clearTimeout(this._timerX);
      this._timerX = null;
      if (this.intervalX != null) this._scheduleBeep('x');
    } else {
      if (this._timerY) clearTimeout(this._timerY);
      this._timerY = null;
      if (this.intervalY != null) this._scheduleBeep('y');
    }
  }

  _scheduleBeep(axis) {
    if (this.destroyed) return;
    const interval = axis === 'x' ? this.intervalX : this.intervalY;
    if (interval == null) return;

    const timer = setTimeout(() => {
      this._playBeep(axis);
      this._scheduleBeep(axis);
    }, interval);

    if (axis === 'x') this._timerX = timer;
    else this._timerY = timer;
  }

  _playBeep(axis) {
    if (this.destroyed) return;

    if (this.mock) {
      // In mock mode, beeps are sent to the browser via WebSocket (handled by index.js)
      if (this.onBeep) this.onBeep(axis);
      return;
    }

    // On Pi: play the beep on the appropriate stereo channel
    // Using aplay with pan control, or writing to a speaker stream
    // For now, use a simple approach: spawn aplay
    const { execFile } = require('child_process');
    // TODO: Implement stereo channel routing on Pi
    // For now, play on both channels
    const proc = execFile('aplay', ['-q', '-'], { timeout: 1000 });
    if (proc.stdin) {
      proc.stdin.write(this._beepBuffer);
      proc.stdin.end();
    }
    proc.on('error', () => {}); // ignore errors silently
  }

  stop() {
    this.intervalX = null;
    this.intervalY = null;
    if (this._timerX) clearTimeout(this._timerX);
    if (this._timerY) clearTimeout(this._timerY);
    this._timerX = null;
    this._timerY = null;
  }

  destroy() {
    this.destroyed = true;
    this.stop();
  }
}

module.exports = Audio;
