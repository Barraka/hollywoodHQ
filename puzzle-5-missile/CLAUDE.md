# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Overview

Puzzle 5 of the "Mission: Hollywood" escape room. A missile flies across the world map through city waypoints. Players must reverse the missile's path using a 4-direction joystick, inputting the opposite direction for each leg in reverse order. When the missile returns to the villain's origin, the game is won.

## Commands

```bash
npm run dev     # Start in mock mode — for development
npm start       # Start in production mode — for Raspberry Pi
```

Dev mode serves at http://localhost:3003.

### Dev Controls (mock mode)

- Arrow keys: joystick (up/down/left/right)
- X: activate puzzle
- C: reset
- V: force solve

## Architecture

```
server/index.js        → HTTP/WebSocket server, routes messages
server/puzzleLogic.js  → State machine: INACTIVE → FORWARD_ANIM → REVERSING → SOLVED
server/joystick.js     → GPIO joystick (4 direction buttons), mock fallback
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

- **Cardinal directions only**: each leg is strictly left/right/up/down. The path is like a directional padlock visualized on the map.
- **Reverse = opposite direction in reverse order**: if forward path is [right, down, left], reverse input is [right, up, left].
- **Same world map as Puzzle 2**: reuses the SVG and city dot coordinates. In production, this runs on the same HDMI output — screen switches from Puzzle 2 to Puzzle 5.
- **SVG-based trajectory**: trajectory lines and waypoints are drawn as SVG elements overlaid on the map. Missile position transitions via CSS.
- **Forward animation**: missile flies through all cities automatically to show the full path before players start reversing.

## GPIO Pin Mapping

Defined in `config.js`:
- Joystick Up: GPIO 16
- Joystick Down: GPIO 20
- Joystick Left: GPIO 19
- Joystick Right: GPIO 26
