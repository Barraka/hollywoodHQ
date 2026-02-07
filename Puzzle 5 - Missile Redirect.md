# Puzzle 5 — Missile Redirect

## Overview

The villain has launched a missile in retaliation for Tim's escape. On the world map screen (same as Puzzle 2), players see the missile's trajectory — a sequence of straight-line hops between major cities, each in a cardinal direction (left, right, up, or down). The missile animates forward through all waypoints to its final target. Then players must use a joystick to reverse the missile's path, sending it back to the villain's origin. Each joystick push must match the correct reverse direction for that leg. When the missile reaches the origin, players win the game.

## Hardware

| Component | Details |
|---|---|
| Board | Same Raspberry Pi as other puzzles (shared) |
| Screen | Same monitor as Puzzle 2 (HDMI 1) — world map with missile overlay |
| Joystick | 4-direction digital joystick via GPIO (up/down/left/right micro-switches) |

## Missile Path

The path is a sequence of cities connected by cardinal direction hops:

```
City A ──(right)──▶ City B ──(down)──▶ City C ──(left)──▶ City D ──(up)──▶ City E ...
```

To reverse: players must input the opposite directions in reverse order:
```
... City E ──(down)──▶ City D ──(right)──▶ City C ──(up)──▶ City B ──(left)──▶ City A
```

Each city is a waypoint on the world map with SVG coordinates. Directions between cities must be clearly cardinal (no diagonal movement). The path is configurable.

## Software Architecture

### Data Flow

```
Joystick (GPIO / arrow keys)
      │
      ▼
  puzzleLogic checks direction against expected reverse
      │
      ├─ correct → animate missile to next city, advance
      └─ wrong → flash feedback, stay at current city
      │
      ▼
  WebSocket → Browser animates missile on map
```

### State Machine

```
[INACTIVE] ──(activate)──▶ [FORWARD_ANIMATION]
                                  │
                            (animation complete)
                                  │
                                  ▼
                            [REVERSING] ◄──(wrong input)──┐
                                  │                        │
                            (correct input)                │
                                  │                        │
                                  ▼                        │
                            [ANIMATE_LEG]─────────────────┘
                                  │
                            (all legs reversed)
                                  │
                                  ▼
                              [SOLVED]
```

### Input Handling

4-direction digital joystick: four GPIO pins (one per direction), read as buttons with debounce. In mock mode, arrow keys.

### Display Behavior

- World map fullscreen (same SVG as Puzzle 2, same spy HQ styling).
- Missile trajectory drawn as a dashed/glowing line connecting all waypoint cities.
- Animated missile marker (pulsing dot/icon) moves along the path.
- Forward animation plays automatically when puzzle activates.
- During reversing: current city highlighted, expected direction subtly hinted (or not, for difficulty).
- Each correct input animates the missile back one leg.
- Wrong input: red flash, missile stays.
- On solved: celebration effect, all trajectory lines turn green.

## Configuration

| Parameter | Description | Example |
|---|---|---|
| `path` | Array of waypoint objects: `{name, x, y}` | `[{name: 'Berlin', x: 406.4, y: 386.8}, ...]` |
| `directions` | Array of directions for each leg (length = path.length - 1) | `['right', 'down', 'left', 'up', ...]` |
| `forwardAnimDuration` | Seconds for the full forward animation | `8` |
| `legAnimDuration` | Seconds to animate one leg (during reverse) | `1` |
| `joystickPins` | GPIO pins for up/down/left/right | `{up: 16, down: 20, left: 19, right: 26}` |

## Mock Mode (Development)

- Arrow keys: joystick input
- X: activate puzzle
- C: reset
- V: force solve

## Reuse from Puzzle 2

- Same world map SVG
- Same spy HQ CSS styling (dark background, cyan glow, grid, scanlines, vignette)
- Same city dot positions
- Additional: missile trajectory overlay, missile marker animation
