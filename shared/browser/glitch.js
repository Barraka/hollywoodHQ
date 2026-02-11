/**
 * Hack Mode Glitch Overlay — Self-contained browser module
 *
 * Injects its own CSS + DOM elements. Any page can include this via:
 *   <script src="/shared/glitch.js"></script>
 *
 * API:
 *   HackGlitch.activate()   — Start glitch effect
 *   HackGlitch.deactivate() — Stop glitch effect
 *   HackGlitch.isActive()   — Check if active
 */
(function () {
  // ── Inject CSS ──
  const style = document.createElement('style');
  style.textContent = `
    /* Body jitter when hacked */
    .hack-mode-active > *:not(#hack-overlay) {
      animation: hack-jitter 0.12s steps(4) infinite !important;
    }

    @keyframes hack-jitter {
      0%   { transform: translate(0, 0); }
      25%  { transform: translate(-3px, 1px); }
      50%  { transform: translate(2px, -1px); }
      75%  { transform: translate(-1px, 2px); }
      100% { transform: translate(1px, -1px); }
    }

    /* Overlay container */
    #hack-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
      display: none;
    }

    #hack-overlay.active {
      display: block;
    }

    /* Heavy scanlines */
    .hack-scanlines {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.25) 2px,
        rgba(0, 0, 0, 0.25) 4px
      );
      animation: hack-scan-scroll 0.8s linear infinite;
    }

    @keyframes hack-scan-scroll {
      0%   { transform: translateY(0); }
      100% { transform: translateY(4px); }
    }

    /* Horizontal glitch bars */
    .hack-bar {
      position: absolute;
      left: 0;
      width: 100%;
      animation: hack-bar-move var(--duration) steps(3) infinite;
      animation-delay: var(--delay);
    }

    @keyframes hack-bar-move {
      0%   { transform: translateX(0); opacity: 0.7; }
      33%  { transform: translateX(-12px); opacity: 1; }
      66%  { transform: translateX(10px); opacity: 0.5; }
      100% { transform: translateX(0); opacity: 0.7; }
    }

    /* Flicker layer */
    .hack-flicker {
      position: absolute;
      inset: 0;
      animation: hack-flicker 0.08s steps(2) infinite;
    }

    @keyframes hack-flicker {
      0%   { background: rgba(255, 255, 255, 0.03); }
      50%  { background: transparent; }
      100% { background: rgba(0, 220, 255, 0.02); }
    }

    /* Periodic intense flash */
    .hack-flash {
      position: absolute;
      inset: 0;
      animation: hack-big-flash 3s steps(2) infinite;
    }

    @keyframes hack-big-flash {
      0%, 85%  { opacity: 0; }
      86%      { opacity: 1; background: rgba(255, 0, 60, 0.12);
                 clip-path: inset(15% 0 55% 0); transform: translateX(-20px); }
      88%      { opacity: 1; background: rgba(0, 255, 200, 0.08);
                 clip-path: inset(60% 0 10% 0); transform: translateX(15px); }
      90%      { opacity: 1; background: rgba(255, 0, 60, 0.06);
                 clip-path: inset(30% 0 40% 0); transform: translateX(-8px); }
      92%      { opacity: 0; }
      100%     { opacity: 0; }
    }

    /* Color aberration edges */
    .hack-aberration {
      position: absolute;
      inset: 0;
      box-shadow:
        inset 4px 0 rgba(255, 0, 0, 0.06),
        inset -4px 0 rgba(0, 255, 255, 0.06);
      animation: hack-aberration 2s steps(6) infinite;
    }

    @keyframes hack-aberration {
      0%, 80%  { box-shadow: inset 3px 0 rgba(255,0,0,0.05), inset -3px 0 rgba(0,255,255,0.05); }
      82%      { box-shadow: inset 8px 0 rgba(255,0,0,0.12), inset -6px 0 rgba(0,255,255,0.10); }
      85%      { box-shadow: inset -5px 0 rgba(255,0,0,0.08), inset 10px 0 rgba(0,255,255,0.08); }
      88%      { box-shadow: inset 3px 0 rgba(255,0,0,0.05), inset -3px 0 rgba(0,255,255,0.05); }
      100%     { box-shadow: inset 3px 0 rgba(255,0,0,0.05), inset -3px 0 rgba(0,255,255,0.05); }
    }

    /* Noise canvas */
    #hack-noise {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.06;
      image-rendering: pixelated;
    }

    /* Warning text that flashes */
    .hack-warning {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Courier New', monospace;
      font-size: 28px;
      font-weight: bold;
      color: rgba(255, 0, 60, 0.8);
      text-transform: uppercase;
      letter-spacing: 12px;
      text-shadow: 0 0 20px rgba(255, 0, 60, 0.6), 0 0 60px rgba(255, 0, 60, 0.3);
      animation: hack-warning-pulse 1.5s ease-in-out infinite;
      white-space: nowrap;
    }

    @keyframes hack-warning-pulse {
      0%, 100% { opacity: 0.9; }
      30%      { opacity: 0.2; }
      50%      { opacity: 0.95; }
      70%      { opacity: 0.4; }
    }
  `;
  document.head.appendChild(style);

  // ── Create overlay DOM ──
  const overlay = document.createElement('div');
  overlay.id = 'hack-overlay';

  // Scanlines
  const scanlines = document.createElement('div');
  scanlines.className = 'hack-scanlines';
  overlay.appendChild(scanlines);

  // Flicker
  const flicker = document.createElement('div');
  flicker.className = 'hack-flicker';
  overlay.appendChild(flicker);

  // Aberration
  const aberration = document.createElement('div');
  aberration.className = 'hack-aberration';
  overlay.appendChild(aberration);

  // Glitch bars (random positions)
  for (let i = 0; i < 8; i++) {
    const bar = document.createElement('div');
    bar.className = 'hack-bar';
    bar.style.top = (Math.random() * 95) + '%';
    bar.style.height = (2 + Math.random() * 8) + 'px';
    bar.style.background = Math.random() > 0.5
      ? 'rgba(255, 0, 60, 0.08)'
      : 'rgba(0, 220, 255, 0.06)';
    bar.style.setProperty('--duration', (0.15 + Math.random() * 0.6) + 's');
    bar.style.setProperty('--delay', (Math.random() * 2) + 's');
    overlay.appendChild(bar);
  }

  // Flash
  const flash = document.createElement('div');
  flash.className = 'hack-flash';
  overlay.appendChild(flash);

  // Warning text
  const warning = document.createElement('div');
  warning.className = 'hack-warning';
  warning.textContent = 'SYSTÈME COMPROMIS';
  overlay.appendChild(warning);

  // Noise canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'hack-noise';
  canvas.width = 128;
  canvas.height = 128;
  overlay.appendChild(canvas);

  document.body.appendChild(overlay);

  // ── Noise rendering ──
  const ctx = canvas.getContext('2d');
  let noiseTimer = null;
  let barTimer = null;

  function renderNoise() {
    const imageData = ctx.createImageData(128, 128);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function randomizeBars() {
    const bars = overlay.querySelectorAll('.hack-bar');
    bars.forEach(bar => {
      bar.style.top = (Math.random() * 95) + '%';
      bar.style.height = (2 + Math.random() * 10) + 'px';
    });
  }

  // ── Keyboard shortcut: H to toggle hack mode ──
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Don't toggle if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (overlay.classList.contains('active')) {
        window.HackGlitch.deactivate();
      } else {
        window.HackGlitch.activate();
      }
    }
  });

  // ── Public API ──
  window.HackGlitch = {
    activate() {
      overlay.classList.add('active');
      document.body.classList.add('hack-mode-active');
      renderNoise();
      noiseTimer = setInterval(renderNoise, 60);
      barTimer = setInterval(randomizeBars, 400);
    },

    deactivate() {
      overlay.classList.remove('active');
      document.body.classList.remove('hack-mode-active');
      if (noiseTimer) { clearInterval(noiseTimer); noiseTimer = null; }
      if (barTimer) { clearInterval(barTimer); barTimer = null; }
    },

    isActive() {
      return overlay.classList.contains('active');
    }
  };
})();
