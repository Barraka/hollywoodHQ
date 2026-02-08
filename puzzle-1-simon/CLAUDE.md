# Puzzle 1: Simon Game — Documentation

## Overview
10-button Simon game with illuminated arcade buttons (all same color). Buttons blink at random intervals. Players must press each button the moment it lights up. Once all 10 buttons have been successfully pressed, the puzzle is solved and the HQ reactivates.

## Architecture
- **Port**: 3004
- **Raspberry Pi**: Props Pi (#1) - Controls physical props, HDMI to world map
- **Display**: None required for this puzzle (can run headless or show web UI)
- **Hardware**: 10 arcade buttons with integrated LEDs (all same color - white/blue recommended)
- **GPIO Requirements**: 20 pins (10 button inputs: 4 shared + 6 unique, 10 LED outputs: all unique)

## Game Mechanics

### States
1. **INACTIVE** — Waiting for GM activation (all LEDs off)
2. **ACTIVE** — Game running (buttons blinking randomly)
3. **SOLVED** — All buttons pressed (all LEDs solid)

### Gameplay Flow
1. GM activates puzzle via Room Controller → Enter ACTIVE state
2. Each of the 10 buttons blinks at its own random interval (1-3 seconds between blinks)
3. When a button lights up, player must press it
4. **Correct press** (button is lit): LED stays on permanently, button "locked", +1 progress
5. **Wrong press** (button not lit): All LEDs flash briefly, no penalty, game continues
6. When all 10 buttons locked → SOLVED

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
- Number keys 1-9, 0 for buttons 1-10
- X = Activate puzzle
- C = Reset
- V = Force solve (GM cheat)

### Production (Raspberry Pi)
```bash
npm install
npm start
```

## GPIO Pin Mapping (BCM) - Props Pi

| Button | Button Pin | LED Pin | Pin Sharing |
|--------|-----------|---------|-------------|
| 1      | GPIO 16   | GPIO 0  | Button shared with Puzzle 2 & 5 |
| 2      | GPIO 19   | GPIO 1  | Button shared with Puzzle 2 & 5 |
| 3      | GPIO 20   | GPIO 22 | Button shared with Puzzle 2 & 5 |
| 4      | GPIO 26   | GPIO 23 | Button shared with Puzzle 2 & 5 |
| 5      | GPIO 5    | GPIO 2  | Unique |
| 6      | GPIO 6    | GPIO 3  | Unique |
| 7      | GPIO 13   | GPIO 4  | Unique |
| 8      | GPIO 27   | GPIO 7  | Unique |
| 9      | GPIO 17   | GPIO 8  | Unique |
| 10     | GPIO 14   | GPIO 9  | Unique |

**Pin Sharing Note:** Button input pins 1-4 (GPIO 16, 19, 20, 26) are safely reused from Puzzles 2 (Encoders) and 5 (Joystick) since puzzles run sequentially on the same Pi. All LED output pins are unique to this puzzle.

**Wiring:**
- **Button**: Connect between GPIO pin and GND (internal pull-up enabled)
- **LED**: GPIO → 220Ω resistor → LED + → LED - → GND

## Hardware Recommendations

### Arcade Buttons
- **Size**: 45mm or 60mm diameter
- **Type**: Momentary push button with built-in LED
- **Voltage**: 5V or 12V LEDs (check resistor requirements)
- **Color**: All same color (white or blue recommended for uniform appearance)
- **Quantity**: 10 buttons

### Suppliers
- **Recommended**: AliExpress illuminated arcade buttons
  - Example: https://fr.aliexpress.com/item/1005008660895310.html
- Amazon/AliExpress: "45mm LED arcade button"
- Adafruit: #3432 (30mm LED arcade button)
- SparkFun: COM-09336

### Cost Estimate
- Buttons: $3-4 each × 10 = $30-40
- Resistors (220Ω): ~$2 for pack
- Wire: ~$10
- **Total**: ~$42-52

## Configuration (`config.js`)

```javascript
module.exports = {
  httpPort: 3004,

  // 10-button Simon: All same color, press when lit
  // Runs on Props Pi, button pins 1-4 shared with Puzzle 2 & 5
  buttons: [
    { id: 1,  buttonPin: 16, ledPin: 0,  color: 'white' }, // Shared
    { id: 2,  buttonPin: 19, ledPin: 1,  color: 'white' }, // Shared
    { id: 3,  buttonPin: 20, ledPin: 22, color: 'white' }, // Shared
    { id: 4,  buttonPin: 26, ledPin: 23, color: 'white' }, // Shared
    { id: 5,  buttonPin: 5,  ledPin: 2,  color: 'white' }, // Unique
    // ... buttons 6-10
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
