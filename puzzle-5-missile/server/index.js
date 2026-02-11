const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const config = require('../config');
const Joystick = require('./joystick');
const PuzzleLogic = require('./puzzleLogic');
const RoomControllerClient = require('../../shared/roomController');

const isMock = process.argv.includes('--mock');
if (isMock) console.log('[server] Running in MOCK mode');

const joystick = new Joystick(isMock);
const puzzle = new PuzzleLogic(joystick);

// --- HTTP server ---
const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
};

const publicDir = path.join(__dirname, '..', 'public');
const sharedBrowserDir = path.join(__dirname, '..', '..', 'shared', 'browser');

const httpServer = http.createServer((req, res) => {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  urlPath = urlPath.split('?')[0];

  let filePath;
  if (urlPath.startsWith('/shared/')) {
    filePath = path.join(sharedBrowserDir, decodeURIComponent(urlPath.slice(8)));
  } else {
    filePath = path.join(publicDir, decodeURIComponent(urlPath));
  }

  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

// --- WebSocket server ---
const wss = new WebSocketServer({ server: httpServer });
const clients = new Set();

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(data);
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('[ws] Client connected (' + clients.size + ' total)');

  // If this is the first client connecting, ensure puzzle is in fresh inactive state
  if (clients.size === 1) {
    puzzle.reset();
  }

  ws.send(JSON.stringify({ type: 'config', mock: isMock }));
  ws.send(JSON.stringify({ type: 'state', ...puzzle.getState() }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'direction':
        if (isMock) joystick.simulateDirection(msg.direction);
        break;

      case 'forwardAnimDone':
        puzzle.forwardAnimDone();
        break;

      case 'ready':
        if (isMock && puzzle.getState().state === 'inactive') {
          console.log('[server] Client ready, auto-activating puzzle');
          puzzle.activate();
        }
        break;

      case 'activate':
        puzzle.activate();
        break;

      case 'reset':
        puzzle.reset();
        break;

      case 'forceSolve':
        puzzle.forceSolve();
        break;

      case 'resumeAfterTimeout':
        puzzle.resumeAfterTimeout();
        break;

      case 'detonate':
        puzzle.detonate();
        break;
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('[ws] Client disconnected (' + clients.size + ' total)');
  });
});

// --- Wire puzzle events ---
puzzle.on('forwardAnimation', (path, directions, duration) => {
  broadcast({ type: 'forwardAnimation', path, directions, duration });
});

puzzle.on('correctInput', (dir, fromIndex, toIndex, duration) => {
  broadcast({ type: 'correctInput', dir, fromIndex, toIndex, duration });
});

puzzle.on('wrongInput', (dir, expected) => {
  broadcast({ type: 'wrongInput', dir, expected });
});

puzzle.on('stateChange', (state) => {
  broadcast({ type: 'state', ...state });
});

puzzle.on('timerUpdate', (timeRemaining) => {
  broadcast({ type: 'timerUpdate', timeRemaining });
});

puzzle.on('timeout', () => {
  broadcast({ type: 'timeout' });
});

// --- Mock mode ---
if (isMock) {
  console.log('[server] Mock mode: puzzle will auto-activate when client sends "ready"');
}

// --- Explosion button (GPIO 12) ---
let explosionButton = null;
if (!isMock) {
  try {
    const Gpio = require('onoff').Gpio;
    explosionButton = new Gpio(config.explosionButtonPin, 'in', 'falling', { debounceTimeout: 50 });
    explosionButton.watch((err) => {
      if (err) { console.error('[gpio] Explosion button error:', err); return; }
      console.log('[gpio] Explosion button pressed');
      puzzle.detonate();
    });
    console.log('[gpio] Explosion button on GPIO', config.explosionButtonPin);
  } catch (e) {
    console.warn('[gpio] Explosion button unavailable:', e.message);
  }
}

// --- Room Controller integration ---
const rc = new RoomControllerClient(config.roomControllerUrl, config.propId);

rc.on('command', (cmd) => {
  console.log('[rc] Executing command:', cmd.command);

  try {
    switch (cmd.command) {
      case 'force_solve':
        puzzle.forceSolve();
        rc.sendAck(cmd.requestId, true);
        break;

      case 'reset':
        puzzle.reset();
        rc.sendAck(cmd.requestId, true);
        break;

      case 'hack_mode':
        broadcast({ type: 'hackMode' });
        rc.sendAck(cmd.requestId, true);
        break;

      case 'hack_resolved':
        broadcast({ type: 'hackResolved' });
        rc.sendAck(cmd.requestId, true);
        break;

      default:
        console.log('[rc] Unknown command:', cmd.command);
        rc.sendAck(cmd.requestId, false, 'Unknown command');
    }
  } catch (err) {
    console.error('[rc] Command failed:', err);
    rc.sendAck(cmd.requestId, false, err.message);
  }
});

// Wire puzzle state changes to Room Controller
puzzle.on('stateChange', (state) => {
  rc.updateState({
    state: state.state,
    progress: state.totalLegs > 0 ? state.reverseLeg / state.totalLegs : 0
  });
});

rc.connect();

// --- Start ---
httpServer.listen(config.httpPort, () => {
  console.log('[server] http://localhost:' + config.httpPort);
  console.log('[puzzle5] Path:', config.path.map(c => c.name).join(' → '));
  console.log('[puzzle5] Directions:', config.directions.join(', '));
});

process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...');
  rc.disconnect();
  joystick.destroy();
  if (explosionButton) explosionButton.unexport();
  httpServer.close();
  process.exit(0);
});
