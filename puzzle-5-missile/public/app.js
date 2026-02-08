const ws = new WebSocket(`ws://${location.host}`);

let isMock = false;
let puzzleState = {};
let audioUnlocked = false;
let svgEl = null;
let missileGroup = null;
let currentMissileAngle = 0; // Track current missile rotation

// DOM
const mapContainer = document.getElementById('map-container');
const progressBar = document.getElementById('progress-bar');
const directionHint = document.getElementById('direction-hint');
const timerDisplay = document.getElementById('timer-display');
const statusText = document.getElementById('status-text');
const feedbackFlash = document.getElementById('feedback-flash');
const solvedOverlay = document.getElementById('solved-overlay');
const timeoutPopup = document.getElementById('timeout-popup');
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
  // City dots for visual reference on the world map
  // These represent major cities globally (not just the missile path)
  const dots = [
    // Americas
    [130.6,405.6],  // Los Angeles
    [218.3,389.2],  // New York
    [170.6,446.0],  // Mexico City
    [232.3,530.0],  // Lima
    [303.7,562.8],  // Rio de Janeiro
    [255.9,653.4],  // Southern South America
    // Africa
    [479.7,630.0],  // Cape Town
    [479.7,580.1],  // Johannesburg
    [516.4,520.8],  // Nairobi
    [367.3,470.0],  // Dakar
    [389.0,431.6],  // Casablanca
    [454.6,450.0],  // Cairo
    [500.0,485.6],  // East Africa
    // Europe
    [402.6,425.3],  // Madrid
    [405.4,402.7],  // Paris
    [427.6,394.0],  // Berlin
    [446.9,392.5],  // Warsaw
    [496.1,357.8],  // Moscow
    // Asia
    [585.3,449.9],  // Mumbai
    [675.0,410.4],  // Beijing
    [706.4,435.0],  // Shanghai
    [675.0,500.0],  // Singapore
    [706.4,530.0],  // Jakarta
    [724.7,404.6],  // Tokyo
    // Oceania
    [785.0,590.0],  // Noumea
    [760.4,629.3],  // Sydney
    [706.4,630.3],  // Other Pacific
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

  // Store directions for later use
  missileGroup.directions = directions;

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

  // Missile marker (SVG graphic at current position)
  // Calculate initial angle based on actual trajectory line
  // But preserve the current angle if we're actively reversing (to avoid instant rotations)
  let initialAngle = currentMissileAngle; // Default: keep current angle

  // Only recalculate angle if:
  // - This is the first draw (currentMissileAngle is 0)
  // - We're at the start or end position (not mid-reversal)
  const isFirstDraw = currentMissileAngle === 0;
  const isAtStart = missileAt === 0;
  const isAtEnd = missileAt === path.length - 1;

  if (isFirstDraw || isAtStart || isAtEnd) {
    if (missileAt < path.length - 1) {
      // If moving forward, point toward next city
      initialAngle = calculateAngleBetweenPoints(
        path[missileAt].x, path[missileAt].y,
        path[missileAt + 1].x, path[missileAt + 1].y
      );
    } else if (missileAt > 0) {
      // If at the end, point back toward previous city
      initialAngle = calculateAngleBetweenPoints(
        path[missileAt].x, path[missileAt].y,
        path[missileAt - 1].x, path[missileAt - 1].y
      );
    }
    currentMissileAngle = initialAngle;
  }

  const missile = createMissileGraphic(path[missileAt].x, path[missileAt].y, currentMissileAngle);
  missileGroup.appendChild(missile);

  svgEl.appendChild(missileGroup);
}

// --- Create missile SVG graphic ---
function createMissileGraphic(x, y, angle) {
  // Position group (handles translation)
  const positionGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  positionGroup.id = 'missile-marker';
  positionGroup.setAttribute('transform', `translate(${x}, ${y})`);

  // Rotation group (handles rotation separately for faster animation)
  const rotationGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  rotationGroup.id = 'missile-rotation';
  rotationGroup.setAttribute('transform', `rotate(${angle})`);

  // Missile body (pointing right by default)
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  body.setAttribute('x', '-8');
  body.setAttribute('y', '-3');
  body.setAttribute('width', '16');
  body.setAttribute('height', '6');
  body.setAttribute('fill', '#ff3333');
  body.setAttribute('rx', '1');

  // Nose cone (triangle pointing right)
  const nose = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  nose.setAttribute('d', 'M 8,-3 L 15,0 L 8,3 Z');
  nose.setAttribute('fill', '#ff6666');

  // Fins (back stabilizers)
  const finTop = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  finTop.setAttribute('d', 'M -8,-3 L -8,-6 L -5,-3 Z');
  finTop.setAttribute('fill', '#cc0000');

  const finBottom = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  finBottom.setAttribute('d', 'M -8,3 L -8,6 L -5,3 Z');
  finBottom.setAttribute('fill', '#cc0000');

  // Exhaust glow (pulsing)
  const exhaust = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  exhaust.setAttribute('cx', '-10');
  exhaust.setAttribute('cy', '0');
  exhaust.setAttribute('r', '3');
  exhaust.setAttribute('fill', 'rgba(255, 150, 50, 0.6)');
  exhaust.setAttribute('class', 'missile-exhaust');

  // Stripe detail
  const stripe = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  stripe.setAttribute('x', '-2');
  stripe.setAttribute('y', '-3');
  stripe.setAttribute('width', '2');
  stripe.setAttribute('height', '6');
  stripe.setAttribute('fill', 'rgba(255, 255, 255, 0.2)');

  rotationGroup.appendChild(exhaust);
  rotationGroup.appendChild(body);
  rotationGroup.appendChild(nose);
  rotationGroup.appendChild(stripe);
  rotationGroup.appendChild(finTop);
  rotationGroup.appendChild(finBottom);

  positionGroup.appendChild(rotationGroup);

  return positionGroup;
}

