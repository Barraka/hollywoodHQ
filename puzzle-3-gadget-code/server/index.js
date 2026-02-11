const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const config = require('../config');
const LEDs = require('./leds');
const Keypad = require('./keypad');
const PuzzleLogic = require('./puzzleLogic');
const RoomControllerClient = require('../../shared/roomController');

// --- Detect mock mode ---
const isMock = process.argv.includes('--mock');
if (isMock) console.log('[server] Running in MOCK mode');

// --- Initialize modules ---
const leds = new LEDs(isMock);
const keypad = new Keypad(isMock);
const puzzle = new PuzzleLogic(leds);

// --- Wire GPIO keypad events directly to puzzle logic ---
keypad.on('keypress', (key) => {
  if (key >= '0' && key <= '9') {
    puzzle.digitPressed(key);
  } else if (key === '#') {
    puzzle.submitCode();
  } else if (key === '*') {
    puzzle.clearCode();
  }
});

// --- HTTP server (serves frontend + video files) ---
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

  // For video files, support range requests (needed for <video> seeking)
  if (ext === '.mp4' || ext === '.webm') {
    fs.stat(filePath, (err, stat) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mime,
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': stat.size,
          'Content-Type': mime,
        });
        fs.createReadStream(filePath).pipe(res);
      }
    });
    return;
  }

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

  // Send config with full video manifest for preloading
  const videoManifest = [
    ...config.situations.map(s => s.video),
    config.videos.intro,
    config.videos.correct,
    config.videos.wrong,
    config.videos.solved,
    config.videos.idle,
  ];
  ws.send(JSON.stringify({ type: 'config', mock: isMock, videos: videoManifest }));

  // Send current state
  ws.send(JSON.stringify({ type: 'state', ...puzzle.getState() }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'clipEnded':
        // A video clip finished playing in the browser
        puzzle.clipEnded(msg.clipId);
        break;

      case 'situationClipEnded':
        // A situation description clip finished
        puzzle.situationClipEnded();
        break;

      case 'digit':
        // Numpad digit pressed (from browser keyboard events)
        puzzle.digitPressed(msg.digit);
        break;

      case 'submit':
        // Enter key pressed
        puzzle.submitCode();
        break;

      case 'delete':
        // Backspace pressed
        puzzle.deleteDigit();
        break;

      case 'clear':
        // Escape pressed
        puzzle.clearCode();
        break;

      case 'ready':
        // Client signals audio unlocked + videos preloaded
        // In mock mode, auto-activate the puzzle
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
puzzle.on('playClip', (filename, clipId) => {
  broadcast({ type: 'playClip', filename, clipId });
});

puzzle.on('showIdle', (situationIndex) => {
  broadcast({ type: 'showIdle', situationIndex });
});

puzzle.on('codeProgress', (entered, total) => {
  broadcast({ type: 'codeProgress', entered, total });
});

puzzle.on('codeResult', (correct, code) => {
  broadcast({ type: 'codeResult', correct, code });
});

puzzle.on('stateChange', (state) => {
  broadcast({ type: 'state', ...state });
});

// --- Auto-activate in mock mode ---
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
    progress: state.currentSituation / config.situations.length
  });
});

rc.connect();

// --- Start ---
httpServer.listen(config.httpPort, () => {
  console.log('[server] http://localhost:' + config.httpPort);
  console.log('[puzzle3] Situations:', config.situations.length);
  console.log('[puzzle3] Codes:', config.situations.map((s, i) => `S${i + 1}=${s.correctCode}`).join(', '));
});

// --- Graceful shutdown ---
process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...');
  rc.disconnect();
  leds.destroy();
  keypad.destroy();
  httpServer.close();
  process.exit(0);
});
