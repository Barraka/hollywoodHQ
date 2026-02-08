# Puzzle 1: Simon Game — Documentation

## Overview
Classic 4-button Simon game with illuminated arcade buttons. Buttons blink in random sequence. Players must press each button when it lights up. Once all 4 buttons have been successfully pressed, the puzzle is solved and the HQ reactivates.

## Architecture
- **Port**: 3004
- **Display**: None required (can run headless or show web UI)
- **Hardware**: 4 arcade buttons with integrated LEDs (red, blue, green, yellow)
- **GPIO Requirements**: 8 pins (4 button inputs - shared with Puzzle 2 & 5, 4 LED outputs - unique)

## Game Mechanics

### States
1. **INACTIVE** — Waiting for GM activation (all LEDs off)
2. **ACTIVE** — Game running (buttons blinking randomly)
3. **SOLVED** — All buttons pressed (all LEDs solid)

### Gameplay Flow
1. GM activates puzzle via Room Controller → Enter ACTIVE state
2. Each of the 4 buttons blinks at its own random interval (1-3 seconds between blinks)
3. When a button lights up, player must press it
4. **Correct press** (button is lit): LED stays on permanently, button "locked", +1 progress
5. **Wrong press** (button not lit): All LEDs flash briefly, no penalty, game continues
6. When all 4 buttons locked → SOLVED

### Difficulty
- **1/10**: Simple pattern recognition, no time pressure
- Players have unlimited time to press each lit button
- Wrong presses have no penalty (just visual feedback)

## Commands

### Development (Mock Mode)
```bash
npm install
npm run dev
```
Open http://localhost:3004

**Mock Controls:**
- Click buttons directly to simulate presses
- Number keys 1-4 for buttons 1-4
- X = Activate puzzle
- C = Reset
- V = Force solve (GM cheat)

### Production (Raspberry Pi)
```bash
npm install
npm start
```

## GPIO Pin Mapping (BCM)

| Button | Button Pin | LED Pin | Color  | Pin Sharing |
|--------|-----------|---------|--------|-------------|
| 1      | GPIO 16   | GPIO 22 | Red    | Shared with Puzzle 2 & 5 |
| 2      | GPIO 19   | GPIO 23 | Blue   | Shared with Puzzle 2 & 5 |
| 3      | GPIO 20   | GPIO 1  | Green  | Shared with Puzzle 2 & 5 |
| 4      | GPIO 26   | GPIO 0  | Yellow | Shared with Puzzle 2 & 5 |

**Pin Sharing Note:** Button input pins are safely reused from Puzzles 2 (Encoders) and 5 (Joystick) since puzzles run sequentially, not simultaneously. LED output pins are unique to this puzzle.

**Wiring:**
- **Button**: Connect between GPIO pin and GND (internal pull-up enabled)
- **LED**: GPIO → 220Ω resistor → LED + → LED - → GND

## Hardware Recommendations

### Arcade Buttons
- **Size**: 45mm or 60mm diameter
- **Type**: Momentary push button with built-in LED
- **Voltage**: 5V or 12V LEDs (check resistor requirements)
- **Quantity**: 4 buttons (classic Simon colors)
  - 1x Red
  - 1x Blue
  - 1x Green
  - 1x Yellow

### Suppliers
- **Recommended**: AliExpress illuminated arcade buttons
  - Example: https://fr.aliexpress.com/item/1005008660895310.html
- Amazon/AliExpress: "45mm LED arcade button"
- Adafruit: #3432 (30mm LED arcade button)
- SparkFun: COM-09336

### Cost Estimate
- Buttons: $3-4 each × 4 = $12-16
- Resistors (220Ω): ~$2 for pack
- Wire: ~$5
- **Total**: ~$20-25

## Configuration (`config.js`)

```javascript
module.exports = {
  httpPort: 3004,

  // Classic 4-button Simon game
  // Button pins shared with Puzzle 2 & 5 (sequential execution)
  buttons: [
    { id: 1, buttonPin: 16, ledPin: 22, color: 'red' },
    { id: 2, buttonPin: 19, ledPin: 23, color: 'blue' },
    { id: 3, buttonPin: 20, ledPin: 1,  color: 'green' },
    { id: 4, buttonPin: 26, ledPin: 0,  color: 'yellow' },
  ],

  // Timing (milliseconds)
  blinkIntervalMin: 1000,
  blinkIntervalMax: 3000,
  blinkDuration: 600,
  wrongFlashDuration: 300,

  roomControllerUrl: null,
  propId: 'puzzle-1-simon',
};
```

## Room Controller Integration

Set `roomControllerUrl` to integrate with GM dashboard:
```javascript
roomControllerUrl: 'ws://192.168.1.100:8080'
```

Events sent to Room Controller:
- `puzzle:state` — State changes (inactive/active/solved)
- `puzzle:progress` — Button press updates

Commands received from Room Controller:
- `activate` — Start puzzle
- `reset` — Return to inactive state
- `forceSolve` — Admin solve (testing/demos)

## Troubleshooting

### Buttons not responding
- Check GPIO pin wiring (BCM vs. BOARD numbering)
- Verify `onoff` package installed: `npm install onoff`
- Test individual pins with `gpiotest` utility

### LEDs not lighting
- Check resistor values (220Ω recommended for 5V)
- Verify LED polarity (+ to resistor, - to GND)
- Test LED directly with 3.3V/5V + resistor

### Mock mode not working
- Ensure `--mock` flag in command: `npm run dev`
- Check browser console for WebSocket errors
- Verify port 3004 not in use: `lsof -i :3004`

## Files Overview

```
puzzle-1-simon/
├── config.js              # Configuration (GPIO, timing)
├── package.json
├── server/
│   ├── index.js          # HTTP + WebSocket server
│   ├── puzzleLogic.js    # Game state machine
│   └── buttons.js        # GPIO button/LED manager
├── public/
│   ├── index.html        # UI layout + styles
│   └── app.js            # Frontend logic
└── CLAUDE.md             # This file
```

## Next Steps

1. Order arcade buttons (see Hardware Recommendations)
2. Test in mock mode: `npm run dev`
3. Wire buttons to GPIO according to pin mapping
4. Test on Raspberry Pi: `npm start`
5. Integrate with Room Controller
6. Mount buttons in escape room console panel
