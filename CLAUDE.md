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

| Component | Directory | Port | Status |
|---|---|---|---|
| 1 — Simon | `puzzle-1-simon/` | 3004 | Implemented |
| 2 — World Map Locator | `puzzle-2-world-map/` | 3000 | Implemented |
| 3 — Gadget Code | `puzzle-3-gadget-code/` | 3001 | Implemented |
| 4 — Vehicle Selector | `puzzle-4-vehicle/` | 3002 | Implemented |
| 5 — Missile Redirect | `puzzle-5-missile/` | 3003 | Implemented |
| Screen — Villain | `screen-villain/` | 3010 | Implemented |
| Screen — Immersion | `screen-immersion/` | 3011 | Implemented |
| Screen — Right (Tim Ferris + P3) | `screen-right/` | 3012 | Implemented |

**Room Controller Integration:** ✅ Implemented for all 5 puzzles + 3 screens

**Raspberry Pi Deployment:** ✅ Automated setup scripts ready (Props Pi, Narrative Pi, Vehicle Pi Zero)

**Hack Mode:** ✅ Synchronized glitch overlay across all screens and puzzles via Room Controller

Each puzzle has its own `CLAUDE.md` with architecture details, commands, and GPIO pin mappings.

### Running in dev mode

```bash
# Puzzles
cd puzzle-1-simon && npm run dev       # http://localhost:3004
cd puzzle-2-world-map && npm run dev   # http://localhost:3000
cd puzzle-3-gadget-code && npm run dev # http://localhost:3001
cd puzzle-4-vehicle && npm run dev     # http://localhost:3002
cd puzzle-5-missile && npm run dev     # http://localhost:3003

# Screens
cd screen-villain && npm run dev       # http://localhost:3010
cd screen-immersion && npm run dev     # http://localhost:3011
cd screen-right && npm run dev         # http://localhost:3012
```

All puzzles use `--mock` flag for development (keyboard input, no GPIO). Each has a click-to-start overlay and auto-activates in mock mode.

### Deploying to Raspberry Pi

Automated deployment scripts in `raspberry-pi/` directory:

```bash
# Props Pi (Puzzles 1, 2, 5 + Immersion Screen)
cd raspberry-pi
sudo ./setup-props-pi.sh
sudo ./configure-room-controller.sh ws://192.168.1.100:3001
sudo reboot

# Narrative Pi (Puzzles 3, 4 + Villain Screen + Right Screen)
cd raspberry-pi
sudo ./setup-narrative-pi.sh
sudo ./configure-room-controller.sh ws://192.168.1.100:3001
sudo reboot

# Vehicle Pi Zero (display-only kiosk for Puzzle 4)
cd raspberry-pi
sudo ./setup-vehicle-pi-zero.sh 192.168.1.11   # Narrative Pi IP
sudo reboot
```

See [raspberry-pi/README.md](raspberry-pi/README.md) for complete setup guide, service management, and troubleshooting.

## Hardware Status

✅ **All hardware sourced and configured** (2 Raspberry Pi 4/5 + 1 Pi Zero 2 W)

| Puzzle | Hardware | Raspberry Pi | Status |
|--------|----------|--------------|--------|
| 1 — Simon | 10× Illuminated arcade buttons (same color) | Props Pi | ✅ Configured |
| 2 — World Map | 2× KY-040 rotary encoders, headsets | Props Pi | ✅ Configured |
| 3 — Gadget Code | Wiegand RFID keypad, 3× LEDs (3-6V green) | Narrative Pi | ✅ Configured |
| 4 — Vehicle | 4× 10-pos rotary switches, 2× nav buttons, validate button | Narrative Pi | ✅ Configured |
| 5 — Missile | 8-way arcade joystick (EG STARTS) | Props Pi | ✅ Configured |

See [GPIO_ALLOCATION.md](GPIO_ALLOCATION.md) for complete pin mapping and distribution.

## Screen Layout (5 screens, 3 Pis)

| # | Screen | Content | Source | Port |
|---|--------|---------|--------|------|
| 1 | Central | World Map (Puzzle 2/5) | Props Pi HDMI-0 | 3000 |
| 2 | Left | Villain clips (dedicated) | Narrative Pi HDMI-0 | 3010 |
| 3 | Right | Tim Ferris + Puzzle 3 UI (multiplexed) | Narrative Pi HDMI-1 | 3012 |
| 4 | Small right | Spy immersion dashboard | Props Pi HDMI-1 | 3011 |
| 5 | Small (separate) | Puzzle 4 Vehicle viewer | Pi Zero 2 W | 3002 (remote) |

The Pi Zero 2 W is a display-only kiosk — it runs Chromium pointed at the Narrative Pi's Puzzle 4 server over WiFi (no GPIO, no local server).

