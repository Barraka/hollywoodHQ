# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Puzzle 2 of the "Mission: Hollywood" escape room. Players use two rotary encoders to move crosshair lines over a world map. Each player wears a headset receiving audio beeps for one axis only (left channel = horizontal, right channel = vertical). Beeps get faster as the axis approaches the target. Both axes must be within the tolerance zone simultaneously for a hold duration to solve the puzzle.

## Commands

```bash
npm run dev     # Start in mock mode (keyboard input, browser audio) — for development
npm start       # Start in production mode (GPIO encoders, Pi audio) — for Raspberry Pi
```

Dev mode serves at http://localhost:3000. Use arrow keys/WASD to move the crosshair, R to reset.

## Architecture

```
server/index.js        → Entry point: HTTP static server + WebSocket server on same port
server/encoders.js     → Reads rotary encoders via GPIO (onoff). Falls back to mock if unavailable.
server/audio.js        → Generates beeps at variable intervals per axis. Mock sends events to browser.
server/puzzleLogic.js  → Core game logic: position tracking, distance calc, tolerance check, hold timer.
public/index.html      → Fullscreen spy HQ display (world map, crosshair, visual effects)
public/app.js          → WebSocket client, crosshair rendering, browser audio (mock), keyboard input
public/world-map.svg   → SVG world map (MIT, flekschas/simple-world-map)
config.js              → All tunable parameters (target, tolerance, beep intervals, GPIO pins, etc.)
```

## Data Flow

Encoder turns → `puzzleLogic.js` updates normalized position (0–1) → broadcasts via WebSocket:
- `{type: 'position', x, y}` → frontend moves crosshair
- `{type: 'beep', axis}` → frontend plays stereo beep (mock mode only)
- `{type: 'holdProgress', progress}` → frontend shows hold ring
- `{type: 'solved'}` → frontend shows "TARGET LOCKED" overlay

Frontend → server messages: `{type: 'key', axis, direction}` (mock input), `{type: 'reset'}`, `{type: 'forceSolve'}`

## Key Design Decisions

- **Positions are normalized 0–1**, not pixels or SVG coordinates. The frontend converts to screen space using the SVG's `getScreenCTM()`.
- **No lock-in**: both axes must be correct simultaneously. No axis snapping.
- **Exponential beep curve**: `Math.pow(distance, 0.5)` — most frequency change happens near the target.
- **Mock mode** (`--mock` flag): enables keyboard input and routes beeps to the browser via Web Audio API with stereo panning. Automatically activated if `onoff` package is unavailable.
- **City dots** are hardcoded SVG coordinates placed manually using the POC placement tool.

## GPIO Pin Mapping (Raspberry Pi)

Defined in `config.js`:
- Encoder X: CLK = GPIO 16, DT = GPIO 20 (shared with Puzzle 1 & 5)
- Encoder Y: CLK = GPIO 19, DT = GPIO 26 (shared with Puzzle 1 & 5)

**Pin Sharing Note:** These GPIO pins are safely reused from Puzzle 1 (Simon buttons) and Puzzle 5 (Joystick) since puzzles run sequentially, not simultaneously.

**Hardware:** 2× KY-040 rotary encoders

## Not Yet Implemented

- Stereo audio channel routing on Raspberry Pi (currently plays on both channels)
- Room Controller WebSocket integration (placeholder in `index.js`, set `roomControllerUrl` in config)
- Kiosk boot setup script (`install.sh`)
