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

- **Puzzle 2 (World Map Locator)** — Fully implemented in `puzzle-2-world-map/`. Node.js backend + browser frontend. Run `npm run dev` for mock mode. See its own `CLAUDE.md` for details.
- **Puzzles 1, 3, 4, 5** — Specification only (`Explanations.txt`).

## Architecture Context

When implementation begins, each puzzle will likely need:
- A **frontend display** (screens on the console showing visuals/feedback)
- **Hardware I/O integration** (buttons, rotary knobs, numpad, levers, joystick)
- **Communication with the Room Controller** (the MiniPC that manages props, runs on WebSocket port 3001 and HTTP port 3002)

The Room Controller protocol uses WebSocket messages for prop state (`prop_update`, `prop_online/offline`) and session management (`session_cmd`). Props report sensor triggers and receive commands like `force_solve` and `reset`.

## Related Projects

- **GM Manager** (`c:\02 - GM Manager\escapeRoomManager`) — React dashboard for Game Masters. Connects to Room Controller via WebSocket. Displays props timeline, manages sessions, hints, audio, and statistics.
- **Leonie Game** (`c:\09 - Leonie Game`) — Unrelated project (Babylon.js 3D horse riding game with Colyseus multiplayer).
