const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const config = require('../config');
const Encoders = require('./encoders');
const Audio = require('./audio');
const PuzzleLogic = require('./puzzleLogic');

// --- Detect mock mode ---
const isMock = process.argv.includes('--mock');
if (isMock) console.log('[server] Running in MOCK mode (keyboard input, browser audio)');

// --- Initialize modules ---
const encoders = new Encoders(isMock);
const audio = new Audio(isMock);
const puzzle = new PuzzleLogic(encoders, audio);

// --- HTTP server (serves frontend) ---
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const publicDir = path.join(__dirname, '..', 'public');

const httpServer = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(publicDir, filePath);

  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

// --- WebSocket server (same port, upgrades HTTP) ---
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

  // Send current state immediately
  ws.send(JSON.stringify({ type: 'state', ...puzzle.getState() }));
  ws.send(JSON.stringify({ type: 'config', mock: isMock }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // In mock mode, accept keyboard input from the browser
    if (msg.type === 'key' && isMock) {
      const { axis, direction } = msg;
      if ((axis === 'x' || axis === 'y') && (direction === 1 || direction === -1)) {
        encoders.simulateTurn(axis, direction);
      }
    }

    // GM commands
    if (msg.type === 'reset') puzzle.reset();
    if (msg.type === 'forceSolve') puzzle.forceSolve();
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('[ws] Client disconnected (' + clients.size + ' total)');
  });
});

// --- Wire puzzle events to WebSocket ---
puzzle.on('position', (pos) => {
  broadcast({ type: 'position', x: pos.x, y: pos.y });
});

puzzle.on('holdProgress', (progress) => {
  broadcast({ type: 'holdProgress', progress });
});

puzzle.on('solved', () => {
  broadcast({ type: 'solved' });
});

puzzle.on('reset', () => {
  broadcast({ type: 'reset', ...puzzle.getState() });
});

// In mock mode, send beep events to browser for Web Audio playback
if (isMock) {
  audio.onBeep = (axis) => {
    broadcast({ type: 'beep', axis });
  };
}

// --- Room Controller connection (optional) ---
if (config.roomControllerUrl) {
  // TODO: Connect to Room Controller WebSocket
  // Report online status, listen for force_solve/reset commands
  console.log('[rc] Room Controller integration not yet implemented');
}

// --- Start ---
httpServer.listen(config.httpPort, () => {
  console.log('[server] http://localhost:' + config.httpPort);
  console.log('[puzzle] Target: (' + config.targetX + ', ' + config.targetY + ') tolerance: ' + config.tolerance);
});

// --- Graceful shutdown ---
process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...');
  encoders.destroy();
  audio.destroy();
  httpServer.close();
  process.exit(0);
});
