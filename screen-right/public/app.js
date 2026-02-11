// ============================================================
// Screen Right — Tim Ferris + Puzzle 3 multiplexer display
// ============================================================
// Two WebSocket connections:
//   1. Own server (ws://localhost:3012) — Tim Ferris clips, mode switching
//   2. Puzzle 3 server (ws://localhost:3001) — puzzle state, clips, progress
// ============================================================

let isMock = false;
let audioUnlocked = false;

// --- Current display mode ---
let currentMode = 'tim-ferris'; // 'tim-ferris' | 'puzzle-3' | 'hack'

// --- DOM elements ---
const tfLayer = document.getElementById('tf-layer');
const tfVideoPlayer = document.getElementById('tf-video-player');

const p3Layer = document.getElementById('p3-layer');
const p3VideoPlayer = document.getElementById('p3-video-player');
const p3SituationBar = document.getElementById('p3-situation-bar');
const p3CodeDisplay = document.getElementById('p3-code-display');
const p3FeedbackFlash = document.getElementById('p3-feedback-flash');
const p3StatusText = document.getElementById('p3-status-text');

const mockControls = document.getElementById('mock-controls');
const debugState = document.getElementById('debug-state');
const startOverlay = document.getElementById('start-overlay');

// --- Video preloading ---
// Separate caches for Tim Ferris and Puzzle 3 videos
const tfVideoCache = {};
const p3VideoCache = {};

let preloadTotal = 0;
let preloadDone = 0;

