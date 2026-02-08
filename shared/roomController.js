/**
 * Room Controller WebSocket Client
 *
 * Handles bidirectional WebSocket communication between puzzles and the Room Controller.
 *
 * Protocol:
 * - Puzzle → RC: prop_online, prop_update, prop_offline
 * - RC → Puzzle: cmd (force_solve, reset, trigger_sensor)
 *
 * Usage:
 *   const rc = new RoomControllerClient(config.roomControllerUrl, config.propId);
 *   rc.on('command', (cmd) => {
 *     if (cmd.command === 'force_solve') puzzle.forceSolve();
 *     if (cmd.command === 'reset') puzzle.reset();
 *   });
 *   rc.connect();
 *   rc.updateState({ state: 'active', progress: 0.5 });
 */

const EventEmitter = require('events');
const WebSocket = require('ws');

class RoomControllerClient extends EventEmitter {
  constructor(url, propId) {
    super();
    this.url = url;
    this.propId = propId;
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectDelay = 2000; // Start at 2s
    this.maxReconnectDelay = 30000; // Max 30s
    this.isShuttingDown = false;
  }

  connect() {
    if (!this.url) {
      console.log('[rc] No Room Controller URL configured, skipping connection');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[rc] Already connected');
      return;
    }

    console.log('[rc] Connecting to Room Controller at', this.url);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        console.log('[rc] Connected to Room Controller');
        this.reconnectDelay = 2000; // Reset backoff on successful connect

        // Send prop_online message
        this.send({
          type: 'prop_online',
          payload: {
            propId: this.propId,
            timestamp: Date.now()
          }
        });

        this.emit('connected');
      });

      this.ws.on('message', (raw) => {
        try {
          const message = JSON.parse(raw);
          this.handleMessage(message);
        } catch (err) {
          console.error('[rc] Failed to parse message:', err);
        }
      });

      this.ws.on('close', () => {
        console.log('[rc] Disconnected from Room Controller');
        this.ws = null;
        this.emit('disconnected');

        // Auto-reconnect with exponential backoff
        if (!this.isShuttingDown) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectDelay = Math.min(
              this.reconnectDelay * 1.5,
              this.maxReconnectDelay
            );
            this.connect();
          }, this.reconnectDelay);
        }
      });

      this.ws.on('error', (err) => {
        console.error('[rc] WebSocket error:', err.message);
      });

    } catch (err) {
      console.error('[rc] Failed to create WebSocket:', err.message);
    }
  }

  handleMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'cmd':
        // Commands from GM dashboard
        if (payload.propId === this.propId || !payload.propId) {
          console.log('[rc] Received command:', payload.command);
          this.emit('command', payload);
        }
        break;

      case 'hello':
        console.log('[rc] Received hello from Room Controller');
        break;

      default:
        // Ignore other message types
        break;
    }
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Update puzzle state (sends prop_update to RC)
   * @param {Object} changes - State changes to broadcast
   */
  updateState(changes) {
    this.send({
      type: 'prop_update',
      payload: {
        propId: this.propId,
        timestamp: Date.now(),
        changes
      }
    });
  }

  /**
   * Send acknowledgment for a command
   * @param {string} requestId - Request ID from the command
   * @param {boolean} success - Whether command succeeded
   * @param {string} error - Optional error message
   */
  sendAck(requestId, success, error = null) {
    if (!requestId) return;

    this.send({
      type: 'cmd_ack',
      payload: {
        requestId,
        success,
        error
      }
    });
  }

  disconnect() {
    this.isShuttingDown = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      // Send prop_offline before disconnecting
      this.send({
        type: 'prop_offline',
        payload: {
          propId: this.propId,
          timestamp: Date.now()
        }
      });

      this.ws.close();
      this.ws = null;
    }
  }
}

module.exports = RoomControllerClient;
