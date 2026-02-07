const ws = new WebSocket(`ws://${location.host}`);

let isMock = false;
let puzzleState = {};
let audioUnlocked = false;
let svgEl = null;
let missileGroup = null;

// DOM
const mapContainer = document.getElementById('map-container');
const progressBar = document.getElementById('progress-bar');
const directionHint = document.getElementById('direction-hint');
const statusText = document.getElementById('status-text');
const feedbackFlash = document.getElementById('feedback-flash');
const solvedOverlay = document.getElementById('solved-overlay');
const mockControls = document.getElementById('mock-controls');
const debugState = document.getElementById('debug-state');
const startOverlay = document.getElementById('start-overlay');

// --- Load world map SVG ---
fetch('world-map.svg')
  .then(r => r.text())
  .then(svgText => {
    mapContainer.innerHTML = svgText;
    svgEl = mapContainer.querySelector('svg');
    addCityDots();
    console.log('[map] SVG loaded');
  });

function addCityDots() {
  if (!svgEl) return;
  const dots = [
    [130.6,405.6],[133,422.4],[218.3,412.3],[232.3,429.7],[170.6,476.5],
    [405.4,402.7],[406.4,386.8],[246.8,389.2],[760.4,629.3],[706.4,630.3],
    [255.9,653.4],[303.7,562.8],[367.3,485.6],[496.1,357.8],[724.7,404.6],
    [239.1,625],[106,309.6],[367.3,345.3],[591.6,328.9],[675,410.4],
    [585.3,449.9],[500,459.1],[499.5,410.4],[454.6,613.9],[479.7,580.1],
    [516.4,520.8],[446.9,392.5],[427.6,394],[402.6,425.3],[389,431.6],
    [216.9,549.8],
  ];
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.id = 'city-dots';
  dots.forEach(([cx, cy]) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', '2');
    circle.setAttribute('class', 'city-dot-svg');
    g.appendChild(circle);
  });
  svgEl.appendChild(g);
}

// --- Draw missile trajectory on SVG ---
function drawTrajectory(path, directions, missileAt, reverseLeg) {
  if (!svgEl) return;

  // Remove old missile group
  if (missileGroup) missileGroup.remove();

  missileGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  missileGroup.id = 'missile-layer';

  const totalLegs = directions.length;
  const reversedLegs = reverseLeg || 0;

  // Draw trajectory lines
  for (let i = 0; i < path.length - 1; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', path[i].x);
    line.setAttribute('y1', path[i].y);
    line.setAttribute('x2', path[i + 1].x);
    line.setAttribute('y2', path[i + 1].y);

    // Legs are indexed from 0 (first leg) to totalLegs-1 (last leg)
    // Reversed legs count from the end: reversedLegs legs have been reversed
    const legFromEnd = totalLegs - 1 - i; // how far this leg is from the end
    if (legFromEnd < reversedLegs) {
      line.setAttribute('class', 'trajectory-line reversed');
    } else {
      line.setAttribute('class', 'trajectory-line');
    }
    missileGroup.appendChild(line);
  }

  // Draw waypoint markers
  for (let i = 0; i < path.length; i++) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', path[i].x);
    circle.setAttribute('cy', path[i].y);
    circle.setAttribute('r', '4');

    let cls = 'waypoint-marker';
    if (i === 0) cls += ' origin';
    if (i === missileAt) cls += ' current';
    // Mark reversed cities
    if (i > missileAt && i < path.length) cls += ' reversed';
    circle.setAttribute('class', cls);
    missileGroup.appendChild(circle);

    // Label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', path[i].x);
    label.setAttribute('y', path[i].y - 8);
    label.setAttribute('class', 'waypoint-label');
    label.textContent = path[i].name;
    missileGroup.appendChild(label);
  }

  // Missile marker (pulsing dot at current position)
  const missile = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  missile.id = 'missile-marker';
  missile.setAttribute('cx', path[missileAt].x);
  missile.setAttribute('cy', path[missileAt].y);
  missile.setAttribute('r', '6');
  missileGroup.appendChild(missile);

  svgEl.appendChild(missileGroup);
}

