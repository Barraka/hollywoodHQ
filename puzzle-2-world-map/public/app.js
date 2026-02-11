// ── WebSocket connection ──
const ws = new WebSocket('ws://' + location.host);
let isMock = false;

const hLine = document.getElementById('crosshair-h');
const vLine = document.getElementById('crosshair-v');
const dot = document.getElementById('crosshair-dot');
const coordLon = document.getElementById('coord-lon');
const coordLat = document.getElementById('coord-lat');
const solvedOverlay = document.getElementById('solved-overlay');
const posDebug = document.getElementById('pos-debug');

// SVG coordinate space (from the world-map.svg viewBox)
const SVG_VIEW = { x: 30.767, y: 241.591, w: 784.077, h: 458.627 };

function positionToScreen(normX, normY) {
  // Convert normalized 0-1 to SVG coordinates
  const svgX = SVG_VIEW.x + normX * SVG_VIEW.w;
  const svgY = SVG_VIEW.y + normY * SVG_VIEW.h;

  // Convert SVG coordinates to screen pixels using the SVG element's transform
  const svgEl = document.querySelector('#map-container svg');
  if (!svgEl) return { x: 0, y: 0 };

  const pt = svgEl.createSVGPoint();
  pt.x = svgX;
  pt.y = svgY;
  const screenPt = pt.matrixTransform(svgEl.getScreenCTM());
  return { x: screenPt.x, y: screenPt.y };
}

function updateCrosshair(normX, normY) {
  const { x, y } = positionToScreen(normX, normY);

  hLine.style.top = y + 'px';
  vLine.style.left = x + 'px';
  dot.style.top = y + 'px';
  dot.style.left = x + 'px';

  // Fake coordinates display
  const lon = (normX * 360 - 180).toFixed(3);
  const lat = (90 - normY * 180).toFixed(3);
  coordLon.textContent = 'LON ' + lon + '\u00B0';
  coordLat.textContent = 'LAT ' + lat + '\u00B0';

  posDebug.innerHTML = 'X: ' + normX.toFixed(3) + '<br>Y: ' + normY.toFixed(3);
}

// ── WebSocket messages ──
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'config') {
    isMock = msg.mock;
    if (isMock) {
      document.getElementById('mock-hint').style.display = 'block';
    }
  }

  if (msg.type === 'state' || msg.type === 'position') {
    updateCrosshair(msg.x, msg.y);
    if (msg.solved) showSolved();
  }

  if (msg.type === 'holdProgress') {
    updateHoldIndicator(msg.progress);
  }

  if (msg.type === 'solved') {
    showSolved();
  }

  if (msg.type === 'reset') {
    hideSolved();
    updateCrosshair(msg.x, msg.y);
  }

  if (msg.type === 'beep' && isMock) {
    playBeepInBrowser(msg.axis);
  }

  if (msg.type === 'hackMode' && typeof HackGlitch !== 'undefined') {
    HackGlitch.activate();
  }

  if (msg.type === 'hackResolved' && typeof HackGlitch !== 'undefined') {
    HackGlitch.deactivate();
  }
};

ws.onclose = () => {
  console.log('[ws] Disconnected — retrying in 2s');
  setTimeout(() => location.reload(), 2000);
};

// ── Mock keyboard input ──
document.addEventListener('keydown', (e) => {
  if (!isMock || ws.readyState !== 1) return;

  const keyMap = {
    'ArrowLeft':  { axis: 'x', direction: -1 },
    'ArrowRight': { axis: 'x', direction:  1 },
    'ArrowUp':    { axis: 'y', direction: -1 },
    'ArrowDown':  { axis: 'y', direction:  1 },
    'a':          { axis: 'x', direction: -1 },
    'd':          { axis: 'x', direction:  1 },
    'w':          { axis: 'y', direction: -1 },
    's':          { axis: 'y', direction:  1 },
  };

  const action = keyMap[e.key];
  if (action) {
    e.preventDefault();
    ws.send(JSON.stringify({ type: 'key', ...action }));
  }

  // R = reset
  if (e.key === 'r') ws.send(JSON.stringify({ type: 'reset' }));
});

// ── Hold progress indicator ──
function updateHoldIndicator(progress) {
  const ring = document.getElementById('hold-ring');
  if (!ring) return;

  if (progress > 0) {
    ring.style.display = 'block';
    ring.style.background = 'conic-gradient(rgba(0, 255, 100, 0.6) ' +
      (progress * 360) + 'deg, transparent 0deg)';
  } else {
    ring.style.display = 'none';
  }
}

// ── Solved state ──
function showSolved() {
  if (solvedOverlay) solvedOverlay.style.display = 'flex';
}

function hideSolved() {
  if (solvedOverlay) solvedOverlay.style.display = 'none';
}

// ── Browser audio for mock mode ──
let audioCtx;
function playBeepInBrowser(axis) {
  if (!audioCtx) audioCtx = new AudioContext();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const panner = audioCtx.createStereoPanner();

  osc.frequency.value = 800;
  osc.type = 'sine';
  gain.gain.value = 0.3;
  panner.pan.value = axis === 'x' ? -1 : 1; // L for X, R for Y

  osc.connect(gain).connect(panner).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.06);
}

// ── Load SVG inline ──
fetch('world-map.svg')
  .then(r => r.text())
  .then(svg => {
    document.getElementById('map-container').innerHTML = svg;
    // Re-add city dots from POC (stored in a data attribute or hardcoded)
    addCityDots();
  });

