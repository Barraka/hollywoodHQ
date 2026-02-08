# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Overview

Puzzle 5 of the "Mission: Hollywood" escape room. A missile flies across the world map through city waypoints. Players must reverse the missile's path using an 8-way joystick, inputting the opposite direction for each leg in reverse order. When the missile returns to the villain's origin, the game is won.

## Commands

```bash
npm run dev     # Start in mock mode — for development
npm start       # Start in production mode — for Raspberry Pi
```

Dev mode serves at http://localhost:3003.

### Dev Controls (mock mode)

- Numpad (7-8-9 / 4-6 / 1-2-3): 8-way joystick directions
- Arrow keys: 4 cardinal directions (n/s/e/w)
- X: activate puzzle
- C: reset
- V: force solve

## Architecture

```
server/index.js        → HTTP/WebSocket server, routes messages
server/puzzleLogic.js  → State machine: INACTIVE → FORWARD_ANIM → REVERSING → SOLVED
server/joystick.js     → GPIO joystick (8-way via switch combinations), mock fallback
config.js              → Missile path (city waypoints + directions), GPIO pins
public/index.html      → World map with missile trajectory HUD
public/app.js          → SVG map loading, trajectory drawing, missile animation, keyboard input
public/world-map.svg   → Same SVG world map as Puzzle 2
```

## Data Flow

```
Joystick press → server checks direction vs expected reverse
  ├─ correct → animates missile back one leg, advances progress
  └─ wrong → red flash, stays at current city

Forward animation plays automatically on activate.
Frontend sends 'forwardAnimDone' when animation finishes → state transitions to REVERSING.
```

## Key Design Decisions

- **8-way directions**: Each leg uses one of 8 directions (n, ne, e, se, s, sw, w, nw) calculated from actual geometric angles between cities. The joystick detects diagonals via microswitch combinations.
- **Reverse = opposite direction in reverse order**: if forward path is [e, sw, se], reverse input is [nw, ne, w].
- **Same world map as Puzzle 2**: reuses the SVG and city dot coordinates. In production, this runs on the same HDMI output — screen switches from Puzzle 2 to Puzzle 5.
- **SVG-based trajectory**: trajectory lines and waypoints are drawn as SVG elements overlaid on the map. Missile position transitions via CSS.
- **Forward animation**: missile flies through all cities automatically to show the full path before players start reversing.
- **Hardware polling**: GPIO pins are polled every 50ms to detect 8-way combinations (e.g., up+right = northeast).

## GPIO Pin Mapping

Defined in `config.js`:
- Joystick Up: GPIO 16 (shared with Puzzle 1 & 2)
- Joystick Down: GPIO 20 (shared with Puzzle 1 & 2)
- Joystick Left: GPIO 19 (shared with Puzzle 1 & 2)
- Joystick Right: GPIO 26 (shared with Puzzle 1 & 2)

**Pin sharing note:** These GPIO pins are safely reused from Puzzles 1 and 2 since puzzles run sequentially, not simultaneously.

**8-way detection logic:**
- N = up only
- NE = up + right (both switches pressed)
- E = right only
- SE = down + right
- S = down only
- SW = down + left
- W = left only
- NW = up + left

**Wiring:**
- Each microswitch connects to ground when pressed (active-low)
- GPIO pins configured with internal pull-up resistors
- When switch pressed → GPIO reads LOW (0)
- When switch released → GPIO reads HIGH (1)
- Arcade joystick typically has 5 pins: up, down, left, right, common ground
