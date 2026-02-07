# Puzzle 3 — Gadget Code

## Overview

After solving the World Map Locator, a secret trap opens revealing spy gadgets behind a plexiglass screen. Each gadget has a label (e.g. "James Bond Watch") and a 4-digit code printed next to it. On a separate screen, a virtual assistant (AI-generated video) presents 3 situations one by one. For each situation, players must figure out which gadget is the right one and type its 4-digit code on a physical numpad. A correct code lights one of 3 physical LEDs green. After all 3 are lit, the puzzle is solved.

## Hardware

| Component | Details |
|---|---|
| Board | Same Raspberry Pi 4/5 as Puzzle 2 (shared) |
| Screen | Second console monitor via HDMI 2 — plays video clips of the virtual assistant |
| Numpad | USB numpad (shows up as keyboard, no GPIO wiring needed) |
| LEDs | 3x LEDs controlled via GPIO (one per situation) |
| Gadgets | Physical props behind plexiglass with labels and 4-digit codes. Players cannot touch them. |

## Video Clips

All clips are AI-generated videos of the virtual assistant. Stored as files on the Pi.

| Clip | Trigger | Description |
|---|---|---|
| `intro.mp4` | Puzzle activates | Assistant introduces themselves, explains that players must select the right gadgets |
| `situation-1.mp4` | After intro ends | Describes the first situation |
| `situation-2.mp4` | After code 1 correct | Describes the second situation |
| `situation-3.mp4` | After code 2 correct | Describes the third situation |
| `correct.mp4` | Correct code entered | "Good choice!" / confirmation feedback |
| `wrong.mp4` | Wrong code entered | "No, this tool is not useful in this situation!" |
| `solved.mp4` | All 3 codes correct | Congratulations, transition to next puzzle |
| `idle.mp4` | Between clips | Short looping clip of assistant waiting/looking at camera (3-5 seconds) |

## Software Architecture

### Runs on the same Pi as Puzzle 2

The Node.js server manages both puzzles. Puzzle 3 activates when Puzzle 2 is solved.

### Data Flow

```
USB Numpad (keyboard input)
      │
      ▼
  puzzleLogic  ──▶  GPIO: light LED
      │
      ▼
  WebSocket server
      │
      ▼
  Browser (HDMI 2)
  plays video clip
```

1. Player types 4 digits on the numpad + Enter to submit.
2. Backend checks the code against the expected answer for the current situation.
3. If **correct**: GPIO lights the corresponding LED, sends "play correct.mp4" to browser, then after clip ends sends "play situation-N.mp4" for the next situation (or "play solved.mp4" if all 3 done).
4. If **wrong**: sends "play wrong.mp4" to browser, then returns to idle after clip ends.
5. Browser plays videos fullscreen and loops `idle.mp4` between clips.

### Input Handling

USB numpad appears as a standard keyboard device. In the browser, listen for keydown events on digit keys (0-9) and Enter. Buffer digits as they're typed. On Enter, send the buffered code to the server via WebSocket.

Alternative: read numpad input server-side via `readline` on stdin (if running in a terminal) or via a raw HID library. Browser-based is simpler since the kiosk browser has focus.

### State Machine

```
[INACTIVE] ──(puzzle 2 solved)──▶ [INTRO]
    │                                │
    │                          (intro ends)
    │                                │
    │                                ▼
    │                          [SITUATION 1] ◄──(wrong code)──┐
    │                                │                        │
    │                          (correct code)                 │
    │                                │                        │
    │                                ▼                        │
    │                          [SITUATION 2] ◄──(wrong code)──┐
    │                                │                        │
    │                          (correct code)                 │
    │                                │                        │
    │                                ▼                        │
    │                          [SITUATION 3] ◄──(wrong code)──┘
    │                                │
    │                          (correct code)
    │                                │
    │                                ▼
    │                            [SOLVED]
    │                                │
    └────────(reset command)─────────┘
```

## Configuration

| Parameter | Description | Example |
|---|---|---|
| `situations` | Array of 3 objects: `{video, correctCode}` | `[{video: 'situation-1.mp4', correctCode: '4729'}, ...]` |
| `videos.intro` | Intro clip filename | `'intro.mp4'` |
| `videos.correct` | Correct feedback clip | `'correct.mp4'` |
| `videos.wrong` | Wrong feedback clip | `'wrong.mp4'` |
| `videos.solved` | Solved/transition clip | `'solved.mp4'` |
| `videos.idle` | Idle loop clip | `'idle.mp4'` |
| `ledPins` | GPIO pin numbers for the 3 LEDs | `[24, 25, 12]` |
| `codeLength` | Number of digits per code | `4` |

## Display Behavior

- Videos play **fullscreen** in the browser (Chromium kiosk on HDMI 2).
- Between action clips, `idle.mp4` loops seamlessly.
- During idle, a subtle HUD overlay could show the current situation number and which diodes are lit (mirroring the physical LEDs), but this is optional.
- The numpad input could optionally be shown on screen as dots (●●○○ for 2 of 4 digits entered) to give visual feedback that the system is receiving input.

## LED Behavior

- On puzzle activate: all 3 LEDs off.
- On correct code for situation N: LED N turns green (stays on permanently).
- On reset: all LEDs turn off, state returns to INACTIVE.

## Room Controller Integration

- Reports as a standard prop with states: `inactive`, `active`, `solved`.
- Accepts `force_solve` (lights all 3 LEDs, plays solved clip) and `reset` commands.
- Reports sensor events: `code_entered` with result (correct/wrong).

## Placeholder Video Clips

For development/testing, use simple colored screens with text overlays (e.g. white text on dark background: "SITUATION 1: You need to cut through a reinforced door..."). Replace with AI-generated videos later.
