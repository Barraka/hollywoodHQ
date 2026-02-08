const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const config = require('../config');
const Buttons = require('./buttons');
const Levers = require('./levers');
const PuzzleLogic = require('./puzzleLogic');

// --- Detect mock mode ---
const isMock = process.argv.includes('--mock');
if (isMock) console.log('[server] Running in MOCK mode');

// --- Initialize modules ---
const buttons = new Buttons(isMock);
const levers = new Levers(isMock);
const puzzle = new PuzzleLogic();

// Wire buttons to puzzle
buttons.on('navigate', (dir) => puzzle.navigate(dir));
buttons.on('validate', () => puzzle.validate());

// Wire levers to puzzle
levers.on('leversChanged', (positions) => {
  puzzle.setLevers(positions);
});

// Initialize levers GPIO
const leverConfig = config.leverPins.map(posMap => ({ positions: posMap }));
levers.init(leverConfig);

// --- HTTP server ---
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const publicDir = path.join(__dirname, '..', 'public');

const httpServer = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = filePath.split('?')[0];
  filePath = path.join(publicDir, decodeURIComponent(filePath));

  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  // Range requests for video
  if (ext === '.mp4' || ext === '.webm') {
    fs.stat(filePath, (err, stat) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': mime,
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': mime });
        fs.createReadStream(filePath).pipe(res);
      }
    });
    return;
  }

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

  // Send video manifest for preloading
  const videoManifest = config.vehicles.map(v => v.video);
  ws.send(JSON.stringify({ type: 'config', mock: isMock, videos: videoManifest }));

  // Send current state
  ws.send(JSON.stringify({ type: 'state', ...puzzle.getState() }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      // Mock input
      case 'navigate':
        if (isMock) buttons.simulateNavigate(msg.direction);
        break;

      case 'validate':
        if (isMock) buttons.simulateValidate();
        break;

      case 'leverAdjust':
        // Mock mode: simulate lever position change
        if (isMock) {
          const currentPositions = levers.getPositions();
          const newPos = (currentPositions[msg.lever] || 1) + msg.delta;
          // Clamp to 1-10
          const clampedPos = Math.max(1, Math.min(10, newPos));
          levers.setMockPosition(msg.lever, clampedPos);
        }
        break;

      case 'ready':
        if (isMock && puzzle.getState().state === 'inactive') {
          console.log('[server] Client ready, auto-activating puzzle');
          puzzle.activate();
        }
        break;

      // GM commands
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

// --- Wire puzzle events to WebSocket ---
puzzle.on('vehicleChanged', (index) => {
  const v = config.vehicles[index];
  broadcast({ type: 'vehicleChanged', index, name: v.name, video: v.video });
});

puzzle.on('leversChanged', (levers) => {
  broadcast({ type: 'leversChanged', levers });
});

puzzle.on('validateResult', (correct, vehicleName) => {
  broadcast({ type: 'validateResult', correct, vehicleName });
});

puzzle.on('stateChange', (state) => {
  broadcast({ type: 'state', ...state });
});

// --- Auto-activate in mock mode ---
if (isMock) {
  console.log('[server] Mock mode: puzzle will auto-activate when client sends "ready"');
}

// --- Room Controller ---
if (config.roomControllerUrl) {
  console.log('[rc] Room Controller integration not yet implemented');
}

// --- Start ---
httpServer.listen(config.httpPort, () => {
  console.log('[server] http://localhost:' + config.httpPort);
  console.log('[puzzle4] Vehicles:', config.vehicles.length);
  console.log('[puzzle4] Correct:', config.vehicles[config.correctVehicleIndex].name);
});

// --- Graceful shutdown ---
process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...');
  buttons.destroy();
  levers.destroy();
  httpServer.close();
  process.exit(0);
});