## Hack Mode (Intro Sequence)

The room begins with a **synchronized hack mode** intro:

1. Virtual assistant greets players → villain appears on villain screen
2. Room Controller sends `hack_mode` command to all connected props/screens
3. All screens and puzzles activate the **glitch overlay** (`shared/browser/glitch.js`) — CSS jitter, noise canvas, scanlines, glitch bars, warning text
4. Puzzle 1 (Simon) auto-activates — players must press all lit buttons to "reboot" the HQ
5. When Puzzle 1 is solved, it broadcasts `hack_resolved` via Room Controller
6. All screens deactivate the glitch overlay and return to normal operation

**Shared glitch module**: `shared/browser/glitch.js` — self-contained IIFE that injects its own CSS and DOM elements. API: `HackGlitch.activate()`, `HackGlitch.deactivate()`, `HackGlitch.isActive()`. Loaded via `<script src="/shared/glitch.js">` in every puzzle and screen frontend.

## Architecture

- **Runtime**: Node.js backend + browser frontend (Chromium kiosk on Raspberry Pi)
- **Hardware**: **2 Raspberry Pi 4/5 + 1 Pi Zero 2 W**
  - **Props Pi (#1)**: Physical props + dual-display kiosk
    - Puzzle 1: Simon (10 buttons)
    - Puzzle 2: World Map (encoders, headsets)
    - Puzzle 5: Missile (joystick)
    - Screen: Immersion spy dashboard
    - HDMI-0 → World Map (port 3000), HDMI-1 → Immersion (port 3011)
    - GPIO: 16 unique + 4 shared = 20 pins ✅
  - **Narrative Pi (#2)**: Story screens + dual-display kiosk
    - Puzzle 3: Gadget Code (keypad, LEDs, virtual assistant)
    - Puzzle 4: Vehicle Selector (levers, buttons — display on Pi Zero)
    - Screen: Villain clips (dedicated left screen)
    - Screen: Right (Tim Ferris + Puzzle 3 display, multiplexed)
    - HDMI-0 → Villain (port 3010), HDMI-1 → Right Screen (port 3012)
    - GPIO: 20 unique pins ✅
  - **Vehicle Pi Zero (#3)**: Display-only kiosk (no GPIO, no local server)
    - Chromium pointed at Narrative Pi's Puzzle 4 server over WiFi
    - Setup: `sudo ./setup-vehicle-pi-zero.sh [NARRATIVE_PI_IP]`
- **Communication**: WebSocket (`ws` package) between server and browser, same port as HTTP
- **Hardware I/O**: `onoff` package for GPIO (optional dependency, mock fallback if unavailable)
- **Room Controller**: WebSocket integration implemented for all puzzles + screens via `shared/roomController.js`
  - Auto-connects with exponential backoff (2s → 30s max)
  - Sends `prop_online`, `prop_update`, `prop_offline` to GM dashboard
  - Receives `force_solve`, `reset`, `hack_mode`, `hack_resolved` commands from GM
  - Set `roomControllerUrl` in each puzzle/screen `config.js` to enable (default: null/disabled)
  - See [shared/README.md](shared/README.md) for usage details
- **Shared browser modules**: `shared/browser/` served at `/shared/` URL by all puzzle/screen servers
  - `glitch.js` — Synchronized hack mode overlay (CSS jitter, noise, scanlines)
- **Deployment**: Automated Raspberry Pi setup via `raspberry-pi/` scripts
  - One-command setup per Pi: `setup-props-pi.sh`, `setup-narrative-pi.sh`, `setup-vehicle-pi-zero.sh`
  - Installs Node.js, dependencies, systemd services, dual-display Chromium kiosk
  - Auto-start on boot, auto-restart on crash, centralized logging
  - See [raspberry-pi/README.md](raspberry-pi/README.md) for details

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

## v1.1.0 — Audit Bug Fix Pass

- **Puzzle 3 (Gadget Code)**: Fixed NaN progress reported to Room Controller — `state.solvedCount` (undefined) → `state.currentSituation`
- **Puzzle 3 (Gadget Code)**: Added digit validation in `puzzleLogic.js` — rejects non-numeric WebSocket input (`/^[0-9]$/` check)
- **Puzzle 5 (Missile)**: Fixed NaN progress reported to Room Controller — `state.pathIndex` (undefined) → `state.reverseLeg / state.totalLegs`

## Related Projects

- **GM Manager** (`c:\02 - GM Manager\escapeRoomManager`) — React dashboard for Game Masters. Connects to Room Controller via WebSocket. Displays props timeline, manages sessions, hints, audio, and statistics.
