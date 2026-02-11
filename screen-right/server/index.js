const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const config = require('../config');
const RoomControllerClient = require('../../shared/roomController');

// --- Detect mock mode ---
const isMock = process.argv.includes('--mock');
if (isMock) console.log('[server] Running in MOCK mode');

// --- Screen mode ---
// 'tim-ferris' | 'puzzle-3' | 'hack'
let currentMode = 'tim-ferris';
let modeBeforeHack = 'tim-ferris'; // Remember mode before hack for restoration

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
  // Strip query string
  urlPath = urlPath.split('?')[0];

  let filePath;

  // Route /shared/* to shared/browser/ directory
  if (urlPath.startsWith('/shared/')) {
    const relativePath = urlPath.slice('/shared/'.length);
    filePath = path.join(sharedBrowserDir, decodeURIComponent(relativePath));
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

  // Build Tim Ferris video manifest for preloading
  const tfVideos = Object.values(config.videos);

  // Send config with video manifest and puzzle 3 URL
  ws.send(JSON.stringify({
    type: 'config',
    mock: isMock,
    videos: tfVideos,
    puzzle3Url: config.puzzle3Url,
    mode: currentMode,
  }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'switchMode':
        // Mock control: toggle between tim-ferris and puzzle-3
        if (currentMode === 'hack') break; // Don't switch during hack
        currentMode = currentMode === 'tim-ferris' ? 'puzzle-3' : 'tim-ferris';
        console.log('[server] Mode switched to:', currentMode);
        broadcast({ type: 'modeChange', mode: currentMode });
        rc.updateState({ mode: currentMode });
        break;

      case 'setMode':
        // Explicit mode set
        if (msg.mode === 'tim-ferris' || msg.mode === 'puzzle-3') {
          currentMode = msg.mode;
          console.log('[server] Mode set to:', currentMode);
          broadcast({ type: 'modeChange', mode: currentMode });
          rc.updateState({ mode: currentMode });
        }
        break;

      case 'ready':
        // Client signals audio unlocked + videos preloaded
        console.log('[server] Client ready');
        break;
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('[ws] Client disconnected (' + clients.size + ' total)');
  });
});

// --- Room Controller integration ---
const rc = new RoomControllerClient(config.roomControllerUrl, config.propId);

rc.on('command', (cmd) => {
  console.log('[rc] Executing command:', cmd.command);

  try {
    switch (cmd.command) {
      case 'play_clip': {
        // Play a Tim Ferris clip by key name (e.g., 'intro', 'escape1', 'rescued')
        const clipKey = cmd.clip || cmd.payload?.clip;
        const filename = config.videos[clipKey];
        if (filename) {
          // Ensure we're in Tim Ferris mode
          if (currentMode !== 'tim-ferris' && currentMode !== 'hack') {
            currentMode = 'tim-ferris';
            broadcast({ type: 'modeChange', mode: currentMode });
          }
          broadcast({ type: 'playClip', filename, clipId: 'tf-' + clipKey });
          console.log('[rc] Playing Tim Ferris clip:', clipKey, '->', filename);
          rc.sendAck(cmd.requestId, true);
        } else {
          console.log('[rc] Unknown clip key:', clipKey);
          rc.sendAck(cmd.requestId, false, 'Unknown clip: ' + clipKey);
        }
        break;
      }

      case 'show_puzzle_3':
        currentMode = 'puzzle-3';
        modeBeforeHack = 'puzzle-3';
        console.log('[rc] Switching to Puzzle 3 mode');
        broadcast({ type: 'modeChange', mode: currentMode });
        rc.updateState({ mode: currentMode });
        rc.sendAck(cmd.requestId, true);
        break;

      case 'show_tim_ferris':
        currentMode = 'tim-ferris';
        modeBeforeHack = 'tim-ferris';
        console.log('[rc] Switching to Tim Ferris mode');
        broadcast({ type: 'modeChange', mode: currentMode });
        rc.updateState({ mode: currentMode });
        rc.sendAck(cmd.requestId, true);
        break;

      case 'hack_mode':
        modeBeforeHack = currentMode;
        currentMode = 'hack';
        console.log('[rc] Hack mode activated');
        broadcast({ type: 'hackMode' });
        rc.updateState({ mode: currentMode });
        rc.sendAck(cmd.requestId, true);
        break;

      case 'hack_resolved':
        currentMode = modeBeforeHack;
        console.log('[rc] Hack resolved, restoring mode:', currentMode);
        broadcast({ type: 'hackResolved' });
        broadcast({ type: 'modeChange', mode: currentMode });
        rc.updateState({ mode: currentMode });
        rc.sendAck(cmd.requestId, true);
        break;

      case 'reset':
        currentMode = 'tim-ferris';
        modeBeforeHack = 'tim-ferris';
        console.log('[rc] Reset');
        broadcast({ type: 'reset' });
        rc.updateState({ mode: currentMode });
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

rc.connect();

// --- Start ---
httpServer.listen(config.httpPort, () => {
  console.log('[server] http://localhost:' + config.httpPort);
  console.log('[screen-right] Mode:', currentMode);
  console.log('[screen-right] Puzzle 3 URL:', config.puzzle3Url);
  console.log('[screen-right] Tim Ferris videos:', Object.keys(config.videos).join(', '));
});

// --- Graceful shutdown ---
process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...');
  rc.disconnect();
  httpServer.close();
  process.exit(0);
});
