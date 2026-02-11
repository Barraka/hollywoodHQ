const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const config = require('../config');
const RoomControllerClient = require('../../shared/roomController');

// --- Detect mock mode ---
const isMock = process.argv.includes('--mock');
if (isMock) console.log('[server] Running in MOCK mode');

// --- Screen state ---
let state = {
  mode: 'idle',       // 'idle' | 'clip' | 'hack'
  currentClip: null,
};

function setState(changes) {
  Object.assign(state, changes);
  broadcast({ type: 'state', ...state });
  rc.updateState({ mode: state.mode, currentClip: state.currentClip });
}

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
  let filePath = req.url === '/' ? '/index.html' : req.url;
  // Strip query string
  filePath = filePath.split('?')[0];

  // Serve shared browser files (e.g. /shared/glitch.js → ../../shared/browser/glitch.js)
  if (filePath.startsWith('/shared/')) {
    const sharedFile = filePath.replace('/shared/', '');
    filePath = path.join(sharedBrowserDir, decodeURIComponent(sharedFile));
  } else {
    filePath = path.join(publicDir, decodeURIComponent(filePath));
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
  const videoManifest = Object.values(config.videos);
  ws.send(JSON.stringify({ type: 'config', mock: isMock, videos: videoManifest }));

  // Send current state
  ws.send(JSON.stringify({ type: 'state', ...state }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'ready':
        // Client signals audio unlocked + videos preloaded
        console.log('[ws] Client ready');
        ws.send(JSON.stringify({ type: 'state', ...state }));
        break;

      case 'clipEnded':
        // A video clip finished playing in the browser
        console.log('[video] Clip ended:', msg.filename);
        setState({ mode: 'idle', currentClip: null });
        break;

      // --- Mock controls ---
      case 'activate':
        if (isMock) {
          console.log('[mock] Playing intro clip');
          setState({ mode: 'clip', currentClip: config.videos.intro });
          broadcast({ type: 'playClip', filename: config.videos.intro });
        }
        break;

      case 'hackMode':
        if (isMock) {
          console.log('[mock] Hack mode activated');
          setState({ mode: 'hack', currentClip: null });
          broadcast({ type: 'hackMode' });
        }
        break;

      case 'hackResolved':
        if (isMock) {
          console.log('[mock] Hack resolved');
          setState({ mode: 'idle', currentClip: null });
          broadcast({ type: 'hackResolved' });
        }
        break;

      case 'reset':
        console.log('[server] Reset');
        setState({ mode: 'idle', currentClip: null });
        broadcast({ type: 'reset' });
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
      case 'hack_mode':
        setState({ mode: 'hack', currentClip: null });
        broadcast({ type: 'hackMode' });
        rc.sendAck(cmd.requestId, true);
        break;

      case 'hack_resolved':
        setState({ mode: 'idle', currentClip: null });
        broadcast({ type: 'hackResolved' });
        rc.sendAck(cmd.requestId, true);
        break;

      case 'play_clip':
        if (cmd.filename) {
          setState({ mode: 'clip', currentClip: cmd.filename });
          broadcast({ type: 'playClip', filename: cmd.filename });
          rc.sendAck(cmd.requestId, true);
        } else {
          rc.sendAck(cmd.requestId, false, 'Missing filename');
        }
        break;

      case 'reset':
        setState({ mode: 'idle', currentClip: null });
        broadcast({ type: 'reset' });
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
  console.log('[screen-villain] Videos:', Object.keys(config.videos).join(', '));
});

// --- Graceful shutdown ---
process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...');
  rc.disconnect();
  httpServer.close();
  process.exit(0);
});
