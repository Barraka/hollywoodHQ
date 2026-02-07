# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Overview

Puzzle 4 of the "Mission: Hollywood" escape room. Players browse 5 vehicles via looping 3D video clips, set 4 physical levers (5 positions each) to form a code, and press Validate. One vehicle is correct — matching its code solves the puzzle.

## Commands

```bash
npm run dev     # Start in mock mode — for development
npm start       # Start in production mode — for Raspberry Pi
```

Dev mode serves at http://localhost:3002.

### Dev Controls (mock mode)

- Left/Right arrows: browse vehicles
- Q/A, W/S, E/D, R/F: adjust levers 1–4 up/down
- Enter: validate code
- X: activate puzzle
- C: reset puzzle
- V: force solve

## Architecture

```
server/index.js        → HTTP/WebSocket server, routes messages
server/puzzleLogic.js  → State machine: INACTIVE → BROWSING → SOLVED
server/buttons.js      → GPIO button reading (left/right/validate), mock fallback
config.js              → Vehicles (name, video, code), lever config, GPIO pins
public/index.html      → Fullscreen vehicle viewer with lever HUD
public/app.js          → WebSocket client, video switching, lever display, keyboard input
public/videos/         → Vehicle loop videos (placeholder .mp4 files)
generate-placeholders.js → Generates placeholder videos via ffmpeg
```

## Data Flow

```
Navigation buttons → puzzleLogic → vehicleChanged → browser switches video
Lever adjustment   → puzzleLogic → leversChanged  → browser updates lever display
Validate button    → puzzleLogic → checks code    → validateResult → browser shows feedback
```

## Key Design Decisions

- **Looping videos**: each vehicle is a seamless loop. Videos play muted (they're visual only).
- **Lever input**: in production, levers are multi-position physical switches read via GPIO/ADC. In mock mode, keyboard shortcuts (Q/A for lever 1, etc.).
- **Single correct vehicle**: only one vehicle+code combination solves the puzzle. Wrong attempts show feedback and return to browsing.
- **Video preloading**: all vehicle clips are fetched into blob URLs on page load for instant switching.

## GPIO Pin Mapping (Raspberry Pi)

Defined in `config.js`:
- Left button: GPIO 5
- Right button: GPIO 6
- Validate button: GPIO 13
- Lever input: TBD (ADC or multi-position switches)
