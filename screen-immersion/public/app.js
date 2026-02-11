// ── WebSocket ──
const ws = new WebSocket(`ws://${location.host}`);
let isMock = false;

// ── DOM refs ──
const startOverlay = document.getElementById('start-overlay');
const mockControls = document.getElementById('mock-controls');
const radarCanvas = document.getElementById('radar-canvas');
const hexFeed = document.getElementById('hex-feed');
const commFeed = document.getElementById('comm-feed');
const clockEl = document.getElementById('clock');

// Status bars
const bars = {
  cpu: { fill: document.getElementById('bar-cpu'), val: document.getElementById('val-cpu'), base: 45 },
  mem: { fill: document.getElementById('bar-mem'), val: document.getElementById('val-mem'), base: 62 },
  net: { fill: document.getElementById('bar-net'), val: document.getElementById('val-net'), base: 30 },
  enc: { fill: document.getElementById('bar-enc'), val: document.getElementById('val-enc'), base: 88 },
};

// ── Spy comm phrases ──
const SPY_PHRASES = [
  'AGENT BRAVO : Cible acquise, en route vers point d\'extraction',
  'QG : Passage satellite dans T-moins 4 minutes',
  'OPS TERRAIN : Périmètre sécurisé, aucun hostile détecté',
  'SIGINT : Transmission chiffrée interceptée à 14.221 MHz',
  'SURVEILLANCE : Deux inconnus entrant secteur 7-Charlie',
  'AGENT DELTA : Colis sécurisé, en route vers point Alpha',
  'OPS TECH : Tentative d\'intrusion pare-feu, contre-mesures actives',
  'QG : Toutes les unités en attente, transmission priorité alpha',
  'RECON : Drone de surveillance déployé sur zone cible',
  'AGENT FOXTROT : Couverture compromise, repli en cours',
  'COMMS : Saut de fréquence terminé, canal sécurisé',
  'TACTIQUE : Signatures thermiques détectées, 3 tangos au RDC',
  'QG : Fenêtre d\'extraction se ferme dans 12 minutes',
  'SIGINT : Décryptage à 78%, 90 secondes estimées avant texte clair',
  'SURVEILLANCE : Convoi approchant par l\'est, 4 véhicules',
  'AGENT ECHO : En position, en attente du feu vert',
  'OPS TECH : Liaison satellite rétablie, bande passante nominale',
  'OPS TERRAIN : Rotation de la garde dans 6 min, fenêtre serrée',
  'QG : Code d\'autorisation TANGO-WHISKEY-NINER confirmé',
  'RECON : Cible déplacée vers site secondaire, MAJ coordonnées',
  'AGENT SIERRA : Boîte morte récupérée au checkpoint Bravo',
  'COMMS : Transmission burst interceptée, origine inconnue',
  'TACTIQUE : Balayage infrarouge RAS, procédez vers objectif',
  'QG : Chrono mission en cours, toutes équipes signaler statut',
  'SIGINT : Correspondance vocale confirmée, confiance 97.3%',
];

let commIndex = 0;

// ── Radar state ──
const ctx = radarCanvas.getContext('2d');
let radarAngle = 0;
const radarBlips = [];
const RADAR_SWEEP_SPEED = (Math.PI * 2) / 4; // Full rotation in 4 seconds

// ── Animation state ──
let running = false;
let lastTime = 0;
let hexTimer = 0;
let commTimer = 0;
let statusTimer = 0;
let blipTimer = 0;

// ══════════════════════════════════════════════
//  WebSocket
// ══════════════════════════════════════════════

ws.onopen = () => console.log('[ws] Connected');
ws.onclose = () => console.log('[ws] Disconnected');

ws.onmessage = (e) => {
  let msg;
  try { msg = JSON.parse(e.data); } catch { return; }

  switch (msg.type) {
    case 'config':
      isMock = msg.mock;
      if (isMock) mockControls.classList.add('visible');
      break;

    case 'hackMode':
      if (typeof HackGlitch !== 'undefined') HackGlitch.activate();
      break;

    case 'hackResolved':
      if (typeof HackGlitch !== 'undefined') HackGlitch.deactivate();
      break;

    case 'reset':
      if (typeof HackGlitch !== 'undefined') HackGlitch.deactivate();
      break;
  }
};

