// --- WebSocket connection ---
const ws = new WebSocket(`ws://${location.host}`);

let isMock = false;
let puzzleState = {};
let audioUnlocked = false;

// --- DOM elements ---
const videoPlayer = document.getElementById('video-player');
const vehicleName = document.getElementById('vehicle-name');
const navIndicator = document.getElementById('nav-indicator');
const vehicleDots = document.getElementById('vehicle-dots');
const leverDisplay = document.getElementById('lever-display');
const feedbackFlash = document.getElementById('feedback-flash');
const feedbackText = document.getElementById('feedback-text');
const statusText = document.getElementById('status-text');
const mockControls = document.getElementById('mock-controls');
const debugState = document.getElementById('debug-state');
const startOverlay = document.getElementById('start-overlay');
const arrowLeft = document.getElementById('arrow-left');
const arrowRight = document.getElementById('arrow-right');

// --- Video preloading ---
const videoCache = {};
let preloadTotal = 0;
let preloadDone = 0;

function preloadVideos(filenames) {
  preloadTotal = filenames.length;
  preloadDone = 0;
  updatePreloadProgress();

  for (const filename of filenames) {
    if (videoCache[filename]) { preloadDone++; updatePreloadProgress(); continue; }

    fetch(`videos/${filename}`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
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
  const el = document.getElementById('preload-status');
  if (!el) return;
  const pct = preloadTotal > 0 ? Math.round((preloadDone / preloadTotal) * 100) : 0;
  if (preloadDone < preloadTotal) {
    el.textContent = `Loading vehicles... ${pct}%`;
  } else {
    el.textContent = 'All vehicles loaded';
    setTimeout(() => { el.style.opacity = '0'; }, 1000);
  }
}

// --- Audio unlock ---
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  startOverlay.classList.add('hidden');
  console.log('[audio] Unlocked via user gesture');

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ready' }));
  }
}

document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', function unlock() {
  unlockAudio();
  document.removeEventListener('keydown', unlock);
});

// --- Build vehicle dots ---
function buildVehicleDots(total) {
  vehicleDots.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'vehicle-dot';
    vehicleDots.appendChild(dot);
  }
}

function updateVehicleDots(currentIndex) {
  const dots = vehicleDots.querySelectorAll('.vehicle-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentIndex);
  });
}

// --- Build lever display ---
function buildLevers(count, positions) {
  leverDisplay.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const group = document.createElement('div');
    group.className = 'lever-group';

    const label = document.createElement('div');
    label.className = 'lever-label';
    label.textContent = `L${i + 1}`;

    const track = document.createElement('div');
    track.className = 'lever-track';
    track.dataset.index = i;

    const knob = document.createElement('div');
    knob.className = 'lever-knob';
    track.appendChild(knob);

    const value = document.createElement('div');
    value.className = 'lever-value';
    value.textContent = '1';

    group.appendChild(label);
    group.appendChild(track);
    group.appendChild(value);
    leverDisplay.appendChild(group);
  }
}

function updateLevers(levers, maxPos) {
  const groups = leverDisplay.querySelectorAll('.lever-group');
  groups.forEach((group, i) => {
    if (i >= levers.length) return;
    const knob = group.querySelector('.lever-knob');
    const value = group.querySelector('.lever-value');
    const pos = levers[i];

    // Position knob: pos 1 = bottom, pos maxPos = top
    const pct = ((pos - 1) / (maxPos - 1)) * 100;
    knob.style.bottom = `${pct}%`;
    knob.style.transform = `translateY(50%)`;

    value.textContent = pos;
  });
}

// --- Video playback ---
let currentVideo = null;

function switchVideo(filename) {
  if (filename === currentVideo) return;
  currentVideo = filename;

  const src = videoCache[filename] || `videos/${filename}`;
  videoPlayer.src = src;
  videoPlayer.loop = true;
  videoPlayer.muted = true; // vehicle loops are silent
  videoPlayer.play().catch(() => {});

  console.log(`[video] Switch to: ${filename} (cached: ${!!videoCache[filename]})`);
}

