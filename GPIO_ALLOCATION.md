# GPIO Pin Allocation - Mission: Hollywood

Raspberry Pi has **28 usable GPIO pins** (BCM numbering: GPIO 2-27).

## Strategy: Sequential Pin Sharing

Puzzles are solved sequentially (not simultaneously), so different puzzles can share the same GPIO pins safely. When one puzzle ends, its GPIO pins are freed for the next puzzle.

---

## Master Pin Allocation Table

| GPIO Pin | Puzzle 1 (Simon) | Puzzle 2 (Map) | Puzzle 3 (Gadget) | Puzzle 4 (Vehicle) | Puzzle 5 (Missile) |
|----------|------------------|----------------|-------------------|--------------------|---------------------|
| **0** | **LED 4** | — | — | — | — |
| **1** | **LED 3** | — | — | — | — |
| **2** | — | — | — | Lever1 Pos2 | — |
| **3** | — | — | — | Lever1 Pos4 | — |
| **4** | — | — | — | Lever1 Pos8 | — |
| **5** | — | — | — | Nav Left | — |
| **6** | — | — | — | Nav Right | — |
| **7** | — | — | — | Lever2 Pos3 | — |
| **8** | — | — | — | Lever2 Pos7 | — |
| **9** | — | — | — | Lever2 Pos9 | — |
| **10** | — | — | — | Lever3 Pos2 | — |
| **11** | — | — | — | Lever3 Pos4 | — |
| **12** | — | — | **LED 3** | — | — |
| **13** | — | — | — | Validate Btn | — |
| **14** | — | — | — | Lever3 Pos8 | — |
| **15** | — | — | — | Lever4 Pos1 | — |
| **16** | **Button 1 IN** | X Encoder CLK | — | — | **Joystick Up** |
| **17** | — | — | **Keypad D0** | — | — |
| **18** | — | — | — | Lever4 Pos5 | — |
| **19** | **Button 2 IN** | Y Encoder CLK | — | — | **Joystick Left** |
| **20** | **Button 3 IN** | X Encoder DT | — | — | **Joystick Down** |
| **21** | — | — | — | Lever4 Pos6 | — |
| **22** | **LED 1** | — | — | — | — |
| **23** | **LED 2** | — | — | — | — |
| **24** | — | — | **LED 1** | — | — |
| **25** | — | — | **LED 2** | — | — |
| **26** | **Button 4 IN** | Y Encoder DT | — | — | **Joystick Right** |
| **27** | — | — | **Keypad D1** | — | — |

---

## Pin Sharing Groups

### Group A: Puzzle 1 (Simon) ↔ Puzzle 2 (World Map) ↔ Puzzle 5 (Missile)
**Shared pins:** GPIO 16, 19, 20, 26

| Pin | Puzzle 1 Use | Puzzle 2 Use | Puzzle 5 Use |
|-----|--------------|--------------|--------------|
| GPIO 16 | Button 1 Input | X Encoder CLK | Joystick Up |
| GPIO 19 | Button 2 Input | Y Encoder CLK | Joystick Left |
| GPIO 20 | Button 3 Input | X Encoder DT | Joystick Down |
| GPIO 26 | Button 4 Input | Y Encoder DT | Joystick Right |

**Why it works:** All three puzzles run sequentially (1 → 2 → 5). When one puzzle ends, its GPIO pins are freed for the next puzzle. Puzzles 2 and 5 also share the same world map display (HDMI 1).

---

## Total Pin Usage

### Without Sharing:
- Puzzle 1: 8 pins (4 buttons + 4 LEDs)
- Puzzle 2: 4 pins
- Puzzle 3: 5 pins
- Puzzle 4: 15 pins
- Puzzle 5: 4 pins
- **Total: 36 pins** ❌ (exceeds 28 available)