// ══════════════════════════════════════════════
//  Start overlay
// ══════════════════════════════════════════════

function dismissStart() {
  if (startOverlay.classList.contains('hidden')) return;
  startOverlay.classList.add('hidden');
  ws.send(JSON.stringify({ type: 'ready' }));
  startAnimations();
}

startOverlay.addEventListener('click', dismissStart);
document.addEventListener('keydown', (e) => {
  if (!startOverlay.classList.contains('hidden')) {
    dismissStart();
    return;
  }

  // Mock keyboard controls
  if (!isMock) return;
  switch (e.key.toLowerCase()) {
    case 'h':
      if (typeof HackGlitch !== 'undefined') HackGlitch.activate();
      break;
    case 'n':
      if (typeof HackGlitch !== 'undefined') HackGlitch.deactivate();
      break;
  }
});

// ══════════════════════════════════════════════
//  Clock
// ══════════════════════════════════════════════

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  clockEl.textContent = h + ':' + m + ':' + s;
}

setInterval(updateClock, 1000);
updateClock();

// ══════════════════════════════════════════════
//  Radar
// ══════════════════════════════════════════════

function resizeRadar() {
  const parent = radarCanvas.parentElement;
  radarCanvas.width = parent.clientWidth;
  radarCanvas.height = parent.clientHeight;
}

function drawRadar(dt) {
  const w = radarCanvas.width;
  const h = radarCanvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) - 8;

  ctx.clearRect(0, 0, w, h);

  // Dark background circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 15, 10, 0.6)';
  ctx.fill();

  // Concentric rings
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * (i / 4), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 220, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Cross grid lines
  ctx.strokeStyle = 'rgba(0, 220, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  // Diagonal lines
  const d = r * 0.707;
  ctx.moveTo(cx - d, cy - d);
  ctx.lineTo(cx + d, cy + d);
  ctx.moveTo(cx + d, cy - d);
  ctx.lineTo(cx - d, cy + d);
  ctx.stroke();

  // Sweep gradient (trailing glow behind the line)
  const sweepGrad = ctx.createConicalGradient
    ? null // Not widely supported, use manual arc fill
    : null;

  // Draw sweep trail (a filled arc behind the sweep line)
  const trailAngle = Math.PI * 0.4; // 72-degree trail
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, radarAngle - trailAngle, radarAngle);
  ctx.closePath();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(0, 220, 255, 0.12)');
  grad.addColorStop(0.7, 'rgba(0, 220, 255, 0.04)');
  grad.addColorStop(1, 'rgba(0, 220, 255, 0.01)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Sweep line
  const sx = cx + Math.cos(radarAngle) * r;
  const sy = cy + Math.sin(radarAngle) * r;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(sx, sy);
  ctx.strokeStyle = 'rgba(0, 220, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Bright dot at end of sweep
  ctx.beginPath();
  ctx.arc(sx, sy, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 220, 255, 0.9)';
  ctx.fill();

  // Blips
  for (let i = radarBlips.length - 1; i >= 0; i--) {
    const blip = radarBlips[i];
    blip.age += dt;
    if (blip.age > blip.lifetime) {
      radarBlips.splice(i, 1);
      continue;
    }
    const alpha = 1 - (blip.age / blip.lifetime);
    const bx = cx + Math.cos(blip.angle) * blip.dist * r;
    const by = cy + Math.sin(blip.angle) * blip.dist * r;

    // Outer glow
    ctx.beginPath();
    ctx.arc(bx, by, 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 220, 255, ${alpha * 0.15})`;
    ctx.fill();

    // Inner dot
    ctx.beginPath();
    ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 255, 180, ${alpha * 0.9})`;
    ctx.fill();
  }

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 220, 255, 0.6)';
  ctx.fill();

  // Outer ring (border)
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 220, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Advance sweep angle
  radarAngle += RADAR_SWEEP_SPEED * dt;
  if (radarAngle > Math.PI * 2) radarAngle -= Math.PI * 2;
}

function spawnBlip() {
  radarBlips.push({
    angle: Math.random() * Math.PI * 2,
    dist: 0.15 + Math.random() * 0.8,
    age: 0,
    lifetime: 3 + Math.random() * 1.5, // 3-4.5 seconds
  });
}

