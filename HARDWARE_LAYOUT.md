# Hardware Layout — Mission: Hollywood

This document describes the complete physical setup of the escape room's secret HQ.
For GPIO pin-level wiring details, see [GPIO_ALLOCATION.md](GPIO_ALLOCATION.md).

---

## Room Overview

The HQ console contains **2 screens**, **2 Raspberry Pi units**, and various physical controls.
Each Pi drives one screen and a set of puzzle hardware. Puzzles run sequentially (1 → 2 → 3 → 4 → 5).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SECRET HQ CONSOLE                              │
│                                                                        │
│   ┌───────────────────────┐           ┌───────────────────────┐        │
│   │                       │           │                       │        │
│   │   WORLD MAP SCREEN    │           │  VIRTUAL ASSISTANT    │        │
│   │   (Props Pi HDMI)     │           │  SCREEN               │        │
│   │                       │           │  (Narrative Pi HDMI)  │        │
│   │   Puzzles 1, 2, 5     │           │  Puzzles 3, 4         │        │
│   │                       │           │                       │        │
│   └───────────────────────┘           └───────────────────────┘        │
│                                                                        │
│   [BTN][BTN][BTN][BTN][BTN]    [NUMPAD]  [O][O][O]   [LEVER x4]      │
│   [BTN][BTN][BTN][BTN][BTN]              LEDs        [< ] [ >]        │
│                                                       [VALIDATE]       │
│   [ENCODER X] [ENCODER Y]     [JOYSTICK]                              │
│                                                                        │
│   (HEADSET 1) (HEADSET 2)                                             │
│                                                                        │
└─────────────────────────────────────────────────────────────────────────┘

  Props Pi (hidden)                            Narrative Pi (hidden)
  behind/under console                         behind/under console
