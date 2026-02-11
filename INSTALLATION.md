# Installation Guide — Mission: Hollywood

Step-by-step instructions for setting up the complete escape room hardware.

---

## 1. Hardware Checklist

Before starting, verify you have everything:

### Raspberry Pi Units

| Unit | Model | RAM | SD Card | Power Supply |
|------|-------|-----|---------|-------------|
| Props Pi | Raspberry Pi 4 or 5 | 4GB+ | 32GB+ | USB-C 5V/5A (official PSU) |
| Narrative Pi | Raspberry Pi 4 or 5 | 4GB+ | 32GB+ | USB-C 5V/5A (official PSU) |
| Vehicle Pi Zero | Raspberry Pi Zero 2 W | 512MB | 16GB+ | USB 5V/2A |

### Screens (5 total)

| Screen | Size | Input | Connected To |
|--------|------|-------|-------------|
| World Map (central) | 22-27" | HDMI | Props Pi HDMI-0 |
| Villain (left) | 22-27" | HDMI | Narrative Pi HDMI-0 |
| Right (Tim Ferris + P3) | 22-27" | HDMI | Narrative Pi HDMI-1 |
| Immersion (small right) | 22-27" | HDMI | Props Pi HDMI-1 |
| Vehicle (small separate) | Any | HDMI | Vehicle Pi Zero |

Use **PC monitors** (not TVs) for 1:1 pixel mapping and no overscan.

### Puzzle Hardware

| Puzzle | Hardware | Qty |
|--------|----------|-----|
| 1 — Simon | Illuminated arcade buttons (45-60mm, same color, 5V LED) | 10 |
| 1 — Simon | 220 ohm resistors (for LEDs) | 10 |
| 2 — World Map | KY-040 rotary encoders | 2 |
| 2 — World Map | Headsets (3.5mm jack) | 2 |
| 2 — World Map | 3.5mm audio splitter | 1 |
| 3 — Gadget Code | Wiegand RFID keypad | 1 |
| 3 — Gadget Code | 12V DC power adapter (for keypad) | 1 |
| 3 — Gadget Code | Green LEDs (3-6V) | 3 |
| 3 — Gadget Code | 220 ohm resistors (for LEDs) | 3 |
| 4 — Vehicle | 10-position rotary cam switches (levers) | 4 |
| 4 — Vehicle | Navigation buttons (left/right) | 2 |
| 4 — Vehicle | Validate button | 1 |
| 5 — Missile | 8-way arcade joystick (EG STARTS or similar) | 1 |
| 5 — Missile | Big red button (explosion trigger) | 1 |

### Cables & Network

- [ ] 2x Micro-HDMI → HDMI cable (Props Pi, 2 screens)
- [ ] 2x Micro-HDMI → HDMI cable (Narrative Pi, 2 screens)
- [ ] 1x Micro-HDMI → HDMI cable (Vehicle Pi Zero)
- [ ] 2x Ethernet cables (Props Pi + Narrative Pi)
- [ ] Network switch (4+ ports)
- [ ] GPIO jumper wires / ribbon cable + breakout board (x2, one per full Pi)
- [ ] Power strip (5+ outlets minimum)

---

## 2. Flash SD Cards