function addCityDots() {
  const svgEl = document.querySelector('#map-container svg');
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
  dots.forEach(([cx, cy], i) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', '2.5');
    circle.setAttribute('class', 'city-dot-svg');
    circle.style.setProperty('--d', (0.1 + (i * 0.37) % 1.9).toFixed(1) + 's');
    g.appendChild(circle);
  });
  svgEl.appendChild(g);
}

// ── Scrolling Data Feed ──
function generateFeedData() {
  const templates = [
    () => 'SIG/' + (Math.random()*999|0).toString().padStart(3,'0') + ' FREQ ' + (30+Math.random()*70).toFixed(2) + ' MHz',
    () => 'NŒUD ' + String.fromCharCode(65+Math.random()*26|0) + '-' + (Math.random()*99|0).toString().padStart(2,'0') + ' ACTIF',
    () => 'LAT ' + (-60+Math.random()*140).toFixed(3) + ' LON ' + (-170+Math.random()*340).toFixed(3),
    () => 'INTERCEPTION #' + (1000+Math.random()*9000|0) + ' ENREGISTRÉE',
    () => 'PKT ' + (Math.random()*0xFFFF|0).toString(16).toUpperCase().padStart(4,'0') + ' >> DÉCRYPT',
    () => 'SCAN SECTEUR ' + (Math.random()*360|0) + '\u00B0 RAS',
    () => 'LIAISON ' + (Math.random()*100).toFixed(1) + '% INTÉGRITÉ',
    () => '[ ' + new Date(Date.now() - Math.random()*86400000).toISOString().slice(11,19) + ' UTC ]',
    () => 'TRACE RTT ' + (10+Math.random()*200|0) + 'ms via ' + ['SAT-7','SOL-12','SAT-3','RELAIS-9'][Math.random()*4|0],
    () => 'AUTH TOKEN ' + Array.from({length:8},()=>(Math.random()*16|0).toString(16)).join('').toUpperCase(),
    () => 'CANAL ' + (Math.random()*128|0) + ' CHIFFRÉ AES-256',
    () => 'AGENT ' + ['AIGLE','FAUCON','CONDOR','PHOENIX','VIPÈRE','FANTÔME'][Math.random()*6|0] + ' STATUT : NOMINAL',
    () => 'PRIORITÉ : ' + ['BASSE','MOYENNE','HAUTE','CRITIQUE'][Math.random()*4|0],
    () => 'BANDE PASSANTE ' + (1+Math.random()*50).toFixed(1) + ' Gbps',
    () => 'PASSAGE SAT DANS ' + (Math.random()*60|0) + 'm ' + (Math.random()*60|0) + 's',
    () => 'VÉRIF CHIFFR .......... OK',
    () => '--- FIN BLOC ' + (Math.random()*9999|0).toString().padStart(4,'0') + ' ---',
  ];

  const feedInner = document.getElementById('data-feed-inner');
  let lines = '';
  for (let i = 0; i < 200; i++) {
    const template = templates[Math.random() * templates.length | 0];
    const isHighlight = Math.random() < 0.15;
    lines += '<div class="feed-line' + (isHighlight ? ' highlight' : '') + '">' + template() + '</div>';
  }
  feedInner.innerHTML = lines + lines;
}
generateFeedData();

// ── Screen Glitch ──
const glitchEl = document.getElementById('glitch-overlay');
function triggerGlitch() {
  glitchEl.classList.remove('active');
  void glitchEl.offsetWidth;
  glitchEl.classList.add('active');
  glitchEl.addEventListener('animationend', () => glitchEl.classList.remove('active'), { once: true });
  setTimeout(triggerGlitch, 8000 + Math.random() * 17000);
}
setTimeout(triggerGlitch, 3000 + Math.random() * 5000);

// ── Typing Status Messages ──
const statusMsgs = [
  'BALAYAGE DES FRÉQUENCES...', 'DÉCRYPTAGE DU SIGNAL...', 'EN ATTENTE DE VERROUILLAGE...',
  'TRIANGULATION DE LA POSITION...', 'LIAISON SATELLITE ACTIVE...', 'ANALYSE DES INTERCEPTIONS...',
  'ROUTAGE VIA PROXY...', 'VÉRIFICATION DES IDENTIFIANTS...', 'SURVEILLANCE DES CANAUX...',
  'ACQUISITION DU SIGNAL EN COURS...', 'RECOUPEMENT BASE DE DONNÉES...', 'LIAISON SÉCURISÉE ÉTABLIE...',
];

const statusTextEl = document.getElementById('status-text');
let sMsgIdx = 0;

function typeMsg(msg, i) {
  if (i <= msg.length) {
    statusTextEl.textContent = msg.slice(0, i);
    setTimeout(() => typeMsg(msg, i + 1), 40 + Math.random() * 30);
  } else {
    setTimeout(() => eraseMsg(msg, msg.length), 3000 + Math.random() * 2000);
  }
}

function eraseMsg(msg, i) {
  if (i >= 0) {
    statusTextEl.textContent = msg.slice(0, i);
    setTimeout(() => eraseMsg(msg, i - 1), 15);
  } else {
    sMsgIdx = (sMsgIdx + 1) % statusMsgs.length;
    setTimeout(() => typeMsg(statusMsgs[sMsgIdx], 0), 500);
  }
}

typeMsg(statusMsgs[0], 0);