```

---

## The 2 Raspberry Pi Units

### Props Pi (#1) — "The Map Pi"

**Role:** Drives the world map screen and all physical props that interact with it.

| | Details |
|---|---|
| **IP Address** | 192.168.1.10 |
| **Screen** | World map display (PC monitor recommended, 22-27") |
| **HDMI port** | Micro-HDMI → HDMI cable to screen |
| **Puzzles** | 1 (Simon), 2 (World Map), 5 (Missile) |
| **GPIO pins used** | 21 (17 unique + 4 shared across puzzles) |

**Connected hardware:**

| Hardware | Puzzle | What it does |
|---|---|---|
| 10x illuminated arcade buttons | Puzzle 1 (Simon) | Players press buttons when they light up |
| 2x KY-040 rotary encoders | Puzzle 2 (World Map) | Turn knobs to move crosshair on map |
| 2x headsets (audio jack) | Puzzle 2 (World Map) | Audio beep feedback (faster = closer) |
| 1x 8-way arcade joystick | Puzzle 5 (Missile) | Steer missile backwards through cities |
| 1x big red button | Puzzle 5 (Missile) | Press to trigger explosion after missile reversal |

**What the screen shows per puzzle:**

| Puzzle | Screen content |
|---|---|
| Before Puzzle 1 | Inactive / scrambled / static |
| Puzzle 1 (Simon) | Can show web UI or stay dark — buttons are the focus |
| Puzzle 2 (World Map) | World map with moving crosshair lines |
| Puzzle 5 (Missile) | Same world map with missile trajectory and animated missile |

---

### Narrative Pi (#2) — "The Assistant Pi"

**Role:** Drives the story/guidance screen showing the virtual assistant and vehicle viewer.

| | Details |
|---|---|
| **IP Address** | 192.168.1.11 |
| **Screen** | Story/assistant display (PC monitor recommended, 22-27") |
| **HDMI port** | Micro-HDMI → HDMI cable to screen |
| **Puzzles** | 3 (Gadget Code), 4 (Vehicle Selector) |
| **GPIO pins used** | 20 (all unique, no sharing needed) |

**Connected hardware:**

| Hardware | Puzzle | What it does |
|---|---|---|
| 1x Wiegand RFID keypad | Puzzle 3 (Gadget Code) | Players type 4-digit gadget codes |
| 3x green LEDs | Puzzle 3 (Gadget Code) | Light up when a correct code is entered |
| 4x 10-position rotary switches (levers) | Puzzle 4 (Vehicle) | Players set a 4-digit vehicle code |
| 2x navigation buttons (left/right) | Puzzle 4 (Vehicle) | Browse through vehicles |
| 1x validate button | Puzzle 4 (Vehicle) | Submit the lever code |

**What the screen shows per puzzle:**

| Puzzle | Screen content |
|---|---|
| Puzzle 3 (Gadget Code) | Virtual assistant video clips explaining situations, feedback on code entry |
| Puzzle 4 (Vehicle) | Spinning 3D vehicle viewer, assistant feedback on validation |

---

## Screen Recommendations

Use **PC monitors** (not TVs) for both screens.

| Consideration | PC Monitor | TV |
|---|---|---|
| Pixel mapping | 1:1 (no cropping) | Often crops edges (overscan) |
| Input lag | Low | Higher (post-processing) |
| Boot behavior | Wakes on signal, no popups | May need remote to select input |
| Smart features | None (no interruptions) | Firmware updates, CEC, sleep modes |
| Mounting | VESA mount (easy to embed) | Bulkier |
| Recommended size | 22-27" | — |

**Requirements:**
- HDMI input (standard on modern monitors)
- 1920x1080 resolution (Full HD)
- No prominent branding (or hide bezel behind console frame)
- Speakers not required (Puzzle 2 uses headsets, Puzzle 3-4 can use external speakers)

---

## Optional: Ambiance Screen

To enhance the "secret HQ" atmosphere, add a small screen showing looping visuals (scrolling data, fake radar, surveillance grids, etc.).

**Recommended approach:** Use a monitor with **USB media playback**. Load a looping MP4 onto a USB stick and plug it directly into the monitor. This requires no Pi, no configuration, and survives power cycles perfectly.

Alternatively, any cheap media player (Android stick, etc.) can loop a video file.

---

## Network Setup

All devices connect to the same local network. No internet required during operation.

```
┌──────────────────────────────────────────────────────────┐
│                  Local Network (192.168.1.0/24)          │
│                                                          │
│  GM Laptop ── 192.168.1.100                              │
│  ├─ GM Dashboard (React web app)                         │
│  └─ Room Controller (WebSocket server on port 3001)      │
│                                                          │
│  Props Pi ── 192.168.1.10                                │
│  ├─ Puzzle 1 server (port 3004)                          │
│  ├─ Puzzle 2 server (port 3000)                          │
│  └─ Puzzle 5 server (port 3003)                          │
│                                                          │
│  Narrative Pi ── 192.168.1.11                            │
│  ├─ Puzzle 3 server (port 3001)                          │
│  └─ Puzzle 4 server (port 3002)                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Connection:** Ethernet cables (recommended for reliability) or WiFi.

---

## Power Requirements

| Device | Power supply | Notes |
|---|---|---|
| Props Pi (Raspberry Pi 5) | USB-C 5V/5A (official Pi 5 PSU) | Must be official or high-quality supply |
| Narrative Pi (Raspberry Pi 5) | USB-C 5V/5A (official Pi 5 PSU) | Same as above |
| World map screen | Monitor power cable | Depends on monitor model |
| Assistant screen | Monitor power cable | Depends on monitor model |
| Wiegand keypad (Puzzle 3) | External 12V DC adapter | Separate from Pi — only data lines connect to GPIO |
| Arcade button LEDs | Powered via Pi GPIO | Through 220 ohm resistors, no extra supply needed |
| Headsets (Puzzle 2) | Powered by Pi audio jack | No extra supply needed |

**Total power outlets needed:** 5 minimum (2 Pis + 2 monitors + 1 keypad PSU), plus any extras for ambiance screen, speakers, etc.

---

## Cable Checklist

### Props Pi

| Cable | From | To |
|---|---|---|
| HDMI (micro-HDMI to HDMI) | Props Pi HDMI port | World map monitor |
| Ethernet | Props Pi Ethernet port | Network switch/router |
| USB-C power | PSU | Props Pi power port |
| Audio jack (3.5mm splitter) | Props Pi audio out | 2x headsets |
| GPIO ribbon / jumper wires | Props Pi GPIO header | Breakout board → buttons, encoders, joystick |