// --- Animate missile forward ---
function animateForward(path, directions, duration) {
  if (!svgEl) {
    // SVG not loaded yet, wait
    setTimeout(() => animateForward(path, directions, duration), 200);
    return;
  }

  drawTrajectory(path, directions, 0, 0);

  const missile = svgEl.querySelector('#missile-marker');
  if (!missile) return;

  const legDuration = duration / (path.length - 1);
  let currentLeg = 0;

  statusText.textContent = 'Missile launched';
  directionHint.textContent = '';

  function animateNextLeg() {
    if (currentLeg >= path.length - 1) {
      // Forward animation complete
      ws.send(JSON.stringify({ type: 'forwardAnimDone' }));
      return;
    }

    const target = path[currentLeg + 1];
    missile.style.transition = `cx ${legDuration}s linear, cy ${legDuration}s linear`;
    // SVG attributes need to be set for transition (CSS transitions on SVG attributes)
    // Use SMIL animation instead
    missile.setAttribute('cx', target.x);
    missile.setAttribute('cy', target.y);

    // Also update the line to "active" as missile passes
    const lines = missileGroup.querySelectorAll('.trajectory-line');
    if (lines[currentLeg]) {
      lines[currentLeg].setAttribute('class', 'trajectory-line active');
    }

    currentLeg++;
    setTimeout(animateNextLeg, legDuration * 1000);
  }

  // Start from first city
  missile.setAttribute('cx', path[0].x);
  missile.setAttribute('cy', path[0].y);
  setTimeout(animateNextLeg, 500);
}

// --- Move missile one leg back (animation) ---
function animateReverseLeg(path, fromIndex, toIndex, duration) {
  const missile = svgEl ? svgEl.querySelector('#missile-marker') : null;
  if (!missile) return;

  const target = path[toIndex];
  missile.style.transition = `cx ${duration}s ease-in-out, cy ${duration}s ease-in-out`;
  missile.setAttribute('cx', target.x);
  missile.setAttribute('cy', target.y);
}

// --- Build progress bar ---
function buildProgressBar(totalLegs) {
  progressBar.innerHTML = '';
  for (let i = 0; i < totalLegs; i++) {
    const seg = document.createElement('div');
    seg.className = 'progress-segment';
    progressBar.appendChild(seg);
  }
}

function updateProgressBar(reversedLegs) {
  const segs = progressBar.querySelectorAll('.progress-segment');
  // Progress fills from right to left (last leg reversed first)
  segs.forEach((seg, i) => {
    const legFromEnd = segs.length - 1 - i;
    seg.classList.toggle('reversed', legFromEnd < reversedLegs);
  });
}

// --- Feedback ---
function flash(type) {
  feedbackFlash.className = type;
  setTimeout(() => { feedbackFlash.className = ''; }, 300);
}

// --- Audio unlock ---
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  startOverlay.classList.add('hidden');
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ready' }));
  }
}

document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', function unlock() {
  unlockAudio();
  document.removeEventListener('keydown', unlock);
});

// --- WebSocket ---
ws.onopen = () => console.log('[ws] Connected');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'config':
      isMock = msg.mock;
      if (isMock) mockControls.classList.add('visible');
      break;

    case 'state':
      puzzleState = msg;
      if (msg.totalLegs) buildProgressBar(msg.totalLegs);
      updateProgressBar(msg.reverseLeg);

      if (msg.state === 'reversing') {
        if (msg.path) drawTrajectory(msg.path, msg.directions, msg.missileAt, msg.reverseLeg);
        statusText.textContent = `Reverse the missile — ${msg.reverseLeg}/${msg.totalLegs}`;
        directionHint.textContent = 'Use joystick to redirect';
      } else if (msg.state === 'inactive') {
        statusText.textContent = 'Awaiting activation';
        directionHint.textContent = '';
      } else if (msg.state === 'solved') {
        if (msg.path) drawTrajectory(msg.path, msg.directions, 0, msg.totalLegs);
        statusText.textContent = 'Missile neutralized';
        directionHint.textContent = '';
        solvedOverlay.classList.add('visible');
      } else if (msg.state === 'forward_animation') {
        statusText.textContent = 'Missile launched';
      }

      updateDebug(msg);
      break;

    case 'forwardAnimation':
      animateForward(msg.path, msg.directions, msg.duration);
      break;

    case 'correctInput':
      flash('correct');
      animateReverseLeg(puzzleState.path, msg.fromIndex, msg.toIndex, msg.duration);
      break;

    case 'wrongInput':
      flash('wrong');
      break;
  }
};

ws.onclose = () => {
  statusText.textContent = 'Connection lost';
};

// --- Keyboard input ---
const arrowMap = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

document.addEventListener('keydown', (e) => {
  if (arrowMap[e.key]) {
    ws.send(JSON.stringify({ type: 'direction', direction: arrowMap[e.key] }));
    e.preventDefault();
    return;
  }

  if (isMock) {
    const key = e.key.toLowerCase();
    if (key === 'x') ws.send(JSON.stringify({ type: 'activate' }));
    if (key === 'c') ws.send(JSON.stringify({ type: 'reset' }));
    if (key === 'v') ws.send(JSON.stringify({ type: 'forceSolve' }));
  }
});

// --- Debug ---
function updateDebug(state) {
  if (!debugState) return;
  const cityName = state.path ? state.path[state.missileAt]?.name : '?';
  debugState.textContent = `State: ${state.state} | Missile at: ${cityName} | Reversed: ${state.reverseLeg}/${state.totalLegs}`;
}