function preloadVideos(filenames, cache, baseUrl) {
  preloadTotal += filenames.length;
  updatePreloadProgress();

  for (const filename of filenames) {
    if (cache[filename]) {
      preloadDone++;
      updatePreloadProgress();
      continue;
    }

    fetch(`${baseUrl}${filename}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        cache[filename] = URL.createObjectURL(blob);
        preloadDone++;
        console.log(`[preload] ${filename} ready (${preloadDone}/${preloadTotal})`);
        updatePreloadProgress();
      })
      .catch(err => {
        console.warn(`[preload] Failed: ${filename}`, err.message);
        preloadDone++;
        updatePreloadProgress();
      });
  }
}

function updatePreloadProgress() {
  const pct = preloadTotal > 0 ? Math.round((preloadDone / preloadTotal) * 100) : 0;
  const el = document.getElementById('preload-status');
  if (el) {
    if (preloadDone < preloadTotal) {
      el.textContent = `Chargement des vidéos... ${pct}%`;
    } else {
      el.textContent = 'Toutes les vidéos chargées';
      setTimeout(() => { el.style.opacity = '0'; }, 1000);
    }
  }
}

// --- Audio unlock ---
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // Play/pause both video elements to unlock audio context
  tfVideoPlayer.muted = false;
  tfVideoPlayer.play().then(() => tfVideoPlayer.pause()).catch(() => {});
  p3VideoPlayer.muted = false;
  p3VideoPlayer.play().then(() => p3VideoPlayer.pause()).catch(() => {});

  startOverlay.classList.add('hidden');
  console.log('[audio] Unlocked via user gesture');

  // Tell own server we're ready
  if (wsOwn && wsOwn.readyState === WebSocket.OPEN) {
    wsOwn.send(JSON.stringify({ type: 'ready' }));
  }
}

document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', function unlock(e) {
  unlockAudio();
  document.removeEventListener('keydown', unlock);
}, { once: false });

// ============================================================
// MODE SWITCHING
// ============================================================

function setMode(mode) {
  currentMode = mode;

  if (mode === 'tim-ferris') {
    tfLayer.classList.remove('hidden');
    p3Layer.classList.remove('visible');
  } else if (mode === 'puzzle-3') {
    tfLayer.classList.add('hidden');
    p3Layer.classList.add('visible');
  }
  // 'hack' mode: keep current layer visibility, overlay handles visuals

  updateDebug();
}

// ============================================================
// CONNECTION 1 — Own server (Tim Ferris clips + mode control)
// ============================================================

const wsOwn = new WebSocket(`ws://${location.host}`);
let puzzle3Url = null;

// --- Tim Ferris video playback ---
let tfCurrentClipId = null;
let tfIdleLooping = false;
let tfIdleFilename = null;

function tfPlayClip(filename, clipId) {
  tfCurrentClipId = clipId;
  tfIdleLooping = false;

  const src = tfVideoCache[filename] || `videos/${filename}`;
  tfVideoPlayer.src = src;
  tfVideoPlayer.loop = false;
  tfVideoPlayer.muted = !audioUnlocked;

  const playPromise = tfVideoPlayer.play();
  if (playPromise) {
    playPromise.catch(err => {
      console.warn('[tf-video] Play failed, trying muted:', err.message);
      tfVideoPlayer.muted = true;
      tfVideoPlayer.play().catch(() => {});
    });
  }

  console.log(`[tf-video] Playing: ${filename} (clipId: ${clipId}, cached: ${!!tfVideoCache[filename]})`);
}

function tfPlayIdle() {
  if (!tfIdleFilename) return;
  tfIdleLooping = true;
  tfCurrentClipId = null;

  const src = tfVideoCache[tfIdleFilename] || `videos/${tfIdleFilename}`;
  tfVideoPlayer.src = src;
  tfVideoPlayer.loop = true;
  tfVideoPlayer.muted = true; // Idle is always silent

  tfVideoPlayer.play().catch(() => {});
  console.log('[tf-video] Idle loop');
}

tfVideoPlayer.addEventListener('ended', () => {
  if (tfIdleLooping) return;

  const clipId = tfCurrentClipId;
  console.log(`[tf-video] Ended: ${clipId}`);

  // After a Tim Ferris clip ends, return to idle
  tfPlayIdle();
});

// --- Own server WebSocket messages ---
wsOwn.onopen = () => {
  console.log('[ws-own] Connected');
};

wsOwn.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'config':
      isMock = msg.mock;
      puzzle3Url = msg.puzzle3Url;

      if (isMock) {
        mockControls.classList.add('visible');
      }

      // Set initial mode
      if (msg.mode) {
        setMode(msg.mode);
      }

      // Preload Tim Ferris videos
      if (msg.videos && msg.videos.length > 0) {
        // Store idle filename (first video in config.videos is idle)
        tfIdleFilename = msg.videos[0];
        preloadVideos(msg.videos, tfVideoCache, 'videos/');
      }

      // Start Tim Ferris idle
      setTimeout(() => {
        if (currentMode === 'tim-ferris') {
          tfPlayIdle();
        }
      }, 500);

      // Connect to Puzzle 3 server
      if (puzzle3Url) {
        connectToPuzzle3();
      }
      break;

    case 'modeChange':
      setMode(msg.mode);
      break;

    case 'playClip':
      tfPlayClip(msg.filename, msg.clipId);
      break;

    case 'hackMode':
      if (typeof HackGlitch !== 'undefined') {
        HackGlitch.activate();
      }
      break;

    case 'hackResolved':
      if (typeof HackGlitch !== 'undefined') {
        HackGlitch.deactivate();
      }
      break;

    case 'reset':
      // Reset everything
      if (typeof HackGlitch !== 'undefined') {
        HackGlitch.deactivate();
      }
      setMode('tim-ferris');
      tfPlayIdle();
      p3ResetDisplay();
      break;
  }
};

wsOwn.onclose = () => {
  console.log('[ws-own] Disconnected');
};

// ============================================================
// CONNECTION 2 — Puzzle 3 server
// ============================================================

let wsP3 = null;
let p3ReconnectTimer = null;
let p3ReconnectDelay = 2000;
const P3_MAX_RECONNECT_DELAY = 30000;
let p3Connected = false;

// --- Puzzle 3 state ---
let p3State = {};

function connectToPuzzle3() {
  if (!puzzle3Url) return;
  if (wsP3 && wsP3.readyState === WebSocket.OPEN) return;

  console.log('[ws-p3] Connecting to Puzzle 3 at', puzzle3Url);

  try {
    wsP3 = new WebSocket(puzzle3Url);

    wsP3.onopen = () => {
      console.log('[ws-p3] Connected to Puzzle 3');
      p3Connected = true;
      p3ReconnectDelay = 2000; // Reset backoff
      updateDebug();
    };

    wsP3.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      handlePuzzle3Message(msg);
    };

    wsP3.onclose = () => {
      console.log('[ws-p3] Disconnected from Puzzle 3');
      p3Connected = false;
      wsP3 = null;
      updateDebug();

      // Reconnect with exponential backoff
      p3ReconnectTimer = setTimeout(() => {
        p3ReconnectDelay = Math.min(p3ReconnectDelay * 1.5, P3_MAX_RECONNECT_DELAY);
        connectToPuzzle3();
      }, p3ReconnectDelay);
    };

    wsP3.onerror = (err) => {
      console.warn('[ws-p3] Connection error');
    };

  } catch (err) {
    console.warn('[ws-p3] Failed to connect:', err.message);
    // Retry
    p3ReconnectTimer = setTimeout(() => {
      p3ReconnectDelay = Math.min(p3ReconnectDelay * 1.5, P3_MAX_RECONNECT_DELAY);
      connectToPuzzle3();
    }, p3ReconnectDelay);
  }
}

