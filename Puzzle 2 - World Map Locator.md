# Puzzle 2 — World Map Locator

## Overview

Players use two rotary knobs to move crosshair lines (horizontal and vertical) over a world map displayed on a screen. Each player wears a headset that provides audio feedback for one axis only — beeps that increase in frequency as the crosshair approaches the target. When both axes are within the tolerance zone simultaneously for ~2 seconds, the puzzle is solved.

This puzzle is designed around **player communication**: each player only has feedback for one axis, so they must talk to each other to converge on the target.

## Hardware

| Component | Details |
|---|---|
| Board | Raspberry Pi 4 or 5 |
| Encoders | 2x rotary encoders (digital, infinite rotation, with detents) — 4 GPIO pins total (CLK + DT per encoder) |
| Screen | Monitor connected via HDMI — displays the world map and crosshair |
| Audio | Stereo output (built-in jack or USB audio adapter). Left channel → headset 1 (horizontal axis). Right channel → headset 2 (vertical axis) |
| Headsets | 2x wired headsets (one per player), each receiving one stereo channel |

## Software Architecture

### Stack

- **Backend:** Node.js — handles GPIO, audio, puzzle logic, and communication
- **Frontend:** HTML/CSS/Canvas served locally, displayed in Chromium kiosk mode
- **Communication:** WebSocket between backend and frontend (local), WebSocket client to Room Controller

### Project Structure

```
puzzle-2-world-map/
├── server/
│   ├── index.js              # Entry point — starts WebSocket server, GPIO, audio
│   ├── encoders.js           # Rotary encoder reading via GPIO
│   ├── audio.js              # Beep playback (stereo L/R per axis)
│   └── puzzleLogic.js        # Position tracking, tolerance check, hold timer
├── public/
│   ├── index.html            # Fullscreen world map page
│   ├── style.css             # Fullscreen layout, no cursor, no scrollbars
│   └── app.js                # Canvas rendering + WebSocket client
├── package.json
└── install.sh                # Pi setup: autostart, kiosk mode, dependencies
```

### Data Flow

```
Rotary encoders
      │ (GPIO)
      ▼
  encoders.js  ──▶  puzzleLogic.js  ──▶  Room Controller
      │                   │                (WebSocket client)
      │                   │
      ▼                   ▼
   audio.js           WebSocket server
  (L/R beeps)            │
                          ▼
                   public/app.js
                  (crosshair rendering)
```

1. **encoders.js** listens for rotary encoder clicks via GPIO and emits direction events (+1 / -1 per axis).
2. **puzzleLogic.js** receives encoder events, updates the current X/Y position (clamped to map edges), and:
   - Calculates the distance per axis to the target.
   - Tells **audio.js** to adjust the beep interval for each axis independently.
   - Pushes the new X/Y coordinates to the browser via WebSocket for crosshair rendering.
   - Checks if both axes are within tolerance. If so, starts a hold timer (~2s). If the player drifts out, the timer resets. After the hold duration, sends `solved` to the Room Controller.
3. **audio.js** plays beeps on the left stereo channel (horizontal axis) and right stereo channel (vertical axis) at intervals determined by distance. Closer = faster beeps.
4. **public/app.js** receives X/Y position updates via WebSocket and redraws the crosshair lines on a Canvas overlay on top of the world map.

### Boot Sequence

1. Raspberry Pi powers on → auto-login (no password prompt).
2. systemd service starts the Node.js backend (`server/index.js`).
3. Chromium launches in kiosk mode (fullscreen, no UI chrome, no cursor) and loads `http://localhost:<port>`.
4. The world map is displayed immediately. Puzzle is ready.
5. No GM intervention required.

## Configuration

These values live in the backend and can be adjusted without changing the frontend:

| Parameter | Description | Example |
|---|---|---|
| `targetX` | Horizontal target position (0–1 normalized) | `0.63` |
| `targetY` | Vertical target position (0–1 normalized) | `0.41` |
| `tolerance` | How close each axis must be to count as "correct" (0–1) | `0.05` |
| `holdDuration` | Seconds both axes must stay in zone to solve | `2` |
| `minBeepInterval` | Beep interval when right on target (ms) | `100` |
| `maxBeepInterval` | Beep interval when at maximum distance (ms) | `2000` |
| `stepsX` | Total encoder clicks from left edge to right edge | `200` |
| `stepsY` | Total encoder clicks from top edge to bottom edge | `150` |

## Audio Behavior

- Each axis produces a repeating beep on its dedicated stereo channel (L or R).
- The beep interval is calculated from the distance to the target on that axis:
  - Far away → slow beeps (e.g. one every 2 seconds).
  - Close → rapid beeps (e.g. one every 100ms).
  - The curve should be exponential (most of the change happens near the target) for a satisfying "hot/cold" feel.
- The beep itself is a short tone (e.g. 50–100ms sine wave or a pre-recorded sample).

## Display

- Fullscreen world map image covering the entire screen.
- Two lines overlaid on the map:
  - A vertical line (controlled by the horizontal encoder).
  - A horizontal line (controlled by the vertical encoder).
- Lines move in real-time as players turn the knobs.
- No color changes, no proximity indicators — the screen is purely visual with no gameplay hints. All feedback comes through the headsets.

## Room Controller Integration

The puzzle communicates with the Room Controller as a standard prop:

- **On boot:** Connects via WebSocket, reports `online` status.
- **On solve:** Sends solved state after hold timer completes.
- **On reset command:** Resets crosshair to starting position, clears hold timer, puzzle is active again.
- **On force_solve command:** Immediately marks puzzle as solved (GM override).

## Reset Behavior

When the puzzle is reset (either via Room Controller command or on boot):

- Crosshair returns to a neutral starting position (e.g. center of the map, or a fixed offset so it's clearly not on the target).
- Beeps resume at their slow "far away" interval.
- Hold timer is cleared.
- The puzzle waits for player input.
