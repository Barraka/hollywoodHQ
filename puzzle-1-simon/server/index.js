const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const config = require('../config');
const ButtonManager = require('./buttons');
const PuzzleLogic = require('./puzzleLogic');
const RoomControllerClient = require('../../shared/roomController');

const isMock = process.argv.includes('--mock');
if (isMock) console.log('[server] Running in MOCK mode');

const buttonManager = new ButtonManager(isMock);
const puzzle = new PuzzleLogic(buttonManager);

// --- HTTP server ---
const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
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

  ws.send(JSON.stringify({ type: 'config', mock: isMock, buttons: config.buttons }));
  ws.send(JSON.stringify({ type: 'state', ...puzzle.getState() }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'buttonPress':
        if (isMock) buttonManager.simulatePress(msg.buttonId);
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
puzzle.on('correctPress', (buttonId) => {
  broadcast({ type: 'correctPress', buttonId });
});

puzzle.on('wrongPress', (buttonId) => {
  broadcast({ type: 'wrongPress', buttonId });
});

puzzle.on('buttonBlink', (buttonId, isLit) => {
  broadcast({ type: 'buttonBlink', buttonId, isLit });
});

puzzle.on('stateChange', (state) => {
  broadcast({ type: 'state', ...state });
});

// Mock LED changes
buttonManager.on('ledChange', (buttonId, state) => {
  broadcast({ type: 'ledChange', buttonId, state });
});

// --- Mock mode ---
if (isMock) {
  console.log('[server] Mock mode: puzzle will auto-activate when client sends "ready"');
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
        // Hack mode: activate puzzle (buttons start flashing) + show glitch overlay
        broadcast({ type: 'hackMode' });
        if (puzzle.getState().state === 'inactive') {
          puzzle.activate();
        }
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
  const update = {
    state: state.state,
    progress: state.pressedCount / config.buttons.length
  };

  // When puzzle is solved, signal hack resolved to all screens
  if (state.state === 'solved') {
    update.hackResolved = true;
    broadcast({ type: 'hackResolved' });
  }

  rc.updateState(update);
});

rc.connect();

// --- Start ---
httpServer.listen(config.httpPort, () => {
  console.log('[server] http://localhost:' + config.httpPort);
  console.log('[puzzle1] Buttons:', config.buttons.length);
});

process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...');
  rc.disconnect();
  buttonManager.destroy();
  httpServer.close();
  process.exit(0);
});