// --- Puzzle 3 video playback ---
let p3CurrentClipId = null;
let p3IdleLooping = false;

function p3PlayClip(filename, clipId) {
  p3CurrentClipId = clipId;
  p3IdleLooping = false;

  // Puzzle 3 videos are served by puzzle 3's server
  const src = p3VideoCache[filename] || `${puzzle3Url.replace('ws://', 'http://').replace('wss://', 'https://')}/videos/${filename}`;
  p3VideoPlayer.src = src;
  p3VideoPlayer.loop = false;
  p3VideoPlayer.muted = !audioUnlocked;

  const playPromise = p3VideoPlayer.play();
  if (playPromise) {
    playPromise.catch(err => {
      console.warn('[p3-video] Play failed, trying muted:', err.message);
      p3VideoPlayer.muted = true;
      p3VideoPlayer.play().catch(() => {});
    });
  }

  console.log(`[p3-video] Playing: ${filename} (clipId: ${clipId}, cached: ${!!p3VideoCache[filename]})`);
}

function p3PlayIdle() {
  p3IdleLooping = true;
  p3CurrentClipId = null;

  const filename = 'idle.mp4';
  const src = p3VideoCache[filename] || `${puzzle3Url.replace('ws://', 'http://').replace('wss://', 'https://')}/videos/${filename}`;
  p3VideoPlayer.src = src;
  p3VideoPlayer.loop = true;
  p3VideoPlayer.muted = true; // Idle is always silent

  p3VideoPlayer.play().catch(() => {});
  console.log('[p3-video] Idle loop');
}

p3VideoPlayer.addEventListener('ended', () => {
  if (p3IdleLooping) return;

  const clipId = p3CurrentClipId;
  console.log(`[p3-video] Ended: ${clipId}`);

  // Send clip ended event back to puzzle 3 server
  if (wsP3 && wsP3.readyState === WebSocket.OPEN) {
    if (clipId && clipId.startsWith('situation-')) {
      wsP3.send(JSON.stringify({ type: 'situationClipEnded', clipId }));
    } else if (clipId) {
      wsP3.send(JSON.stringify({ type: 'clipEnded', clipId }));
    }
  }
});

// --- Puzzle 3 HUD helpers ---
function p3BuildSituationDots(total) {
  p3SituationBar.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'situation-dot';
    dot.dataset.index = i;
    p3SituationBar.appendChild(dot);
  }
}

function p3BuildCodeDots(total) {
  p3CodeDisplay.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'code-dot';
    dot.dataset.index = i;
    p3CodeDisplay.appendChild(dot);
  }
}

function p3UpdateSituationDots(currentSituation, leds) {
  const dots = p3SituationBar.querySelectorAll('.situation-dot');
  dots.forEach((dot, i) => {
    dot.classList.remove('active', 'solved');
    if (leds && leds[i]) {
      dot.classList.add('solved');
    } else if (i === currentSituation) {
      dot.classList.add('active');
    }
  });
}

function p3UpdateCodeDots(entered, total) {
  const dots = p3CodeDisplay.querySelectorAll('.code-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < entered);
  });
}

function p3FlashFeedback(correct) {
  p3FeedbackFlash.className = correct ? 'correct' : 'wrong';
  setTimeout(() => {
    p3FeedbackFlash.className = '';
  }, 400);
}

