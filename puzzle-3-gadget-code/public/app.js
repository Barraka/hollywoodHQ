// --- WebSocket connection ---
const ws = new WebSocket(`ws://${location.host}`);

let isMock = false;
let puzzleState = {};
let audioUnlocked = false;

// --- DOM elements ---
const videoPlayer = document.getElementById('video-player');
const situationBar = document.getElementById('situation-bar');
const codeDisplay = document.getElementById('code-display');
const feedbackFlash = document.getElementById('feedback-flash');
const statusText = document.getElementById('status-text');
const mockControls = document.getElementById('mock-controls');
const debugState = document.getElementById('debug-state');
const startOverlay = document.getElementById('start-overlay');

// --- Video preloading ---
// Cache of preloaded video blob URLs keyed by filename
const videoCache = {};
let preloadTotal = 0;
let preloadDone = 0;

function preloadVideos(filenames) {
  preloadTotal = filenames.length;
  preloadDone = 0;
  updatePreloadProgress();

  for (const filename of filenames) {
    if (videoCache[filename]) {
      preloadDone++;
      updatePreloadProgress();
      continue;
    }

    fetch(`videos/${filename}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        videoCache[filename] = URL.createObjectURL(blob);
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
// Browsers block unmuted autoplay until user interaction.
// On Pi kiosk this isn't needed (Chrome flag --autoplay-policy=no-user-gesture-required).
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  // Play/pause a silent moment to unlock the audio context
  videoPlayer.muted = false;
  videoPlayer.play().then(() => videoPlayer.pause()).catch(() => {});
  startOverlay.classList.add('hidden');
  console.log('[audio] Unlocked via user gesture');

  // Tell server we're ready (triggers auto-activate in mock mode)
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ready' }));
  }
}

// Click anywhere to unlock
document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', function unlock(e) {
  unlockAudio();
  document.removeEventListener('keydown', unlock);
}, { once: false });

// --- Build situation dots ---
function buildSituationDots(total) {
  situationBar.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'situation-dot';
    dot.dataset.index = i;
    situationBar.appendChild(dot);
  }
}

// --- Build code input dots ---
function buildCodeDots(total) {
  codeDisplay.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'code-dot';
    dot.dataset.index = i;
    codeDisplay.appendChild(dot);
  }
}

// --- Update situation dot states ---
function updateSituationDots(currentSituation, leds) {
  const dots = situationBar.querySelectorAll('.situation-dot');
  dots.forEach((dot, i) => {
    dot.classList.remove('active', 'solved');
    if (leds && leds[i]) {
      dot.classList.add('solved');
    } else if (i === currentSituation) {
      dot.classList.add('active');
    }
  });
}

// --- Update code progress dots ---
function updateCodeDots(entered, total) {
  const dots = codeDisplay.querySelectorAll('.code-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < entered);
  });
}

// --- Video playback ---
let currentClipId = null;
let idleLooping = false;

function playClip(filename, clipId) {
  currentClipId = clipId;
  idleLooping = false;

  // Use preloaded blob URL if available, otherwise fall back to network
  const src = videoCache[filename] || `videos/${filename}`;
  videoPlayer.src = src;
  videoPlayer.loop = false;
  videoPlayer.muted = !audioUnlocked;

  const playPromise = videoPlayer.play();
  if (playPromise) {
    playPromise.catch(err => {
      console.warn('[video] Play failed, trying muted:', err.message);
      videoPlayer.muted = true;
      videoPlayer.play().catch(() => {});
    });
  }

  console.log(`[video] Playing: ${filename} (clipId: ${clipId}, cached: ${!!videoCache[filename]})`);
}

function playIdle() {
  idleLooping = true;
  const filename = 'idle.mp4';
  const src = videoCache[filename] || `videos/${filename}`;
  videoPlayer.src = src;
  videoPlayer.loop = true;
  videoPlayer.muted = true; // idle is always silent

  videoPlayer.play().catch(() => {});
  console.log('[video] Idle loop');
}

videoPlayer.addEventListener('ended', () => {
  if (idleLooping) return;

  const clipId = currentClipId;
  console.log(`[video] Ended: ${clipId}`);

  if (clipId && clipId.startsWith('situation-')) {
    ws.send(JSON.stringify({ type: 'situationClipEnded', clipId }));
  } else if (clipId) {
    ws.send(JSON.stringify({ type: 'clipEnded', clipId }));
  }
});

// --- Feedback flash ---
function flashFeedback(correct) {
  feedbackFlash.className = correct ? 'correct' : 'wrong';
  setTimeout(() => {
    feedbackFlash.className = '';
  }, 400);
}

// --- WebSocket messages ---
ws.onopen = () => {
  console.log('[ws] Connected');
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'config':
      isMock = msg.mock;
      if (isMock) {
        mockControls.classList.add('visible');
      }
      // Preload all video clips
      if (msg.videos && msg.videos.length > 0) {
        preloadVideos(msg.videos);
      }
      break;

    case 'state':
      puzzleState = msg;
      if (msg.totalSituations) {
        buildSituationDots(msg.totalSituations);
        buildCodeDots(msg.codeLength);
      }
      updateSituationDots(msg.currentSituation, msg.leds);
      updateCodeDots(msg.codeProgress, msg.codeLength);

      if (msg.state === 'situation') {
        codeDisplay.classList.add('visible');
        statusText.textContent = `Situation ${msg.currentSituation + 1} — Entrez le code`;
      } else if (msg.state === 'inactive') {
        codeDisplay.classList.remove('visible');
        statusText.textContent = 'En attente d\'activation';
      } else if (msg.state === 'solved') {
        codeDisplay.classList.remove('visible');
        statusText.textContent = 'Mission accomplie';
      } else {
        codeDisplay.classList.remove('visible');
        statusText.textContent = '';
      }

      updateDebug(msg);
      break;

    case 'playClip':
      playClip(msg.filename, msg.clipId);
      break;

    case 'showIdle':
      playIdle();
      codeDisplay.classList.add('visible');
      updateCodeDots(0, puzzleState.codeLength || 4);
      statusText.textContent = `Situation ${msg.situationIndex + 1} — Entrez le code`;
      break;

    case 'codeProgress':
      updateCodeDots(msg.entered, msg.total);
      break;

    case 'codeResult':
      flashFeedback(msg.correct);
      updateCodeDots(0, puzzleState.codeLength || 4);
      break;

    case 'hackMode':
      if (typeof HackGlitch !== 'undefined') HackGlitch.activate();
      break;

    case 'hackResolved':
      if (typeof HackGlitch !== 'undefined') HackGlitch.deactivate();
      break;
  }
};

ws.onclose = () => {
  console.log('[ws] Disconnected');
  statusText.textContent = 'Connexion perdue';
};

// --- Keyboard input (numpad + keyboard digits) ---
document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') {
    ws.send(JSON.stringify({ type: 'digit', digit: e.key }));
    e.preventDefault();
    return;
  }

  if (e.key === 'Enter') {
    ws.send(JSON.stringify({ type: 'submit' }));
    e.preventDefault();
    return;
  }

  if (e.key === 'Backspace') {
    ws.send(JSON.stringify({ type: 'delete' }));
    e.preventDefault();
    return;
  }

  if (e.key === 'Escape') {
    ws.send(JSON.stringify({ type: 'clear' }));
    e.preventDefault();
    return;
  }

  if (isMock) {
    if (e.key === 'a' || e.key === 'A') {
      ws.send(JSON.stringify({ type: 'activate' }));
    } else if (e.key === 'r' || e.key === 'R') {
      ws.send(JSON.stringify({ type: 'reset' }));
    } else if (e.key === 'f' || e.key === 'F') {
      ws.send(JSON.stringify({ type: 'forceSolve' }));
    }
  }
});

// --- Debug display ---
function updateDebug(state) {
  if (!debugState) return;
  debugState.textContent = `State: ${state.state} | Situation: ${state.currentSituation + 1}/${state.totalSituations} | LEDs: ${(state.leds || []).map(l => l ? 'ON' : 'off').join(' ')}`;
}
