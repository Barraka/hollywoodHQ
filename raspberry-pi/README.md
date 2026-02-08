# Raspberry Pi Setup Scripts

Automated setup scripts for deploying Mission: Hollywood escape room on 2 Raspberry Pi units.

## Prerequisites

- 2× Raspberry Pi 4 or 5 (4GB+ RAM recommended)
- Raspberry Pi OS Lite (64-bit) or Desktop installed
- SSH enabled on both Pis
- Internet connection during initial setup

## Quick Start

### 1. Clone Repository on Each Pi

SSH into each Pi and clone the repository:

```bash
cd ~
git clone https://github.com/Barraka/hollywoodHQ.git
cd hollywoodHQ
```

### 2. Run Setup Script

**Props Pi (Puzzles 1, 2, 5 + World Map Display):**
```bash
cd raspberry-pi
sudo ./setup-props-pi.sh
```

**Narrative Pi (Puzzles 3, 4 + Story Screen):**
```bash
cd raspberry-pi
sudo ./setup-narrative-pi.sh
```

The script will:
- Install Node.js and dependencies
- Install all puzzle npm packages
- Configure systemd services
- Set up Chromium kiosk mode
- Optimize system settings
- Configure static IP (optional)

### 3. Configure Room Controller URL

After setup, update the Room Controller URL on both Pis:

```bash
sudo ./configure-room-controller.sh ws://192.168.1.100:3001
```

Replace `192.168.1.100` with your Room Controller's actual IP address.

### 4. Reboot

```bash
sudo reboot
```

After reboot, the Pi will:
- Auto-start all puzzle servers
- Launch Chromium in fullscreen kiosk mode
- Connect to Room Controller automatically

---

## Manual Configuration

### Static IP (Optional)

Edit `/etc/dhcpcd.conf`:

```bash
sudo nano /etc/dhcpcd.conf
```

Add at the end:

```conf
# Props Pi
interface eth0
static ip_address=192.168.1.10/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8

# Or for Narrative Pi, use 192.168.1.11
```

### Display Configuration

For HDMI displays, edit `/boot/config.txt`:

```bash
sudo nano /boot/config.txt
```

Uncomment and adjust:
```
hdmi_force_hotplug=1       # Force HDMI even if no display detected
hdmi_group=2               # DMT (computer monitor) timing
hdmi_mode=82               # 1920x1080 @ 60Hz
```

---

## Service Management

### Check Service Status

```bash
# Props Pi
sudo systemctl status puzzle-1-simon
sudo systemctl status puzzle-2-world-map
sudo systemctl status puzzle-5-missile
sudo systemctl status chromium-kiosk-props

# Narrative Pi
sudo systemctl status puzzle-3-gadget-code
sudo systemctl status puzzle-4-vehicle
sudo systemctl status chromium-kiosk-narrative
```

### View Logs

```bash
# Live logs
sudo journalctl -u puzzle-1-simon -f

# Last 100 lines
sudo journalctl -u puzzle-2-world-map -n 100
```

### Restart a Puzzle

```bash
sudo systemctl restart puzzle-3-gadget-code
```

### Disable Auto-Start (for debugging)

```bash
sudo systemctl stop puzzle-1-simon
sudo systemctl disable puzzle-1-simon
```

### Re-enable Auto-Start

```bash
sudo systemctl enable puzzle-1-simon
sudo systemctl start puzzle-1-simon
```

---

## Troubleshooting

### Puzzle Not Starting

1. Check service status: `sudo systemctl status puzzle-1-simon`
2. Check logs: `sudo journalctl -u puzzle-1-simon -n 50`
3. Verify Node.js installed: `node --version` (should be v18+)
4. Test manually: `cd ~/hollywoodHQ/puzzle-1-simon && npm start`

### Chromium Not Launching

1. Check X server running: `ps aux | grep Xorg`
2. Check service: `sudo systemctl status chromium-kiosk-props`
3. View logs: `sudo journalctl -u chromium-kiosk-props -n 50`
4. Test manually: `DISPLAY=:0 chromium-browser --kiosk http://localhost:3000`

### GPIO Permissions

If GPIO access fails, add the `pi` user to the `gpio` group:

```bash
sudo usermod -a -G gpio pi
sudo reboot
```