// --- Calculate actual angle between two points ---
function calculateAngleBetweenPoints(x1, y1, x2, y2) {
  // Calculate angle in radians, then convert to degrees
  // atan2 returns angle from -PI to PI, with 0 being right (positive x-axis)
  const radians = Math.atan2(y2 - y1, x2 - x1);
  const degrees = radians * (180 / Math.PI);
  return degrees;
}

// --- Get rotation angle for direction (fallback) ---
function getAngleForDirection(direction) {
  const angles = {
    'right': 0,
    'down': 90,
    'left': 180,
    'up': 270
  };
  return angles[direction] || 0;
}

// --- Update missile position and rotation ---
function updateMissileTransform(missile, x, y, targetAngle, duration = 0) {
  if (!missile) return;

  // Get the rotation group (nested inside position group)
  const rotationGroup = missile.querySelector('#missile-rotation');
  if (!rotationGroup) return;

  // Calculate shortest rotation path
  let angleDiff = targetAngle - currentMissileAngle;

  // Normalize to shortest path (-180 to 180)
  while (angleDiff > 180) angleDiff -= 360;
  while (angleDiff < -180) angleDiff += 360;

  // Update current angle by the shortest path
  currentMissileAngle += angleDiff;

  // Animate position (full duration)
  const posTransform = `translate(${x}, ${y})`;
  if (duration > 0) {
    missile.style.transition = `transform ${duration}s ease-in-out`;
  } else {
    missile.style.transition = 'none';
  }
  missile.setAttribute('transform', posTransform);

  // Animate rotation (1/4 duration - faster rotation at start of movement)
  const rotTransform = `rotate(${currentMissileAngle})`;
  const rotDuration = duration > 0 ? duration / 4 : 0;
  if (rotDuration > 0) {
    rotationGroup.style.transition = `transform ${rotDuration}s ease-out`;
  } else {
    rotationGroup.style.transition = 'none';
  }
  rotationGroup.setAttribute('transform', rotTransform);
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
    // Calculate actual angle from current position to target
    const angle = calculateAngleBetweenPoints(
      path[currentLeg].x, path[currentLeg].y,
      target.x, target.y
    );

    updateMissileTransform(missile, target.x, target.y, angle, legDuration);

    // Also update the line to "active" as missile passes
    const lines = missileGroup.querySelectorAll('.trajectory-line');
    if (lines[currentLeg]) {
      lines[currentLeg].setAttribute('class', 'trajectory-line active');
    }

    currentLeg++;
    setTimeout(animateNextLeg, legDuration * 1000);
  }

  // Start from first city pointing toward second city
  const firstAngle = calculateAngleBetweenPoints(
    path[0].x, path[0].y,
    path[1].x, path[1].y
  );
  currentMissileAngle = firstAngle; // Initialize tracking
  updateMissileTransform(missile, path[0].x, path[0].y, firstAngle, 0);
  setTimeout(animateNextLeg, 500);
}

