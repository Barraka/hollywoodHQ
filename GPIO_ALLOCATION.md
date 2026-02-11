# GPIO Pin Allocation - Mission: Hollywood

**2 Raspberry Pi Setup:**
- **Props Pi (#1)**: Puzzles 1, 2, 5 - Physical props, world map display
- **Narrative Pi (#2)**: Puzzles 3, 4 - Story screen, guidance

Each Raspberry Pi has **28 usable GPIO pins** (BCM numbering: GPIO 0-27).

## Strategy: 2-Pi Distribution + Sequential Pin Sharing

- **Distribution**: Props vs Narrative puzzles split across 2 Pis (20 pins each)
- **Sequential Sharing**: Props Pi shares GPIO 16, 19, 20, 26 across Puzzles 1, 2, 5 (safe - puzzles run sequentially)

---

## Props Pi (Raspberry Pi #1) - Pin Allocation

**Puzzles**: 1 (Simon), 2 (World Map), 5 (Missile)

| GPIO Pin | Puzzle 1 (Simon) | Puzzle 2 (Map) | Puzzle 5 (Missile) |
|----------|------------------|----------------|---------------------|
| **0** | **Button 1 LED** | — | — |
| **1** | **Button 2 LED** | — | — |
| **2** | **Button 5 LED** | — | — |
| **3** | **Button 6 LED** | — | — |
| **4** | **Button 7 LED** | — | — |
| **5** | **Button 5 IN** | — | — |
| **6** | **Button 6 IN** | — | — |
| **7** | **Button 8 LED** | — | — |
| **8** | **Button 9 LED** | — | — |
| **9** | **Button 10 LED** | — | — |
| **12** | — | — | **Explosion Button** |
| **13** | **Button 7 IN** | — | — |
| **14** | **Button 10 IN** | — | — |
| **16** | **Button 1 IN** | **X Encoder CLK** | **Joystick Up** |
| **17** | **Button 9 IN** | — | — |
| **19** | **Button 2 IN** | **Y Encoder CLK** | **Joystick Left** |
| **20** | **Button 3 IN** | **X Encoder DT** | **Joystick Down** |
| **22** | **Button 3 LED** | — | — |
| **23** | **Button 4 LED** | — | — |
| **26** | **Button 4 IN** | **Y Encoder DT** | **Joystick Right** |
| **27** | **Button 8 IN** | — | — |

**Total Props Pi Pins**: 21 (17 unique + 4 shared) ✅

---

## Narrative Pi (Raspberry Pi #2) - Pin Allocation

**Puzzles**: 3 (Gadget Code), 4 (Vehicle Selector)

| GPIO Pin | Puzzle 3 (Gadget) | Puzzle 4 (Vehicle) |
|----------|-------------------|--------------------|
| **2** | — | Lever1 Pos2 |
| **3** | — | Lever1 Pos4 |
| **4** | — | Lever1 Pos8 |
| **5** | — | Nav Left |
| **6** | — | Nav Right |
| **7** | — | Lever2 Pos3 |
| **8** | — | Lever2 Pos7 |
| **9** | — | Lever2 Pos9 |
| **10** | — | Lever3 Pos2 |
| **11** | — | Lever3 Pos4 |
| **12** | **LED 3** | — |
| **13** | — | Validate Btn |
| **14** | — | Lever3 Pos8 |
| **15** | — | Lever4 Pos1 |
| **17** | **Keypad D0** | — |
| **18** | — | Lever4 Pos5 |
| **21** | — | Lever4 Pos6 |
| **24** | **LED 1** | — |
| **25** | **LED 2** | — |
| **27** | **Keypad D1** | — |

**Total Narrative Pi Pins**: 20 (all unique) ✅

---

## Pin Sharing (Props Pi Only)

### Shared pins: GPIO 16, 19, 20, 26

**Puzzles 1, 2, 5 share these 4 pins on Props Pi:**

| Pin | Puzzle 1 Use | Puzzle 2 Use | Puzzle 5 Use |
|-----|--------------|--------------|--------------|
| GPIO 16 | Button 1 Input | X Encoder CLK | Joystick Up |
| GPIO 19 | Button 2 Input | Y Encoder CLK | Joystick Left |
| GPIO 20 | Button 3 Input | X Encoder DT | Joystick Down |
| GPIO 26 | Button 4 Input | Y Encoder DT | Joystick Right |

**Why it works:** All three puzzles run sequentially (1 → 2 → 5) on the same Pi. When one puzzle ends, its GPIO pins are freed for the next puzzle. Puzzles 2 and 5 also share the same world map display.

---

## Total Pin Usage

### Without 2-Pi Distribution (Single Pi):
- Puzzle 1: 20 pins (10 buttons + 10 LEDs)
- Puzzle 2: 4 pins
- Puzzle 3: 5 pins
- Puzzle 4: 15 pins
- Puzzle 5: 4 pins
- **Total: 48 pins** ❌❌ (exceeds 28 available by 20!)

### With 2-Pi Distribution:

**Props Pi:**
- Puzzle 1: 16 unique pins (10 button inputs: 4 shared + 6 unique, 10 LED outputs)
- Puzzle 2: 4 shared pins (with Puzzle 1 & 5)
- Puzzle 5: 4 shared pins (with Puzzle 1 & 2) + 1 unique (explosion button GPIO 12)
- **Props Pi Total: 21 pins** ✅

**Narrative Pi:**
- Puzzle 3: 5 pins (2 keypad + 3 LEDs)
- Puzzle 4: 15 pins (12 levers + 3 buttons)
- **Narrative Pi Total: 20 pins** ✅

**Both Pis within 28-pin capacity!** 🎉

---

## Pin Assignment by Puzzle

### Props Pi (Raspberry Pi #1)

#### Puzzle 1: Simon Game (20 pins: 4 button inputs shared, 6 button inputs unique, 10 LED outputs unique)
10-button configuration (all same color):
- Button 1 Input: GPIO 16 (shared with P2 & P5), LED: GPIO 0
- Button 2 Input: GPIO 19 (shared with P2 & P5), LED: GPIO 1
- Button 3 Input: GPIO 20 (shared with P2 & P5), LED: GPIO 22
- Button 4 Input: GPIO 26 (shared with P2 & P5), LED: GPIO 23
- Button 5 Input: GPIO 5 (unique), LED: GPIO 2
- Button 6 Input: GPIO 6 (unique), LED: GPIO 3
- Button 7 Input: GPIO 13 (unique), LED: GPIO 4
- Button 8 Input: GPIO 27 (unique), LED: GPIO 7
- Button 9 Input: GPIO 17 (unique), LED: GPIO 8
- Button 10 Input: GPIO 14 (unique), LED: GPIO 9

#### Puzzle 2: World Map Locator (4 pins - all shared with P1 & P5)
- X Encoder CLK: GPIO 16, DT: GPIO 20
- Y Encoder CLK: GPIO 19, DT: GPIO 26

#### Puzzle 5: Missile Trajectory (5 pins - 4 shared with P1 & P2, 1 unique)
- Joystick Up: GPIO 16, Down: GPIO 20
- Joystick Left: GPIO 19, Right: GPIO 26
- Explosion Button (big red button): GPIO 12 (unique, dedicated)

### Narrative Pi (Raspberry Pi #2)

#### Puzzle 3: Gadget Code (5 pins - all unique)
- Keypad D0: GPIO 17, D1: GPIO 27
- LED 1: GPIO 24, LED 2: GPIO 25, LED 3: GPIO 12

#### Puzzle 4: Vehicle Selector (15 pins - all unique)
- Nav Left: GPIO 5, Nav Right: GPIO 6, Validate: GPIO 13
- Lever 1 positions: GPIO 2, 3, 4
- Lever 2 positions: GPIO 7, 8, 9
- Lever 3 positions: GPIO 10, 11, 14
- Lever 4 positions: GPIO 15, 18, 21

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