// --- Feedback ---
function showFeedback(correct) {
  // Flash
  feedbackFlash.className = correct ? 'correct' : 'wrong';
  setTimeout(() => { feedbackFlash.className = ''; }, 500);

  // Text
  feedbackText.textContent = correct ? 'CORRECT' : 'WRONG VEHICLE';
  feedbackText.className = `visible ${correct ? 'correct' : 'wrong'}`;
  setTimeout(() => { feedbackText.className = ''; }, correct ? 3000 : 2000);
}

function showSolved() {
  feedbackText.textContent = 'VEHICLE SELECTED';
  feedbackText.className = 'visible solved';
}

// --- Flash navigation arrow ---
function flashArrow(direction) {
  const arrow = direction === 'left' ? arrowLeft : arrowRight;
  arrow.classList.add('flash');
  setTimeout(() => arrow.classList.remove('flash'), 200);
}

// --- WebSocket messages ---
ws.onopen = () => console.log('[ws] Connected');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'config':
      isMock = msg.mock;
      if (isMock) mockControls.classList.add('visible');
      if (msg.videos) preloadVideos(msg.videos);
      break;

    case 'state':
      puzzleState = msg;
      if (msg.totalVehicles) {
        buildVehicleDots(msg.totalVehicles);
        buildLevers(msg.leverCount, msg.leverPositions);
      }
      updateVehicleDots(msg.currentVehicle);
      updateLevers(msg.levers, msg.leverPositions);
      vehicleName.textContent = msg.vehicleName || '';

      if (msg.vehicleVideo) switchVideo(msg.vehicleVideo);

      if (msg.state === 'browsing' || msg.state === 'feedback') {
        statusText.textContent = 'Set levers and validate';
      } else if (msg.state === 'inactive') {
        statusText.textContent = 'Awaiting activation';
      } else if (msg.state === 'solved') {
        statusText.textContent = 'Mission complete';
        showSolved();
      }

      updateDebug(msg);
      break;

    case 'vehicleChanged':
      vehicleName.textContent = msg.name;
      updateVehicleDots(msg.index);
      switchVideo(msg.video);
      break;

    case 'leversChanged':
      updateLevers(msg.levers, puzzleState.leverPositions || 5);
      break;

    case 'validateResult':
      showFeedback(msg.correct);
      break;
  }
};

ws.onclose = () => {
  console.log('[ws] Disconnected');
  statusText.textContent = 'Connection lost';
};

// --- Keyboard input ---
// Lever keys: Q/A=L1, W/S=L2, E/D=L3, R/F=L4
const leverUpKeys = { q: 0, w: 1, e: 2, r: 3 };
const leverDownKeys = { a: 0, s: 1, d: 2, f: 3 };

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  // Navigation
  if (e.key === 'ArrowLeft') {
    ws.send(JSON.stringify({ type: 'navigate', direction: 'left' }));
    flashArrow('left');
    e.preventDefault();
    return;
  }
  if (e.key === 'ArrowRight') {
    ws.send(JSON.stringify({ type: 'navigate', direction: 'right' }));
    flashArrow('right');
    e.preventDefault();
    return;
  }

  // Validate
  if (e.key === 'Enter') {
    ws.send(JSON.stringify({ type: 'validate' }));
    e.preventDefault();
    return;
  }

  // Lever up
  if (key in leverUpKeys) {
    ws.send(JSON.stringify({ type: 'leverAdjust', lever: leverUpKeys[key], delta: 1 }));
    e.preventDefault();
    return;
  }

  // Lever down
  if (key in leverDownKeys) {
    ws.send(JSON.stringify({ type: 'leverAdjust', lever: leverDownKeys[key], delta: -1 }));
    e.preventDefault();
    return;
  }

  // Mock dev controls
  if (isMock) {
    if (key === 'x') ws.send(JSON.stringify({ type: 'activate' }));
    if (key === 'c') ws.send(JSON.stringify({ type: 'reset' }));
    if (key === 'v') ws.send(JSON.stringify({ type: 'forceSolve' }));
  }
});

// --- Debug display ---
function updateDebug(state) {
  if (!debugState) return;
  debugState.textContent = `State: ${state.state} | Vehicle: ${state.currentVehicle + 1}/${state.totalVehicles} | Levers: ${(state.levers || []).join('-')}`;
}
