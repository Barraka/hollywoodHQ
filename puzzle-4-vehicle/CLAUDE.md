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
server/levers.js       → GPIO lever reading (10-pos rotary switches), sparse pin mapping, polling
config.js              → Vehicles (name, video, code), lever config, GPIO pins (sparse)
public/index.html      → Fullscreen vehicle viewer with lever HUD
public/app.js          → WebSocket client, video switching, lever display, keyboard input
public/videos/         → Vehicle loop videos (placeholder .mp4 files)
generate-placeholders.js → Generates placeholder videos via ffmpeg
```

## Data Flow

```
Navigation buttons → puzzleLogic → vehicleChanged → browser switches video
Lever GPIO polling → levers.js → leversChanged → puzzleLogic.setLevers() → browser updates HUD
Validate button    → puzzleLogic → checks code    → validateResult → browser shows feedback
```

## Key Design Decisions

- **Looping videos**: each vehicle is a seamless loop. Videos play muted (they're visual only).
- **10-position rotary switches**: each lever is a rotary cam switch with positions 1-10. Industrial aesthetic, clear tactile feedback.
- **Sparse GPIO wiring**: vehicle codes are strategically chosen to minimize GPIO usage. Only positions actually used are wired (12 pins instead of 40).
- **Lever input**: in production, levers are 10-position rotary switches read via GPIO polling (100ms). In mock mode, keyboard shortcuts (Q/A for lever 1, etc.).
- **Single correct vehicle**: only one vehicle+code combination solves the puzzle. Wrong attempts show feedback and return to browsing.
- **Video preloading**: all vehicle clips are fetched into blob URLs on page load for instant switching.

## GPIO Pin Mapping (Raspberry Pi)

Defined in `config.js`:

**Navigation Buttons:**
- Left button: GPIO 5
- Right button: GPIO 6
- Validate button: GPIO 13

**Levers (10-position rotary cam switches, sparse mapping):**

Vehicle codes (optimized for GPIO efficiency):
- Vehicle 1 (Stealth Helicopter): [2, 7, 4, 5]
- Vehicle 2 (Armored SUV): [4, 7, 8, 1]
- Vehicle 3 (Speedboat): [2, 9, 4, 6] ← Correct
- Vehicle 4 (Jet Fighter): [8, 3, 2, 1]
- Vehicle 5 (Submarine): [4, 3, 8, 5]

Lever pin mappings (only wired positions):
- **Lever 1**: pos 2 → GPIO 2, pos 4 → GPIO 3, pos 8 → GPIO 4
- **Lever 2**: pos 3 → GPIO 7, pos 7 → GPIO 8, pos 9 → GPIO 9
- **Lever 3**: pos 2 → GPIO 10, pos 4 → GPIO 11, pos 8 → GPIO 14
- **Lever 4**: pos 1 → GPIO 15, pos 5 → GPIO 18, pos 6 → GPIO 21

**Total: 12 GPIO pins for levers** (instead of 40 if all positions were wired)

**Wiring:**
- Each rotary switch has a common terminal (connect to ground)
- Position terminals connect to GPIO pins with internal pull-up resistors
- When lever is at position N, that GPIO pin reads LOW (grounded via switch)
- All other position pins read HIGH (pulled up)