### Narrative Pi

| Cable | From | To |
|---|---|---|
| HDMI (micro-HDMI to HDMI) | Narrative Pi HDMI port | Assistant monitor |
| Ethernet | Narrative Pi Ethernet port | Network switch/router |
| USB-C power | PSU | Narrative Pi power port |
| GPIO ribbon / jumper wires | Narrative Pi GPIO header | Breakout board → keypad, LEDs, levers, buttons |
| 12V DC power | Keypad PSU | Wiegand keypad |
| Keypad data lines (2 wires) | Keypad D0/D1 | Narrative Pi GPIO 17/27 |

---

## What Happens on Boot

Both Pis are configured to auto-start everything on power-on. **No GM action required.**

### Boot sequence (both Pis, ~30 seconds):

1. Pi powers on
2. Linux boots
3. systemd starts all puzzle Node.js servers
4. systemd launches Chromium in fullscreen kiosk mode
5. Chromium opens the active puzzle's web page
6. Puzzle connects to Room Controller (if configured)
7. Screen shows puzzle UI — ready for play

### What the GM sees on their dashboard:

Once both Pis finish booting, the GM dashboard shows all 5 puzzles as "online" with status indicators. The GM activates Puzzle 1 to start the game.

---

## Puzzle Activation Flow

Puzzles activate **sequentially** via the Room Controller. The GM activates Puzzle 1; after that, each solved puzzle triggers the next.

| Step | What happens | Props Pi screen | Narrative Pi screen |
|---|---|---|---|
| GM starts game | Puzzle 1 activates | Buttons start blinking | Idle / waiting |
| Puzzle 1 solved | Puzzle 2 activates | World map with crosshair | Idle / waiting |
| Puzzle 2 solved | Puzzle 3 activates | Map stays (or dims) | Virtual assistant intro |
| Puzzle 3 solved | Puzzle 4 activates | Map stays (or dims) | Vehicle viewer |
| Puzzle 4 solved | Puzzle 5 activates | Missile trajectory on map | Victory message / idle |
| Puzzle 5 solved | Game won | Victory animation | Victory animation |

---

## Quick Troubleshooting (for GMs)

| Problem | What to do |
|---|---|
| Screen is black after boot | Wait 30 seconds. If still black, check HDMI cable is plugged in and monitor is on |
| Puzzle not showing as online | Check Ethernet cable. Reboot the Pi (unplug power, wait 5 seconds, replug) |
| Buttons not responding | Check that the correct puzzle is active in the GM dashboard |
| Screen shows desktop instead of puzzle | Reboot the Pi — kiosk mode should restart automatically |
| Need to restart a single puzzle | SSH into Pi and run: `sudo systemctl restart puzzle-X-name` |

For advanced troubleshooting, see [raspberry-pi/README.md](raspberry-pi/README.md).

---

## Physical Placement Summary

| Item | Location | Hidden? |
|---|---|---|
| Props Pi | Behind or under the console | Yes — not visible to players |
| Narrative Pi | Behind or under the console | Yes — not visible to players |
| World map monitor | Embedded in console (left) | Bezel hidden by console frame |
| Assistant monitor | Embedded in console (right) | Bezel hidden by console frame |
| 10 arcade buttons | Console surface | Visible — players interact |
| 2 rotary encoders | Console surface | Visible — players interact |
| 2 headsets | Hanging near console or on hooks | Visible — players use them |
| Numpad (keypad) | Console surface | Visible — players interact |
| 3 LEDs | Console surface near numpad | Visible — feedback to players |
| 4 levers | Console surface | Visible — players interact |
| Nav buttons (left/right) | Console surface near lever area | Visible — players interact |
| Validate button | Console surface near levers | Visible — players interact |
| Joystick | Console surface | Visible — players interact |
| Big red button (explosion) | Console surface near joystick | Visible — players press to detonate |
| Network switch | Behind console or in utility area | Yes — not visible |
| Power strip | Behind console | Yes — not visible |
| Ambiance screen (optional) | Mounted above or beside console | Visible — atmosphere only |
