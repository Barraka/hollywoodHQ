# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mission: Hollywood** — An escape room scenario (James Bond / Mission Impossible theme) where players discover a secret HQ and solve 5 sequential puzzles to rescue actor Tim Ferris from a villain.

This project is part of the **Escape Yourself** escape room company ecosystem. The Game Master dashboard that manages room sessions lives at `c:\02 - GM Manager\escapeRoomManager` (React 19 + Vite 7 app with Room Controller WebSocket integration).

## The 5 Puzzles (in order)

1. **Simon Game** — Buttons on a console light up randomly; players press each lit button to reactivate the HQ. Solved when all buttons pressed.
2. **World Map Locator** — Two rotary knobs move crosshair lines on a world map screen. Headsets provide audio beep feedback (faster = closer). Solved when both lines reach the target.
3. **Gadget Code Puzzle** — Numpad entry with 3 diodes. Players match spy gadgets to situations by entering codes. Each correct code lights a diode green. Solved after all 3.
4. **Vehicle Selection** — 3D spinning vehicle viewer with left/right navigation. Players input vehicle codes using physical levers + validate button. Virtual assistant gives feedback. Solved when correct vehicle chosen.
5. **Missile Trajectory** — Joystick-controlled path reversal on the world map. Players trace the missile's path backwards (city to city) to return it to origin. Solved when missile reaches the villain's location.

## Current State

| Puzzle | Directory | Port | Status |
|---|---|---|---|
| 1 — Simon | `puzzle-1-simon/` | 3004 | Implemented |
| 2 — World Map Locator | `puzzle-2-world-map/` | 3000 | Implemented |
| 3 — Gadget Code | `puzzle-3-gadget-code/` | 3001 | Implemented |
| 4 — Vehicle Selector | `puzzle-4-vehicle/` | 3002 | Implemented |
| 5 — Missile Redirect | `puzzle-5-missile/` | 3003 | Implemented |

Each puzzle has its own `CLAUDE.md` with architecture details, commands, and GPIO pin mappings.

### Running in dev mode

```bash
cd puzzle-1-simon && npm run dev       # http://localhost:3004
cd puzzle-2-world-map && npm run dev   # http://localhost:3000
cd puzzle-3-gadget-code && npm run dev # http://localhost:3001
cd puzzle-4-vehicle && npm run dev     # http://localhost:3002
cd puzzle-5-missile && npm run dev     # http://localhost:3003
```

All puzzles use `--mock` flag for development (keyboard input, no GPIO). Each has a click-to-start overlay and auto-activates in mock mode.

## Hardware Status

✅ **All hardware sourced and configured** (2 Raspberry Pi setup)

| Puzzle | Hardware | Raspberry Pi | Status |
|--------|----------|--------------|--------|
| 1 — Simon | 10× Illuminated arcade buttons (same color) | Props Pi | ✅ Configured |
| 2 — World Map | 2× KY-040 rotary encoders, headsets | Props Pi | ✅ Configured |
| 3 — Gadget Code | Wiegand RFID keypad, 3× LEDs (3-6V green) | Narrative Pi | ✅ Configured |
| 4 — Vehicle | 4× 10-pos rotary switches, 2× nav buttons, validate button | Narrative Pi | ✅ Configured |
| 5 — Missile | 8-way arcade joystick (EG STARTS) | Props Pi | ✅ Configured |

See [GPIO_ALLOCATION.md](GPIO_ALLOCATION.md) for complete pin mapping and distribution.

## Architecture

- **Runtime**: Node.js backend + browser frontend (Chromium kiosk on Raspberry Pi)
- **Hardware**: **2 Raspberry Pi 4/5 units**
  - **Props Pi (#1)**: Controls physical props, HDMI → world map display
    - Puzzle 1: Simon (10 buttons)
    - Puzzle 2: World Map (encoders, headsets)
    - Puzzle 5: Missile (joystick)
    - GPIO: 16 unique + 4 shared = 20 pins ✅
  - **Narrative Pi (#2)**: Story/guidance screen (villain, Tim Ferris, instructions)
    - Puzzle 3: Gadget Code (keypad, LEDs, virtual assistant)
    - Puzzle 4: Vehicle Selector (levers, buttons, vehicle viewer)
    - GPIO: 20 unique pins ✅
- **Communication**: WebSocket (`ws` package) between server and browser, same port as HTTP
- **Hardware I/O**: `onoff` package for GPIO (optional dependency, mock fallback if unavailable)
- **Room Controller**: WebSocket integration placeholder in each puzzle (set `roomControllerUrl` in config)

## GPIO Pin Usage Summary

Each Raspberry Pi has **28 usable GPIO pins** (BCM numbering). See [GPIO_ALLOCATION.md](GPIO_ALLOCATION.md) for detailed pin mapping.

### Props Pi (Raspberry Pi #1) - GPIO Usage

| Puzzle | Button Inputs | LED Outputs | Total Pins | Pin Sharing |
|---|---|---|---|---|
| Puzzle 1 (Simon) | 10 pins | 10 pins | 20 | 4 buttons shared with P2 & P5 |
| Puzzle 2 (World Map) | 4 encoder pins | — | 4 | All 4 shared with P1 & P5 |
| Puzzle 5 (Missile) | 4 joystick pins | — | 4 | All 4 shared with P1 & P2 |
| **Props Pi Total** | **16 unique** | — | **20 pins** | **✅ Within capacity** |

**Shared pins (Props Pi):** GPIO 16, 19, 20, 26 used by Puzzles 1, 2, 5 (safe - sequential execution)

### Narrative Pi (Raspberry Pi #2) - GPIO Usage

| Puzzle | Inputs | Outputs | Total Pins | Pin Sharing |
|---|---|---|---|---|
| Puzzle 3 (Gadget Code) | 2 keypad pins | 3 LED pins | 5 | None |
| Puzzle 4 (Vehicle) | 15 (12 lever + 3 button) | — | 15 | None |
| **Narrative Pi Total** | — | — | **20 pins** | **✅ Within capacity** |

**Key optimization strategies:**
- **2-Pi distribution:** Props vs Narrative screens, distributes GPIO load evenly
- **Sequential pin sharing:** Props Pi shares GPIO 16, 19, 20, 26 across Puzzles 1, 2, 5
- **Wiegand protocol:** Puzzle 3 uses 2 pins instead of 10 for full keypad
- **Sparse lever wiring:** Puzzle 4 uses 12 pins instead of 40 for all positions

## Related Projects

- **GM Manager** (`c:\02 - GM Manager\escapeRoomManager`) — React dashboard for Game Masters. Connects to Room Controller via WebSocket. Displays props timeline, manages sessions, hints, audio, and statistics.
- **Leonie Game** (`c:\09 - Leonie Game`) — Unrelated project (Babylon.js 3D horse riding game with Colyseus multiplayer).
