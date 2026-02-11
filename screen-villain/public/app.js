// --- WebSocket connection ---
const ws = new WebSocket(`ws://${location.host}`);

let isMock = false;
let audioUnlocked = false;
let currentMode = 'idle';

// --- DOM elements ---
const videoPlayer = document.getElementById('video-player');
const mockControls = document.getElementById('mock-controls');
const debugState = document.getElementById('debug-state');
const startOverlay = document.getElementById('start-overlay');
const statusText = document.getElementById('status-text');

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

  // Tell server we're ready
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

// --- Video playback ---
let currentClipFilename = null;
let idleLooping = false;

function playClip(filename) {
  currentClipFilename = filename;
  idleLooping = false;
  currentMode = 'clip';

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

  console.log(`[video] Playing clip: ${filename} (cached: ${!!videoCache[filename]})`);
}

function playIdle(filename) {
  idleLooping = true;
  currentMode = 'idle';
  currentClipFilename = null;

  const src = videoCache[filename] || `videos/${filename}`;
  videoPlayer.src = src;
  videoPlayer.loop = true;
  videoPlayer.muted = true; // idle is always silent

  videoPlayer.play().catch(() => {});
  console.log('[video] Idle loop:', filename);
}

videoPlayer.addEventListener('ended', () => {
  if (idleLooping) return;

  const filename = currentClipFilename;
  console.log(`[video] Ended: ${filename}`);

  if (filename) {
    ws.send(JSON.stringify({ type: 'clipEnded', filename }));
  }
});

// --- Debug display ---
function updateDebug(state) {
  if (!debugState) return;
  debugState.textContent = `Mode: ${state.mode} | Clip: ${state.currentClip || 'none'}`;
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
      currentMode = msg.mode;
      updateDebug(msg);

      if (msg.mode === 'idle') {
        statusText.textContent = '';
      } else if (msg.mode === 'clip') {
        statusText.textContent = 'Transmission entrante';
      } else if (msg.mode === 'hack') {
        statusText.textContent = 'Système compromis';
      }
      break;

    case 'playClip':
      playClip(msg.filename);
      break;

    case 'hackMode':
      currentMode = 'hack';
      if (typeof HackGlitch !== 'undefined') {
        HackGlitch.activate();
      }
      statusText.textContent = 'Système compromis';
      break;

    case 'hackResolved':
      currentMode = 'idle';
      if (typeof HackGlitch !== 'undefined') {
        HackGlitch.deactivate();
      }
      statusText.textContent = '';
      break;

    case 'reset':
      currentMode = 'idle';
      currentClipFilename = null;
      idleLooping = false;
      videoPlayer.pause();
      videoPlayer.src = '';
      if (typeof HackGlitch !== 'undefined') {
        HackGlitch.deactivate();
      }
      statusText.textContent = '';
      break;
  }
};

ws.onclose = () => {
  console.log('[ws] Disconnected');
  statusText.textContent = 'Connexion perdue';
};

// --- Keyboard input (mock mode controls) ---
document.addEventListener('keydown', (e) => {
  if (!isMock) return;

  if (e.key === 'h' || e.key === 'H') {
    ws.send(JSON.stringify({ type: 'hackMode' }));
    e.preventDefault();
  } else if (e.key === 'n' || e.key === 'N') {
    ws.send(JSON.stringify({ type: 'hackResolved' }));
    e.preventDefault();
  } else if (e.key === 'i' || e.key === 'I') {
    ws.send(JSON.stringify({ type: 'activate' }));
    e.preventDefault();
  }
});