1. Download **Raspberry Pi OS** (64-bit Desktop) for Props Pi and Narrative Pi
2. Download **Raspberry Pi OS Lite** (64-bit) for Vehicle Pi Zero
3. Flash each SD card with [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
4. In Imager settings, **enable SSH** and set username/password (`pi` / your password)
5. For the Vehicle Pi Zero, also **configure WiFi** credentials in Imager

---

## 3. Configure Static IPs

Boot each Pi and edit `/etc/dhcpcd.conf`:

**Props Pi (192.168.1.10):**
```bash
sudo nano /etc/dhcpcd.conf
```
```
interface eth0
static ip_address=192.168.1.10/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

**Narrative Pi (192.168.1.11):**
```
interface eth0
static ip_address=192.168.1.11/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

**Vehicle Pi Zero (192.168.1.12):**
```
interface wlan0
static ip_address=192.168.1.12/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

Reboot after editing: `sudo reboot`

---

## 4. Clone the Repository

SSH into **Props Pi** and **Narrative Pi** and clone:

```bash
cd ~
git clone <your-repo-url> hollywoodHQ
cd hollywoodHQ
```

The Vehicle Pi Zero does **not** need the code (display-only kiosk).

---

## 5. Run Setup Scripts

### Props Pi

```bash
cd ~/hollywoodHQ/raspberry-pi
sudo ./setup-props-pi.sh
```

This installs Node.js, npm dependencies for Puzzles 1/2/5 + Immersion Screen, creates systemd services, configures dual-display kiosk (HDMI-0 → World Map, HDMI-1 → Immersion).

### Narrative Pi

```bash
cd ~/hollywoodHQ/raspberry-pi
sudo ./setup-narrative-pi.sh
```

This installs Node.js, npm dependencies for Puzzles 3/4 + Villain/Right Screens, creates systemd services, configures dual-display kiosk (HDMI-0 → Villain, HDMI-1 → Right Screen).

### Vehicle Pi Zero

Copy `setup-vehicle-pi-zero.sh` to the Pi Zero, then:

```bash
sudo ./setup-vehicle-pi-zero.sh 192.168.1.11
```

This installs Chromium and creates a single-display kiosk that connects to the Narrative Pi's Puzzle 4 server over WiFi.

---

## 6. Configure Room Controller

On **both** Props Pi and Narrative Pi:

```bash
cd ~/hollywoodHQ/raspberry-pi
sudo ./configure-room-controller.sh ws://192.168.1.100:3001
```

This sets the Room Controller WebSocket URL in every puzzle and screen config file.

---

## 7. Wire GPIO Hardware

### Props Pi — GPIO Wiring

All buttons use **internal pull-up resistors** (active-low: button press connects pin to GND).

#### Puzzle 1: Simon (10 buttons)

Each button has two wires: **input** (switch) and **output** (LED).

| Button | Input Pin | LED Pin | Wiring |
|--------|-----------|---------|--------|
| 1 | GPIO 16 | GPIO 0 | Switch: pin → GND. LED: pin → 220Ω → LED+ → LED- → GND |
| 2 | GPIO 19 | GPIO 1 | Same pattern |
| 3 | GPIO 20 | GPIO 22 | Same pattern |
| 4 | GPIO 26 | GPIO 23 | Same pattern |
| 5 | GPIO 5 | GPIO 2 | Same pattern |
| 6 | GPIO 6 | GPIO 3 | Same pattern |
| 7 | GPIO 13 | GPIO 4 | Same pattern |
| 8 | GPIO 27 | GPIO 7 | Same pattern |
| 9 | GPIO 17 | GPIO 8 | Same pattern |
| 10 | GPIO 14 | GPIO 9 | Same pattern |

#### Puzzle 2: World Map (2 encoders)

| Encoder | CLK Pin | DT Pin |
|---------|---------|--------|
| X axis | GPIO 16 | GPIO 20 |
| Y axis | GPIO 19 | GPIO 26 |

Encoder VCC → 3.3V, GND → GND.
Audio: Pi 3.5mm jack → splitter → 2 headsets.

#### Puzzle 5: Missile (joystick + button)

| Direction | Pin |
|-----------|-----|
| Up | GPIO 16 |
| Down | GPIO 20 |
| Left | GPIO 19 |
| Right | GPIO 26 |
| **Explosion button** | **GPIO 12** |

Joystick common → GND. Each direction switch → respective GPIO pin.
Explosion button: one terminal → GPIO 12, other terminal → GND.

> **Note:** GPIO 16, 19, 20, 26 are **shared** across Puzzles 1, 2, and 5. This is safe because puzzles run sequentially. Physical wires stay permanently connected.

### Narrative Pi — GPIO Wiring

#### Puzzle 3: Gadget Code (keypad + 3 LEDs)

**Keypad (Wiegand protocol):**
- Keypad VCC → **external 12V PSU** (NOT the Pi!)
- Keypad GND → shared GND with Pi
- Keypad D0 (green wire) → GPIO 17
- Keypad D1 (white wire) → GPIO 27

**LEDs:**

| LED | GPIO Pin | Wiring |
|-----|----------|--------|
| LED 1 | GPIO 24 | Pin → 220Ω → LED+ → LED- → GND |
| LED 2 | GPIO 25 | Same pattern |
| LED 3 | GPIO 12 | Same pattern |

#### Puzzle 4: Vehicle Selector (4 levers + 3 buttons)

**Buttons:**

| Button | GPIO Pin |
|--------|----------|
| Nav Left | GPIO 5 |
| Nav Right | GPIO 6 |
| Validate | GPIO 13 |

Each button: one terminal → GPIO, other terminal → GND.

**Levers (10-position rotary switches):**

Only 3 positions per lever are wired (sparse wiring). Common terminal → GND.

| Lever | Pos → GPIO |
|-------|-----------|
| Lever 1 | Pos 2 → GPIO 2, Pos 4 → GPIO 3, Pos 8 → GPIO 4 |
| Lever 2 | Pos 3 → GPIO 7, Pos 7 → GPIO 8, Pos 9 → GPIO 9 |
| Lever 3 | Pos 2 → GPIO 10, Pos 4 → GPIO 11, Pos 8 → GPIO 14 |
| Lever 4 | Pos 1 → GPIO 15, Pos 5 → GPIO 18, Pos 6 → GPIO 21 |

---

## 8. Connect Screens

| Screen | Cable | From | To |
|--------|-------|------|-----|
| World Map | Micro-HDMI → HDMI | Props Pi HDMI-0 (left port) | Central monitor |
| Immersion | Micro-HDMI → HDMI | Props Pi HDMI-1 (right port) | Small right monitor |
| Villain | Micro-HDMI → HDMI | Narrative Pi HDMI-0 (left port) | Left monitor |
| Right | Micro-HDMI → HDMI | Narrative Pi HDMI-1 (right port) | Right monitor |
| Vehicle | Micro-HDMI → HDMI | Vehicle Pi Zero | Small separate monitor |

---

## 9. Add Media Files

### Explosion Video (Puzzle 5)

Place your explosion video at:
```
puzzle-5-missile/public/videos/explosion.mp4
```

This plays fullscreen when players press the big red button after reversing the missile.

### Villain Video Clips (Screen)

Place villain video clips in:
```
screen-villain/public/videos/
```

### Virtual Assistant Clips (Puzzle 3)

Place assistant video clips in:
```
puzzle-3-gadget-code/public/videos/
```

---

## 10. Reboot and Verify

```bash
# On each Pi:
sudo reboot
```

Wait ~60 seconds after boot. Each Pi auto-starts all puzzle servers and launches Chromium in fullscreen kiosk mode.

### Verify services are running

**Props Pi:**
```bash
sudo systemctl status puzzle-1-simon
sudo systemctl status puzzle-2-world-map
sudo systemctl status puzzle-5-missile
sudo systemctl status screen-immersion
```

**Narrative Pi:**
```bash
sudo systemctl status puzzle-3-gadget-code
sudo systemctl status puzzle-4-vehicle
sudo systemctl status screen-villain
sudo systemctl status screen-right
```

**Vehicle Pi Zero:**
```bash
sudo systemctl status chromium-kiosk-vehicle
```

### Verify from GM dashboard

Open the GM dashboard on the GM laptop (`http://192.168.1.100:3000`). All 5 puzzles should appear as "online".

---

## 11. Test Each Puzzle

Test puzzles in order. Activate each one from the GM dashboard and verify:

| Puzzle | What to test |
|--------|-------------|
| 1 — Simon | Press each button → LED lights up, console "reboots" when all pressed |
| 2 — World Map | Turn both encoders → crosshairs move on screen, headsets beep faster near target, hold 2s on target → solved |
| 3 — Gadget Code | Enter codes 4729, 8153, 3946 → each correct code lights an LED, all 3 → solved |
| 4 — Vehicle | Navigate to Speedboat, set levers to 2-9-4-6, press validate → solved |
| 5 — Missile | Reverse missile from Sydney to Los Angeles using joystick, then press red button → explosion video plays → solved |

### Test hack mode

From the GM dashboard, trigger hack mode. All screens and puzzles should show the glitch overlay simultaneously. Solving Puzzle 1 resolves the hack.

---

## 12. Troubleshooting

| Problem | Solution |
|---------|----------|
| Screen is black | Wait 30s. Check HDMI cable and monitor power. |
| Puzzle not showing online | Check Ethernet. Run `sudo systemctl status puzzle-X-name` |
| Buttons not responding | Verify correct puzzle is active. Check GPIO wiring (BCM numbering!). |
| LEDs not lighting | Check resistor values (220Ω) and LED polarity. |
| Keypad not reading codes | Verify 12V external power. Check D0→GPIO17, D1→GPIO27. Check common ground. |
| Screen shows desktop | Run `sudo reboot` — kiosk should restart automatically. |
| Explosion video not playing | Check file exists at `puzzle-5-missile/public/videos/explosion.mp4`. Check format (H.264 MP4). |
| Vehicle Pi Zero: blank screen | Verify WiFi connection. Ping Narrative Pi: `ping 192.168.1.11`. |

### View logs

```bash
# Live logs for a specific service:
sudo journalctl -u puzzle-5-missile -f

# Last 100 lines:
sudo journalctl -u puzzle-3-gadget-code -n 100
```

### Restart a single puzzle

```bash
sudo systemctl restart puzzle-2-world-map
```

---

## 13. Backup

Once everything works, create SD card backup images:

```bash
# On your computer, with the SD card connected:
# Linux/Mac:
sudo dd if=/dev/sdX of=props-pi-backup.img bs=4M status=progress
# Windows: use Win32 Disk Imager
```

Keep backups for each Pi. If an SD card fails, flash a backup and you're running in minutes.

---

## Quick Reference — Puzzle Codes

| Puzzle | Solution |
|--------|----------|
| 3 — Gadget Code | Situation 1: `4729`, Situation 2: `8153`, Situation 3: `3946` |
| 4 — Vehicle | Speedboat: levers `2-9-4-6` |

## Quick Reference — Ports

| Service | Port |
|---------|------|
| Puzzle 1 (Simon) | 3004 |
| Puzzle 2 (World Map) | 3000 |
| Puzzle 3 (Gadget Code) | 3001 |
| Puzzle 4 (Vehicle) | 3002 |
| Puzzle 5 (Missile) | 3003 |
| Screen: Villain | 3010 |
| Screen: Immersion | 3011 |
| Screen: Right | 3012 |
| Room Controller | 3001 (GM laptop) |

## Quick Reference — IPs

| Device | IP |
|--------|-----|
| Props Pi | 192.168.1.10 |
| Narrative Pi | 192.168.1.11 |
| Vehicle Pi Zero | 192.168.1.12 |
| GM Laptop | 192.168.1.100 |
