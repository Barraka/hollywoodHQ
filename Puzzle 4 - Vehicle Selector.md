# Puzzle 4 — Vehicle Selector

## Overview

After solving the Gadget Code puzzle, the virtual assistant explains that players must select the correct escape vehicle for Tim. A dedicated screen shows a slowly spinning 3D view of a vehicle. Players navigate left/right through 5 vehicles. Each vehicle has a unique code. Players set 4 physical levers (5 positions each) to form a code and press a Validate button. If the code matches the correct vehicle, the puzzle is solved. Wrong vehicle → feedback, keep trying.

## Hardware

| Component | Details |
|---|---|
| Board | Same Raspberry Pi as other puzzles (shared) |
| Screen | Dedicated monitor (3rd screen) — shows spinning vehicle videos |
| Navigation | 2 physical buttons (left / right) via GPIO |
| Levers | 4 multi-position levers, 5 positions each, read via GPIO/ADC |
| Validate button | 1 physical button via GPIO |

## Vehicles

5 vehicles, each with:
- A looping video file (AI-generated slowly spinning 3D view)
- A name/label displayed on the HUD
- A 4-digit code (each digit 1–5, matching lever positions)

Only 1 vehicle is correct. The correct vehicle is configurable.

## Video Clips

| Clip | Description |
|---|---|
| `vehicle-1.mp4` through `vehicle-5.mp4` | Looping 3D spin of each vehicle |

The virtual assistant's intro and feedback clips (correct/wrong/solved) are handled by Puzzle 3's assistant screen. This puzzle only manages the vehicle viewer.

## Software Architecture

### Data Flow

```
Navigation buttons (GPIO / keyboard arrows)
      │
      ▼
  puzzleLogic  ──▶  WebSocket  ──▶  Browser switches vehicle video
      │
Lever positions (GPIO/ADC / keyboard)
      │
      ▼
  puzzleLogic  ──▶  WebSocket  ──▶  Browser updates lever display
      │
Validate button (GPIO / Enter key)
      │
      ▼
  puzzleLogic checks lever code against current vehicle
      │
      ├─ wrong vehicle → sends "wrong" feedback
      └─ correct vehicle → sends "solved", puzzle complete
```

### State Machine

```
[INACTIVE] ──(activate)──▶ [BROWSING]
                                │
                          (validate pressed)
                                │
                          ┌─ wrong? ──▶ show feedback, stay [BROWSING]
                          │
                          └─ correct? ──▶ [SOLVED]
                                │
[INACTIVE] ◄──(reset)──────────┘
```

### Input Handling

**Navigation buttons**: Two GPIO pins (one per button). In mock mode, Left/Right arrow keys.

**Levers**: In production, read via ADC (e.g., MCP3008 SPI) or multi-position rotary switches with digital GPIO per position. The server polls lever positions at regular intervals. In mock mode, keyboard shortcuts adjust lever values:
- Keys 1–4 select lever, Up/Down change position
- Or: Q/A = lever 1 up/down, W/S = lever 2, E/D = lever 3, R/F = lever 4

**Validate button**: One GPIO pin. In mock mode, Enter key.

## Configuration

| Parameter | Description | Example |
|---|---|---|
| `vehicles` | Array of vehicle objects | `[{name, video, code}, ...]` |
| `correctVehicleIndex` | Index of the correct vehicle (0-based) | `2` |
| `leverCount` | Number of levers | `4` |
| `leverPositions` | Positions per lever | `5` |
| `navigationPins` | GPIO pins for left/right buttons | `[5, 6]` |
| `validatePin` | GPIO pin for validate button | `13` |
| `leverPins` | GPIO/ADC config for levers | TBD |

## Display Behavior

- Vehicle video plays fullscreen, looping.
- HUD overlay shows:
  - Vehicle name (top center)
  - Navigation arrows / vehicle index (e.g., "◄ 2/5 ►")
  - 4 lever position indicators (bottom, showing current positions 1–5)
  - Feedback overlay on correct/wrong (green flash / red flash)
- Transitions between vehicles: crossfade or instant switch.

## Mock Mode (Development)

- Arrow keys: navigate vehicles
- Q/A, W/S, E/D, R/F: adjust levers 1–4 up/down
- Enter: validate
- X: activate puzzle
- C: reset puzzle
- V: force solve

## Placeholder Videos

For development, use simple colored backgrounds with vehicle name text (like Puzzle 3 placeholders). Replace with AI-generated spinning 3D vehicle videos later.
