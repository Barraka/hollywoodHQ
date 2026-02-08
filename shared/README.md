# Shared Modules

This directory contains shared code used across all puzzle implementations.

## roomController.js

WebSocket client for connecting puzzles to the Room Controller (GM dashboard).

### Features

- Auto-connects with exponential backoff on connection loss
- Sends `prop_online` on connect, `prop_offline` on disconnect
- Receives and emits `command` events (force_solve, reset, trigger_sensor)
- Broadcasts state updates via `prop_update` messages
- Handles command acknowledgments with success/error feedback

### Usage

```javascript
const RoomControllerClient = require('../../shared/roomController');

const rc = new RoomControllerClient(config.roomControllerUrl, config.propId);

// Handle commands from GM dashboard
rc.on('command', (cmd) => {
  switch (cmd.command) {
    case 'force_solve':
      puzzle.forceSolve();
      rc.sendAck(cmd.requestId, true);
      break;
    case 'reset':
      puzzle.reset();
      rc.sendAck(cmd.requestId, true);
      break;
  }
});

// Send state updates to dashboard
puzzle.on('stateChange', (state) => {
  rc.updateState({ state: state.state, progress: state.progress });
});

// Connect
rc.connect();

// Disconnect on shutdown
process.on('SIGINT', () => {
  rc.disconnect();
  process.exit(0);
});
```

### Configuration

Set in each puzzle's `config.js`:

```javascript
roomControllerUrl: 'ws://192.168.1.100:3001', // Room Controller WebSocket URL
propId: 'puzzle-1-simon',                      // Unique prop identifier
```

Set to `null` to disable Room Controller integration (standalone mode).

### WebSocket Protocol

**Messages sent by puzzles:**
- `prop_online` - Puzzle connected and ready
- `prop_offline` - Puzzle disconnecting
- `prop_update` - State change broadcast
- `cmd_ack` - Command acknowledgment

**Messages received from Room Controller:**
- `cmd` - GM command (force_solve, reset, trigger_sensor)
- `hello` - Welcome message with room info

For full protocol details, see: `c:\02 - GM Manager\escapeRoomManager\WEBSOCKET_CONTRACT_v1.md`
