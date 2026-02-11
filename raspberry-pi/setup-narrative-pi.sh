#!/bin/bash
#
# Narrative Pi Setup Script
# Mission: Hollywood Escape Room
#
# This script configures the Narrative Pi (Raspberry Pi #2) with:
# - Puzzle 3: Gadget Code (keypad, LEDs, virtual assistant)
# - Puzzle 4: Vehicle Selector (levers, buttons) — display on Pi Zero
# - Screen: Villain clips (dedicated left screen)
# - Screen: Right (Tim Ferris + Puzzle 3 display)
# - Dual Chromium kiosk: HDMI-0 → Villain, HDMI-1 → Right Screen
#

set -e  # Exit on error

echo "=========================================="
echo "Narrative Pi Setup Script"
echo "Mission: Hollywood Escape Room"
echo "=========================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)"
   exit 1
fi

# Get the actual user (not root)
ACTUAL_USER=${SUDO_USER:-$USER}
HOME_DIR=$(eval echo ~$ACTUAL_USER)
PROJECT_DIR="$HOME_DIR/hollywoodHQ"

echo "User: $ACTUAL_USER"
echo "Home: $HOME_DIR"
echo "Project: $PROJECT_DIR"
echo ""

# Verify project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "ERROR: Project directory not found at $PROJECT_DIR"
    echo "Please clone the repository first:"
    echo "  cd ~ && git clone https://github.com/Barraka/hollywoodHQ.git"
    exit 1
fi

echo "[1/11] Updating system packages..."
apt-get update
apt-get upgrade -y

echo "[2/11] Installing Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "[3/11] Installing system dependencies..."
apt-get install -y \
    git \
    chromium-browser \
    unclutter \
    xdotool \
    x11-xserver-utils

echo "[4/11] Installing Puzzle 3 (Gadget Code) dependencies..."
cd "$PROJECT_DIR/puzzle-3-gadget-code"
sudo -u $ACTUAL_USER npm install
echo "✓ Puzzle 3 ready"

echo "[5/11] Installing Puzzle 4 (Vehicle) dependencies..."
cd "$PROJECT_DIR/puzzle-4-vehicle"
sudo -u $ACTUAL_USER npm install
echo "✓ Puzzle 4 ready"

echo "[6/11] Installing Screen: Villain dependencies..."
cd "$PROJECT_DIR/screen-villain"
sudo -u $ACTUAL_USER npm install
echo "✓ Screen Villain ready"

echo "[7/11] Installing Screen: Right (Tim Ferris + P3) dependencies..."
cd "$PROJECT_DIR/screen-right"
sudo -u $ACTUAL_USER npm install
echo "✓ Screen Right ready"

echo "[8/11] Configuring systemd services..."
cp "$PROJECT_DIR/raspberry-pi/services/puzzle-3-gadget-code.service" /etc/systemd/system/
cp "$PROJECT_DIR/raspberry-pi/services/puzzle-4-vehicle.service" /etc/systemd/system/
cp "$PROJECT_DIR/raspberry-pi/services/screen-villain.service" /etc/systemd/system/
cp "$PROJECT_DIR/raspberry-pi/services/screen-right.service" /etc/systemd/system/
cp "$PROJECT_DIR/raspberry-pi/services/chromium-kiosk-narrative.service" /etc/systemd/system/

sed -i "s/User=pi/User=$ACTUAL_USER/g" /etc/systemd/system/puzzle-*.service
sed -i "s/User=pi/User=$ACTUAL_USER/g" /etc/systemd/system/screen-*.service
sed -i "s/User=pi/User=$ACTUAL_USER/g" /etc/systemd/system/chromium-kiosk-*.service
sed -i "s|/home/pi|$HOME_DIR|g" /etc/systemd/system/puzzle-*.service
sed -i "s|/home/pi|$HOME_DIR|g" /etc/systemd/system/screen-*.service
sed -i "s|/home/pi|$HOME_DIR|g" /etc/systemd/system/chromium-kiosk-*.service

systemctl daemon-reload

systemctl enable puzzle-3-gadget-code.service
systemctl enable puzzle-4-vehicle.service
systemctl enable screen-villain.service
systemctl enable screen-right.service
systemctl enable chromium-kiosk-narrative.service

echo "✓ Services configured"

echo "[9/11] Configuring system settings..."
usermod -a -G gpio $ACTUAL_USER

