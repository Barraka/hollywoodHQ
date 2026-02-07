const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const config = require('../config');
const Joystick = require('./joystick');
const PuzzleLogic = require('./puzzleLogic');

const isMock = process.argv.includes('--mock');
if (isMock) console.log('[server] Running in MOCK mode');

const joystick = new Joystick(isMock);
const puzzle = new PuzzleLogic(joystick);

// --- HTTP server ---
const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

const publicDir = path.join(__dirname, '..', 'public');

const httpServer = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = filePath.split('?')[0];
  filePath = path.join(publicDir, decodeURIComponent(filePath));

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

// --- Mock mode ---
if (isMock) {
  console.log('[server] Mock mode: puzzle will auto-activate when client sends "ready"');
}

// --- Start ---
httpServer.listen(config.httpPort, () => {
  console.log('[server] http://localhost:' + config.httpPort);
  console.log('[puzzle5] Path:', config.path.map(c => c.name).join(' → '));
  console.log('[puzzle5] Directions:', config.directions.join(', '));
});

process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...');
  joystick.destroy();
  httpServer.close();
  process.exit(0);
});
