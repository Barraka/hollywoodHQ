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

✅ **All hardware sourced and configured** (24 unique GPIO pins used)

| Puzzle | Hardware | Status |
|--------|----------|--------|
| 1 — Simon | 4× Illuminated arcade buttons (red, blue, green, yellow) | ✅ Configured |
| 2 — World Map | 2× KY-040 rotary encoders, headsets | ✅ Configured |
| 3 — Gadget Code | Wiegand RFID keypad, 3× LEDs (3-6V green) | ✅ Configured |
| 4 — Vehicle | 4× 10-pos rotary switches, 2× nav buttons, validate button | ✅ Configured |
| 5 — Missile | 8-way arcade joystick (EG STARTS) | ✅ Configured |

See [GPIO_ALLOCATION.md](GPIO_ALLOCATION.md) for complete pin mapping and sharing strategy.

## Architecture

- **Runtime**: Node.js backend + browser frontend (Chromium kiosk on Raspberry Pi)
- **Communication**: WebSocket (`ws` package) between server and browser, same port as HTTP
- **Hardware I/O**: `onoff` package for GPIO (optional dependency, mock fallback if unavailable)
- **Shared hardware**: Raspberry Pi 4/5 with dual HDMI manages all puzzles. Puzzle 2 & 5 share HDMI 1 (world map), Puzzle 3 shares HDMI 2 (virtual assistant)
- **Room Controller**: WebSocket integration placeholder in each puzzle (set `roomControllerUrl` in config)

## GPIO Pin Usage Summary

Raspberry Pi has **28 usable GPIO pins** (BCM numbering). See [GPIO_ALLOCATION.md](GPIO_ALLOCATION.md) for detailed pin mapping.

### Pin Usage with Sequential Sharing

| Puzzle | Unique Pins | Shared Pins | Total Pins | Share Group |
|---|---|---|---|---|
| Puzzle 1 (Simon) | 0-2 | 4 | 4-6 | Shares with Puzzle 2 |
| Puzzle 2 (World Map) | 0-1 | 5-6 | ~6 | Shares with Puzzle 1 & 5 |
| Puzzle 3 (Gadget Code) | 5 | 0 | 5 | Unique (no sharing) |
| Puzzle 4 (Vehicle) | 15 | 0 | 15 | Unique (no sharing) |
| Puzzle 5 (Missile) | 0 | 4 | 4 | Shares with Puzzle 2 |
| **Total Unique Pins** | **~26** | — | — | **Within capacity!** ✅ |

**Key optimization strategies:**
- **Sequential pin sharing:** Puzzles 1, 2, and 5 share GPIO pins (safe because puzzles run sequentially)
- **Wiegand protocol:** Puzzle 3 uses 2 pins instead of 10 for full keypad
- **Sparse lever wiring:** Puzzle 4 uses 12 pins instead of 40 for all positions
- **Joystick combination:** Puzzle 5 uses 4 pins for 8 directions

**Shared pin groups:**
- **GPIO 16, 19, 20, 22**: Puzzle 1 (buttons) ↔ Puzzle 2 (encoders) ↔ Puzzle 5 (joystick)
- **GPIO 26**: Puzzle 2 (encoder switch) ↔ Puzzle 5 (joystick right)

## Related Projects

- **GM Manager** (`c:\02 - GM Manager\escapeRoomManager`) — React dashboard for Game Masters. Connects to Room Controller via WebSocket. Displays props timeline, manages sessions, hints, audio, and statistics.
- **Leonie Game** (`c:\09 - Leonie Game`) — Unrelated project (Babylon.js 3D horse riding game with Colyseus multiplayer).