// ══════════════════════════════════════════════
//  System status bars
// ══════════════════════════════════════════════

function updateStatusBars() {
  for (const key of Object.keys(bars)) {
    const bar = bars[key];
    // Fluctuate around the base value
    const fluctuation = (Math.random() - 0.5) * 20;
    let val = Math.round(bar.base + fluctuation);
    val = Math.max(5, Math.min(98, val));
    bar.base = bar.base * 0.9 + val * 0.1; // Smooth drift

    bar.fill.style.width = val + '%';
    bar.val.textContent = val + '%';

    // Color thresholds
    bar.fill.classList.remove('warning', 'critical');
    if (val > 85) {
      bar.fill.classList.add('critical');
    } else if (val > 70) {
      bar.fill.classList.add('warning');
    }
  }
}

// ══════════════════════════════════════════════
//  Hex data feed
// ══════════════════════════════════════════════

function randomHex(length) {
  let s = '';
  const chars = '0123456789ABCDEF';
  for (let i = 0; i < length; i++) {
    s += chars[Math.floor(Math.random() * 16)];
    if (i % 2 === 1 && i < length - 1) s += ' ';
  }
  return s;
}

function addHexLine() {
  const addr = randomHex(4).replace(/ /g, '');
  const data = randomHex(24);
  const line = document.createElement('div');
  line.className = 'hex-line new';
  line.textContent = '0x' + addr + '  ' + data;

  hexFeed.appendChild(line);

  // Fade after appearing
  setTimeout(() => line.classList.remove('new'), 600);

  // Keep max ~40 lines
  while (hexFeed.children.length > 40) {
    hexFeed.removeChild(hexFeed.firstChild);
  }
}

// ══════════════════════════════════════════════
//  Comm monitor
// ══════════════════════════════════════════════

function addCommMessage() {
  const phrase = SPY_PHRASES[commIndex % SPY_PHRASES.length];
  commIndex++;

  const now = new Date();
  const ts = String(now.getHours()).padStart(2, '0') + ':' +
             String(now.getMinutes()).padStart(2, '0') + ':' +
             String(now.getSeconds()).padStart(2, '0');

  const line = document.createElement('div');
  line.className = 'comm-line new';
  line.innerHTML = '<span class="comm-time">[' + ts + ']</span>' + escapeHtml(phrase);

  commFeed.appendChild(line);

  // Fade after appearing
  setTimeout(() => line.classList.remove('new'), 1500);

  // Keep max ~20 lines
  while (commFeed.children.length > 20) {
    commFeed.removeChild(commFeed.firstChild);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ══════════════════════════════════════════════
//  Main animation loop
// ══════════════════════════════════════════════

function startAnimations() {
  if (running) return;
  running = true;
  resizeRadar();
  window.addEventListener('resize', resizeRadar);
  lastTime = performance.now();

  // Seed initial data
  for (let i = 0; i < 15; i++) addHexLine();
  for (let i = 0; i < 5; i++) addCommMessage();
  for (let i = 0; i < 3; i++) spawnBlip();
  updateStatusBars();

  requestAnimationFrame(tick);
}

function tick(now) {
  if (!running) return;
  const dt = Math.min((now - lastTime) / 1000, 0.1); // delta in seconds, capped
  lastTime = now;

  // Radar
  drawRadar(dt);

  // Hex feed (~200ms interval)
  hexTimer += dt;
  if (hexTimer >= 0.2) {
    hexTimer -= 0.2;
    addHexLine();
  }

  // Comm messages (~4-6s interval)
  commTimer += dt;
  const commInterval = 4 + Math.random() * 2;
  if (commTimer >= commInterval) {
    commTimer = 0;
    addCommMessage();
  }

  // Status bars (~1.5s interval)
  statusTimer += dt;
  if (statusTimer >= 1.5) {
    statusTimer = 0;
    updateStatusBars();
  }

  // Blip spawning (~1-2s interval)
  blipTimer += dt;
  if (blipTimer >= 1 + Math.random()) {
    blipTimer = 0;
    spawnBlip();
  }

  requestAnimationFrame(tick);
}