if [ -f /etc/xdg/lxsession/LXDE-pi/autostart ]; then
    grep -qxF '@xset s off' /etc/xdg/lxsession/LXDE-pi/autostart || \
        echo '@xset s off' >> /etc/xdg/lxsession/LXDE-pi/autostart
    grep -qxF '@xset -dpms' /etc/xdg/lxsession/LXDE-pi/autostart || \
        echo '@xset -dpms' >> /etc/xdg/lxsession/LXDE-pi/autostart
    grep -qxF '@xset s noblank' /etc/xdg/lxsession/LXDE-pi/autostart || \
        echo '@xset s noblank' >> /etc/xdg/lxsession/LXDE-pi/autostart
fi

if ! grep -q "gpu_mem=256" /boot/config.txt; then
    echo "gpu_mem=256" >> /boot/config.txt
fi

echo "✓ System settings configured"

echo "[10/11] Creating dual-display kiosk start script..."
mkdir -p "$PROJECT_DIR/raspberry-pi/scripts"
cat > "$PROJECT_DIR/raspberry-pi/scripts/start-kiosk-narrative.sh" <<'EOF'
#!/bin/bash
# Dual-display kiosk for Narrative Pi
# HDMI-0: Villain Screen (localhost:3010)
# HDMI-1: Right Screen — Tim Ferris + Puzzle 3 (localhost:3012)

while ! xdpyinfo >/dev/null 2>&1; do
    sleep 1
done

unclutter -idle 0 &

xset s off
xset -dpms
xset s noblank

sleep 10

SEC_X=$(xrandr --query | grep ' connected' | grep -v 'primary' | grep -oP '\d+x\d+\+(\d+)\+\d+' | grep -oP '(?<=\+)\d+(?=\+)' | head -1)
SEC_X=${SEC_X:-1920}

echo "[kiosk] Secondary display X offset: ${SEC_X}"

# HDMI-0: Villain Screen
chromium-browser --app=http://localhost:3010 \
    --user-data-dir=/tmp/chromium-display0 \
    --start-fullscreen --noerrdialogs --disable-infobars --no-first-run \
    --disable-translate --disable-features=TranslateUI \
    --disk-cache-dir=/dev/null --overscroll-history-navigation=0 &

sleep 3

# HDMI-1: Right Screen (Tim Ferris + Puzzle 3)
chromium-browser --app=http://localhost:3012 \
    --user-data-dir=/tmp/chromium-display1 \
    --window-position=${SEC_X},0 --start-fullscreen \
    --noerrdialogs --disable-infobars --no-first-run \
    --disable-translate --disable-features=TranslateUI \
    --disk-cache-dir=/dev/null --overscroll-history-navigation=0 &

echo "[kiosk] Dual-display kiosk started"
wait
EOF

chmod +x "$PROJECT_DIR/raspberry-pi/scripts/start-kiosk-narrative.sh"
chown $ACTUAL_USER:$ACTUAL_USER "$PROJECT_DIR/raspberry-pi/scripts/start-kiosk-narrative.sh"

echo "✓ Kiosk script created"

echo "[11/11] Starting services..."
systemctl start puzzle-3-gadget-code.service
systemctl start puzzle-4-vehicle.service
systemctl start screen-villain.service
systemctl start screen-right.service

echo ""
echo "=========================================="
echo "Narrative Pi Setup Complete! ✓"
echo "=========================================="
echo ""
echo "Services installed:"
echo "  • puzzle-3-gadget-code (Port 3001)"
echo "  • puzzle-4-vehicle     (Port 3002)"
echo "  • screen-villain       (Port 3010)"
echo "  • screen-right         (Port 3012)"
echo "  • chromium-kiosk-narrative (Dual display)"
echo ""
echo "Display layout:"
echo "  HDMI-0 → Villain Screen (localhost:3010)"
echo "  HDMI-1 → Right Screen (localhost:3012)"
echo ""
echo "Note: Puzzle 4 display is on the Pi Zero."
echo ""
echo "Next steps:"
echo "  1. Configure Room Controller URL:"
echo "     sudo ./configure-room-controller.sh ws://192.168.1.100:3001"
echo ""
echo "  2. Reboot to enable kiosk mode:"
echo "     sudo reboot"
echo ""
echo "View logs: sudo journalctl -u screen-villain -f"
echo ""