// --- Move missile one leg back (animation) ---
function animateReverseLeg(path, fromIndex, toIndex, duration, direction) {
  const missile = svgEl ? svgEl.querySelector('#missile-marker') : null;
  if (!missile) return;

  const target = path[toIndex];
  // Calculate angle pointing from fromIndex to toIndex (the reverse direction)
  const angle = calculateAngleBetweenPoints(
    path[fromIndex].x, path[fromIndex].y,
    target.x, target.y
  );

  updateMissileTransform(missile, target.x, target.y, angle, duration);
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

// --- Timer display ---
function updateTimer(milliseconds) {
  if (milliseconds <= 0) {
    timerDisplay.classList.remove('visible', 'warning', 'critical');
    timerDisplay.textContent = '';
    return;
  }

  timerDisplay.classList.add('visible');

  // Format as seconds with one decimal place (e.g., "3.4")
  const seconds = (milliseconds / 1000).toFixed(1);
  timerDisplay.textContent = seconds;

  // Visual urgency indicators
  timerDisplay.classList.remove('warning', 'critical');
  if (milliseconds <= 1000) {
    timerDisplay.classList.add('critical');
  } else if (milliseconds <= 2000) {
    timerDisplay.classList.add('warning');
  }
}

// --- Explosion effect ---
function createExplosion(x, y) {
  if (!svgEl) return;

  const explosionGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  explosionGroup.id = 'explosion-effects';
  explosionGroup.setAttribute('transform', `translate(${x}, ${y})`);

  // White-hot core expanding to orange fireball
  const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  core.setAttribute('cx', '0');
  core.setAttribute('cy', '0');
  core.setAttribute('r', '2');
  core.setAttribute('fill', '#ffffff');
  core.setAttribute('class', 'explosion-core');
  explosionGroup.appendChild(core);

  // Multiple fireball layers with gradient colors
  const fireballColors = ['#ffff99', '#ffcc44', '#ff8800', '#ff4400', '#cc2200'];
  fireballColors.forEach((color, i) => {
    const fireball = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fireball.setAttribute('cx', '0');
    fireball.setAttribute('cy', '0');
    fireball.setAttribute('r', '5');
    fireball.setAttribute('fill', color);
    fireball.setAttribute('opacity', '0.7');
    fireball.setAttribute('class', 'explosion-fireball');
    fireball.style.animationDelay = `${i * 0.05}s`;
    fireball.style.animationDuration = `${0.8 + i * 0.1}s`;
    explosionGroup.appendChild(fireball);
  });

  // Shockwave rings with varying delays
  const shockwaveColors = ['#ffeeaa', '#ff6600', '#ff3300'];
  for (let i = 0; i < shockwaveColors.length; i++) {
    const shockwave = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    shockwave.setAttribute('cx', '0');
    shockwave.setAttribute('cy', '0');
    shockwave.setAttribute('r', '5');
    shockwave.setAttribute('fill', 'none');
    shockwave.setAttribute('stroke', shockwaveColors[i]);
    shockwave.setAttribute('stroke-width', '4');
    shockwave.setAttribute('class', 'explosion-shockwave');
    shockwave.style.animationDelay = `${i * 0.12}s`;
    explosionGroup.appendChild(shockwave);
  }

  // Debris particles - varying sizes and speeds (32 particles)
  const debrisCount = 32;
  for (let i = 0; i < debrisCount; i++) {
    const angle = (i / debrisCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const speed = 40 + Math.random() * 40;
    const endX = Math.cos(angle) * speed;
    const endY = Math.sin(angle) * speed;

    // Random debris type
    const debrisType = Math.random();

    if (debrisType < 0.6) {
      // Fire trails (most common)
      const particle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      particle.setAttribute('x1', '0');
      particle.setAttribute('y1', '0');
      particle.setAttribute('x2', endX);
      particle.setAttribute('y2', endY);
      const color = i % 3 === 0 ? '#ffaa00' : i % 3 === 1 ? '#ff6600' : '#ff3300';
      particle.setAttribute('stroke', color);
      particle.setAttribute('stroke-width', 1.5 + Math.random() * 1.5);
      particle.setAttribute('stroke-linecap', 'round');
      particle.setAttribute('class', 'explosion-debris');
      particle.style.animationDelay = `${i * 0.015}s`;
      particle.style.animationDuration = `${0.8 + Math.random() * 0.4}s`;
      explosionGroup.appendChild(particle);
    } else {
      // Glowing embers (circles)
      const ember = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ember.setAttribute('cx', endX * 0.7);
      ember.setAttribute('cy', endY * 0.7);
      ember.setAttribute('r', 1 + Math.random() * 2);
      ember.setAttribute('fill', i % 2 === 0 ? '#ffcc00' : '#ff6600');
      ember.setAttribute('class', 'explosion-fireball');
      ember.style.animationDelay = `${i * 0.02}s`;
      ember.style.animationDuration = `${1 + Math.random() * 0.5}s`;
      explosionGroup.appendChild(ember);
    }
  }

  // Smoke clouds (expanding gray circles)
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const offset = 15;
    const smoke = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    smoke.setAttribute('cx', Math.cos(angle) * offset);
    smoke.setAttribute('cy', Math.sin(angle) * offset);
    smoke.setAttribute('r', '10');
    smoke.setAttribute('fill', '#333333');
    smoke.setAttribute('opacity', '0.6');
    smoke.setAttribute('class', 'explosion-smoke');
    smoke.style.animationDelay = `${0.3 + i * 0.1}s`;
    explosionGroup.appendChild(smoke);
  }

  svgEl.appendChild(explosionGroup);

  // Screen flash effect
  feedbackFlash.className = 'screen-flash';
  feedbackFlash.style.background = 'rgba(255, 200, 100, 1)';
  setTimeout(() => {
    feedbackFlash.className = '';
    feedbackFlash.style.background = '';
  }, 500);

  // Remove explosion effects after animation completes
  setTimeout(() => {
    explosionGroup.remove();
  }, 2000);
}

// --- Trigger missile explosion ---
function explodeMissile() {
  const missile = svgEl ? svgEl.querySelector('#missile-marker') : null;
  if (!missile) return;

  // Get missile position
  const transform = missile.getAttribute('transform');
  const match = transform.match(/translate\(([\d.-]+),\s*([\d.-]+)\)/);
  if (!match) return;

  const x = parseFloat(match[1]);
  const y = parseFloat(match[2]);

  // Trigger explosion at missile location
  createExplosion(x, y);

  // Make missile disappear with explosion effect
  const rotationGroup = missile.querySelector('#missile-rotation');
  if (rotationGroup) {
    rotationGroup.classList.add('missile-explode');
  }

  // Remove missile after explosion
  setTimeout(() => {
    missile.remove();
  }, 500);
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
        statusText.textContent = `Inversez le missile — ${msg.reverseLeg}/${msg.totalLegs}`;
        directionHint.textContent = 'Utilisez le joystick pour rediriger';
        // Timer is shown via timerUpdate events
      } else {
        // Hide timer when not reversing
        updateTimer(0);

        if (msg.state === 'inactive') {
          statusText.textContent = 'En attente d\'activation';
          directionHint.textContent = '';
        } else if (msg.state === 'solved') {
          // Explosion is triggered in correctInput handler when reaching position 0
          // This state just ensures the display is updated
        } else if (msg.state === 'forward_animation') {
          statusText.textContent = 'Missile lancé';
        }
      }

      updateDebug(msg);
      break;

    case 'forwardAnimation':
      animateForward(msg.path, msg.directions, msg.duration);
      break;

    case 'correctInput':
      flash('correct');
      // Get the direction that was just reversed (the forward direction of the leg being undone)
      // If going from index A to index B (where B < A), the forward direction was directions[B]
      const direction = puzzleState.directions ? puzzleState.directions[msg.toIndex] : 'left';
      animateReverseLeg(puzzleState.path, msg.fromIndex, msg.toIndex, msg.duration, direction);

      // If this was the final leg (reached position 0 = Los Angeles), trigger explosion after animation
      if (msg.toIndex === 0) {
        setTimeout(() => {
          explodeMissile();
          statusText.textContent = 'Missile neutralisé';
          directionHint.textContent = '';
          // Show solved overlay after explosion
          setTimeout(() => {
            solvedOverlay.classList.add('visible');
          }, 1000);
        }, msg.duration * 1000 + 100); // Wait for animation + small buffer
      }
      break;

    case 'wrongInput':
      flash('wrong');
      break;

    case 'timerUpdate':
      updateTimer(msg.timeRemaining);
      break;

    case 'timeout':
      flash('wrong');

      // Show timeout popup
      timeoutPopup.classList.add('visible');
      setTimeout(() => {
        timeoutPopup.classList.remove('visible');
      }, 1500); // Show for 1.5 seconds

      // Reset visual state back to starting position
      if (puzzleState.path) {
        drawTrajectory(puzzleState.path, puzzleState.directions, puzzleState.path.length - 1, 0);
      }
      updateProgressBar(0);
      break;
  }
};

ws.onclose = () => {
  statusText.textContent = 'Connection lost';
};

// --- Keyboard input ---
// Numpad for 8-way directions (matches physical numpad layout)
// 7 8 9
// 4   6
// 1 2 3
const numpadMap = {
  '8': 'n',   // Numpad 8 (up arrow)
  '2': 's',   // Numpad 2 (down arrow)
  '4': 'w',   // Numpad 4 (left arrow)
  '6': 'e',   // Numpad 6 (right arrow)
  '7': 'nw',  // Numpad 7 (diagonal)
  '9': 'ne',  // Numpad 9 (diagonal)
  '1': 'sw',  // Numpad 1 (diagonal)
  '3': 'se',  // Numpad 3 (diagonal)
};

// Arrow keys (4-way fallback for convenience)
const arrowMap = {
  ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e',
};

document.addEventListener('keydown', (e) => {
  // Check arrow keys first
  if (arrowMap[e.key]) {
    ws.send(JSON.stringify({ type: 'direction', direction: arrowMap[e.key] }));
    e.preventDefault();
    return;
  }

  // Check numpad keys
  if (numpadMap[e.key]) {
    ws.send(JSON.stringify({ type: 'direction', direction: numpadMap[e.key] }));
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