### Room Controller Not Connecting

1. Verify URL in configs: `grep roomControllerUrl ~/hollywoodHQ/puzzle-*/config.js`
2. Test connectivity: `ping 192.168.1.100`
3. Check Room Controller is running
4. Check firewall allows port 3001

---

## File Structure

```
raspberry-pi/
├── README.md                           # This file
├── setup-props-pi.sh                   # Props Pi setup script
├── setup-narrative-pi.sh               # Narrative Pi setup script
├── configure-room-controller.sh        # Update Room Controller URL
├── services/
│   ├── puzzle-1-simon.service          # Puzzle 1 systemd service
│   ├── puzzle-2-world-map.service      # Puzzle 2 systemd service
│   ├── puzzle-3-gadget-code.service    # Puzzle 3 systemd service
│   ├── puzzle-4-vehicle.service        # Puzzle 4 systemd service
│   ├── puzzle-5-missile.service        # Puzzle 5 systemd service
│   ├── chromium-kiosk-props.service    # Chromium kiosk for Props Pi
│   └── chromium-kiosk-narrative.service # Chromium kiosk for Narrative Pi
└── scripts/
    └── start-kiosk.sh                  # Chromium kiosk launcher
```

---

## Network Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Local Network                        │
│                   (192.168.1.0/24)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  GM Laptop (192.168.1.100)                              │
│  ├─ GM Dashboard (React app)                            │
│  └─ Room Controller (WebSocket server :3001)            │
│                                                          │
│  Props Pi (192.168.1.10)                                │
│  ├─ Puzzle 1: Simon (:3004)                             │
│  ├─ Puzzle 2: World Map (:3000)                         │
│  ├─ Puzzle 5: Missile (:3003)                           │
│  └─ HDMI → World Map Display                            │
│                                                          │
│  Narrative Pi (192.168.1.11)                            │
│  ├─ Puzzle 3: Gadget Code (:3001)                       │
│  ├─ Puzzle 4: Vehicle (:3002)                           │
│  └─ HDMI → Story/Virtual Assistant Screen               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Hardware Setup Checklist

**Props Pi:**
- [ ] 10× arcade buttons wired to GPIO (see GPIO_ALLOCATION.md)
- [ ] 2× KY-040 rotary encoders wired
- [ ] 8-way arcade joystick wired
- [ ] HDMI cable to world map display
- [ ] Power supply connected
- [ ] Network cable or WiFi configured

**Narrative Pi:**
- [ ] Wiegand keypad wired to GPIO 17, 27
- [ ] 3× LEDs wired to GPIO 24, 25, 12
- [ ] 4× 10-position rotary switches wired
- [ ] 2× navigation buttons + validate button wired
- [ ] HDMI cable to story screen
- [ ] Power supply connected
- [ ] Network cable or WiFi configured

---

## Production Deployment

1. Flash fresh Raspberry Pi OS on both SD cards
2. Enable SSH (`touch /boot/ssh` on SD card before first boot)
3. Boot both Pis and SSH in
4. Run setup scripts on each Pi
5. Configure Room Controller URL
6. Test each puzzle independently
7. Test full sequential playthrough
8. Reboot and verify auto-start

---

## Updates & Maintenance

### Update Puzzle Code

```bash
cd ~/hollywoodHQ
git pull
cd puzzle-1-simon && npm install
sudo systemctl restart puzzle-1-simon
```

### Backup Configuration

```bash
# Backup all configs
tar -czf hollywood-config-backup.tar.gz \
  ~/hollywoodHQ/puzzle-*/config.js \
  /etc/systemd/system/puzzle-*.service \
  /etc/systemd/system/chromium-kiosk-*.service
```

### Clone SD Card

After successful setup, create a backup image:

```bash
# On Linux/Mac with SD card reader
sudo dd if=/dev/sdX of=props-pi-backup.img bs=4M status=progress
gzip props-pi-backup.img
```

---

## Support

For issues or questions:
- Check logs: `sudo journalctl -u <service-name> -n 100`
- Review GPIO wiring: [../GPIO_ALLOCATION.md](../GPIO_ALLOCATION.md)
- Test in mock mode first: `cd puzzle-X && npm run dev`