function p3ResetDisplay() {
  p3SituationBar.innerHTML = '';
  p3CodeDisplay.innerHTML = '';
  p3CodeDisplay.classList.remove('visible');
  p3StatusText.textContent = '';
  p3FeedbackFlash.className = '';
  p3State = {};
}

// --- Handle messages from Puzzle 3 server ---
function handlePuzzle3Message(msg) {
  switch (msg.type) {
    case 'config':
      // Puzzle 3 sends its config with video manifest
      if (msg.videos && msg.videos.length > 0) {
        // Build base URL for puzzle 3 video fetching
        const p3BaseUrl = puzzle3Url.replace('ws://', 'http://').replace('wss://', 'https://') + '/videos/';
        preloadVideos(msg.videos, p3VideoCache, p3BaseUrl);
      }
      break;

    case 'state':
      p3State = msg;
      if (msg.totalSituations) {
        p3BuildSituationDots(msg.totalSituations);
        p3BuildCodeDots(msg.codeLength);
      }
      p3UpdateSituationDots(msg.currentSituation, msg.leds);
      p3UpdateCodeDots(msg.codeProgress, msg.codeLength);

      if (msg.state === 'situation') {
        p3CodeDisplay.classList.add('visible');
        p3StatusText.textContent = `Situation ${msg.currentSituation + 1} — Entrez le code`;
      } else if (msg.state === 'inactive') {
        p3CodeDisplay.classList.remove('visible');
        p3StatusText.textContent = 'En attente d\'activation';
      } else if (msg.state === 'solved') {
        p3CodeDisplay.classList.remove('visible');
        p3StatusText.textContent = 'Mission accomplie';
      } else {
        p3CodeDisplay.classList.remove('visible');
        p3StatusText.textContent = '';
      }

      updateDebug();
      break;

    case 'playClip':
      p3PlayClip(msg.filename, msg.clipId);
      break;

    case 'showIdle':
      p3PlayIdle();
      p3CodeDisplay.classList.add('visible');
      p3UpdateCodeDots(0, p3State.codeLength || 4);
      p3StatusText.textContent = `Situation ${msg.situationIndex + 1} — Entrez le code`;
      break;

    case 'codeProgress':
      p3UpdateCodeDots(msg.entered, msg.total);
      break;

    case 'codeResult':
      p3FlashFeedback(msg.correct);
      p3UpdateCodeDots(0, p3State.codeLength || 4);
      break;
  }
}

// ============================================================
// KEYBOARD CONTROLS (mock mode)
// ============================================================

document.addEventListener('keydown', (e) => {
  if (!isMock) return;

  switch (e.key.toLowerCase()) {
    case 'm':
      // Toggle mode
      if (wsOwn.readyState === WebSocket.OPEN) {
        wsOwn.send(JSON.stringify({ type: 'switchMode' }));
      }
      break;

    case 'h':
      // Hack mode
      if (typeof HackGlitch !== 'undefined') {
        HackGlitch.activate();
      }
      break;

    case 'n':
      // Normal (unhack)
      if (typeof HackGlitch !== 'undefined') {
        HackGlitch.deactivate();
      }
      break;

    case 't':
      // Play Tim Ferris intro clip
      if (currentMode === 'tim-ferris' || currentMode === 'hack') {
        const introFile = Object.values(tfVideoCache).length > 1
          ? null : null; // Use server command
        if (wsOwn.readyState === WebSocket.OPEN) {
          wsOwn.send(JSON.stringify({ type: 'setMode', mode: 'tim-ferris' }));
        }
        // Manually play the intro as a test
        tfPlayClip('tim-ferris-intro.mp4', 'tf-intro');
      }
      break;
  }
});

// ============================================================
// DEBUG DISPLAY
// ============================================================

function updateDebug() {
  if (!debugState) return;
  const p3Status = p3Connected ? 'connected' : 'disconnected';
  const p3Info = p3State.state
    ? `P3: ${p3State.state} S${(p3State.currentSituation || 0) + 1}/${p3State.totalSituations || '?'}`
    : 'P3: --';
  debugState.textContent = `Mode: ${currentMode} | ${p3Info} | P3 WS: ${p3Status}`;
}
