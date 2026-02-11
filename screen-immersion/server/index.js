const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const config = require('../config');
const RoomControllerClient = require('../../shared/roomController');

const isMock = process.argv.includes('--mock');
if (isMock) console.log('[server] Running in MOCK mode');

// --- HTTP server ---
const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

const publicDir = path.join(__dirname, '..', 'public');
const sharedBrowserDir = path.join(__dirname, '..', '..', 'shared', 'browser');

const httpServer = http.createServer((req, res) => {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  urlPath = urlPath.split('?')[0];

  let filePath;
  if (urlPath.startsWith('/shared/')) {
    // Serve shared browser files (e.g. /shared/glitch.js → ../../shared/browser/glitch.js)
    filePath = path.join(sharedBrowserDir, decodeURIComponent(urlPath.replace('/shared/', '')));
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

  ws.send(JSON.stringify({ type: 'config', mock: isMock }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'ready':
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
      case 'hack_mode':
        console.log('[rc] Activating hack mode');
        broadcast({ type: 'hackMode' });
        rc.sendAck(cmd.requestId, true);
        break;

      case 'hack_resolved':
        console.log('[rc] Hack resolved');
        broadcast({ type: 'hackResolved' });
        rc.sendAck(cmd.requestId, true);
        break;

      case 'reset':
        console.log('[rc] Resetting immersion screen');
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
  console.log('[immersion] Spy dashboard immersion screen');
});

process.on('SIGINT', () => {
  console.log('\n[server] Shutting down...');
  rc.disconnect();
  httpServer.close();
  process.exit(0);
});
