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
| 1 — Simon | — | — | Not started |
| 2 — World Map Locator | `puzzle-2-world-map/` | 3000 | Implemented |
| 3 — Gadget Code | `puzzle-3-gadget-code/` | 3001 | Implemented |
| 4 — Vehicle Selector | `puzzle-4-vehicle/` | 3002 | Implemented |
| 5 — Missile Redirect | `puzzle-5-missile/` | 3003 | Implemented |

Each puzzle has its own `CLAUDE.md` with architecture details, commands, and GPIO pin mappings.

### Running in dev mode

```bash
cd puzzle-2-world-map && npm run dev   # http://localhost:3000
cd puzzle-3-gadget-code && npm run dev # http://localhost:3001
cd puzzle-4-vehicle && npm run dev     # http://localhost:3002
cd puzzle-5-missile && npm run dev     # http://localhost:3003
```

All puzzles use `--mock` flag for development (keyboard input, no GPIO). Each has a click-to-start overlay and auto-activates in mock mode.

## Architecture

- **Runtime**: Node.js backend + browser frontend (Chromium kiosk on Raspberry Pi)
- **Communication**: WebSocket (`ws` package) between server and browser, same port as HTTP
- **Hardware I/O**: `onoff` package for GPIO (optional dependency, mock fallback if unavailable)
- **Shared hardware**: Raspberry Pi 4/5 with dual HDMI manages all puzzles. Puzzle 2 & 5 share HDMI 1 (world map), Puzzle 3 shares HDMI 2 (virtual assistant)
- **Room Controller**: WebSocket integration placeholder in each puzzle (set `roomControllerUrl` in config)

## Related Projects

- **GM Manager** (`c:\02 - GM Manager\escapeRoomManager`) — React dashboard for Game Masters. Connects to Room Controller via WebSocket. Displays props timeline, manages sessions, hints, audio, and statistics.
- **Leonie Game** (`c:\09 - Leonie Game`) — Unrelated project (Babylon.js 3D horse riding game with Colyseus multiplayer).