### With Sharing:
- Puzzle 1: 8 pins (4 button inputs shared with Puzzle 2 & 5, 4 LED outputs unique)
- Puzzle 2: 4 pins (all shared with Puzzle 1 & 5)
- Puzzle 3: 5 pins (unique)
- Puzzle 4: 15 pins (unique)
- Puzzle 5: 4 pins (all shared with Puzzle 1 & 2)
- **Total unique pins: 24 pins** ✅ (within capacity!)

---

## Pin Assignment by Puzzle

### Puzzle 1: Simon Game (8 pins: 4 shared, 4 unique)
Classic 4-button configuration (red, blue, green, yellow):
- Button 1 Input: GPIO 16 (shared with Puzzle 2 & 5)
- Button 2 Input: GPIO 19 (shared with Puzzle 2 & 5)
- Button 3 Input: GPIO 20 (shared with Puzzle 2 & 5)
- Button 4 Input: GPIO 26 (shared with Puzzle 2 & 5)
- LED 1 Output: GPIO 22 (unique)
- LED 2 Output: GPIO 23 (unique)
- LED 3 Output: GPIO 1 (unique, safe to use - no HAT EEPROM)
- LED 4 Output: GPIO 0 (unique, safe to use - no HAT EEPROM)

### Puzzle 2: World Map Locator (4 pins - all shared)
- X Encoder CLK: GPIO 16 (shared with Puzzle 1 & 5)
- X Encoder DT: GPIO 20 (shared with Puzzle 1 & 5)
- Y Encoder CLK: GPIO 19 (shared with Puzzle 1 & 5)
- Y Encoder DT: GPIO 26 (shared with Puzzle 1 & 5)

### Puzzle 3: Gadget Code (5 pins) - UNIQUE
- Keypad D0: GPIO 17
- Keypad D1: GPIO 27
- LED 1: GPIO 24
- LED 2: GPIO 25
- LED 3: GPIO 12

### Puzzle 4: Vehicle Selector (15 pins) - UNIQUE
- Nav Left: GPIO 5
- Nav Right: GPIO 6
- Validate: GPIO 13
- Lever 1 positions: GPIO 2, 3, 4
- Lever 2 positions: GPIO 7, 8, 9
- Lever 3 positions: GPIO 10, 11, 14
- Lever 4 positions: GPIO 15, 18, 21

### Puzzle 5: Missile Trajectory (4 pins)
- Joystick Up: GPIO 16 (shared with Puzzle 2)
- Joystick Down: GPIO 20 (shared with Puzzle 2)
- Joystick Left: GPIO 19 (shared with Puzzle 2)
- Joystick Right: GPIO 26 (shared with Puzzle 2)

---

## Implementation Notes

### Software Requirements
- No code changes needed! Puzzles already initialize/cleanup GPIO properly
- Each puzzle's `destroy()` method unexports GPIO pins, freeing them for the next puzzle
- Room Controller coordinates puzzle activation sequence

### Hardware Wiring
- Physical wires can be permanently connected to shared pins
- Only one puzzle's hardware is electrically active at a time
- No risk of conflicts as puzzles don't run simultaneously

### Validation
- Test each puzzle independently in dev mode
- Verify GPIO cleanup on puzzle completion
- Test full sequential playthrough to confirm no conflicts

---

## Reserved / Unavailable Pins

The following GPIO pins are typically reserved on Raspberry Pi:
- **GPIO 0, 1**: Reserved for I2C HAT EEPROM (safe to use if not using HATs with ID EEPROM)
- **GPIO 14, 15**: UART (console serial - but can be used as GPIO if serial console disabled)
- **GPIO 28-31**: Not broken out on 40-pin header

**Available pins:** GPIO 0-27 (28 pins)
**Used in this project:** 24 unique pins ✅

---

## Future Expansion

If more GPIO pins are needed:
- **I2C GPIO Expander (MCP23017)**: +16 pins via I2C (uses GPIO 2, 3)
- **SPI GPIO Expander (MCP23S17)**: +16 pins via SPI (uses GPIO 7-11)
- **Additional Raspberry Pi**: Daisy-chain multiple Pis via network
