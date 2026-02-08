#!/bin/bash
#
# Props Pi Setup Script
# Mission: Hollywood Escape Room
#
# This script configures the Props Pi (Raspberry Pi #1) with:
# - Puzzle 1: Simon (10 buttons)
# - Puzzle 2: World Map (encoders, headsets)
# - Puzzle 5: Missile (joystick)
# - Chromium kiosk mode for world map display
#

set -e  # Exit on error

echo "=========================================="
echo "Props Pi Setup Script"
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

echo "[1/10] Updating system packages..."
apt-get update
apt-get upgrade -y

echo "[2/10] Installing Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "[3/10] Installing system dependencies..."
apt-get install -y \
    git \
    chromium-browser \
    unclutter \
    xdotool \
    x11-xserver-utils

echo "[4/10] Installing Puzzle 1 (Simon) dependencies..."
cd "$PROJECT_DIR/puzzle-1-simon"
sudo -u $ACTUAL_USER npm install
echo "✓ Puzzle 1 ready"

echo "[5/10] Installing Puzzle 2 (World Map) dependencies..."
cd "$PROJECT_DIR/puzzle-2-world-map"
sudo -u $ACTUAL_USER npm install
echo "✓ Puzzle 2 ready"

echo "[6/10] Installing Puzzle 5 (Missile) dependencies..."
cd "$PROJECT_DIR/puzzle-5-missile"
sudo -u $ACTUAL_USER npm install
echo "✓ Puzzle 5 ready"

echo "[7/10] Configuring systemd services..."
# Copy service files
cp "$PROJECT_DIR/raspberry-pi/services/puzzle-1-simon.service" /etc/systemd/system/
cp "$PROJECT_DIR/raspberry-pi/services/puzzle-2-world-map.service" /etc/systemd/system/
cp "$PROJECT_DIR/raspberry-pi/services/puzzle-5-missile.service" /etc/systemd/system/
cp "$PROJECT_DIR/raspberry-pi/services/chromium-kiosk-props.service" /etc/systemd/system/

# Replace username in service files
sed -i "s/User=pi/User=$ACTUAL_USER/g" /etc/systemd/system/puzzle-*.service
sed -i "s/User=pi/User=$ACTUAL_USER/g" /etc/systemd/system/chromium-kiosk-*.service
sed -i "s|/home/pi|$HOME_DIR|g" /etc/systemd/system/puzzle-*.service
sed -i "s|/home/pi|$HOME_DIR|g" /etc/systemd/system/chromium-kiosk-*.service

# Reload systemd
systemctl daemon-reload

# Enable services
systemctl enable puzzle-1-simon.service
systemctl enable puzzle-2-world-map.service
systemctl enable puzzle-5-missile.service
systemctl enable chromium-kiosk-props.service

echo "✓ Services configured"

echo "[8/10] Configuring system settings..."
# Add user to gpio group
usermod -a -G gpio $ACTUAL_USER

# Disable screen blanking
if [ -f /etc/xdg/lxsession/LXDE-pi/autostart ]; then
    grep -qxF '@xset s off' /etc/xdg/lxsession/LXDE-pi/autostart || \
        echo '@xset s off' >> /etc/xdg/lxsession/LXDE-pi/autostart
    grep -qxF '@xset -dpms' /etc/xdg/lxsession/LXDE-pi/autostart || \
        echo '@xset -dpms' >> /etc/xdg/lxsession/LXDE-pi/autostart
    grep -qxF '@xset s noblank' /etc/xdg/lxsession/LXDE-pi/autostart || \
        echo '@xset s noblank' >> /etc/xdg/lxsession/LXDE-pi/autostart
fi

# Increase GPU memory for smooth video playback
if ! grep -q "gpu_mem=256" /boot/config.txt; then
    echo "gpu_mem=256" >> /boot/config.txt
fi

echo "✓ System settings configured"

echo "[9/10] Creating kiosk start script..."
mkdir -p "$PROJECT_DIR/raspberry-pi/scripts"
cat > "$PROJECT_DIR/raspberry-pi/scripts/start-kiosk-props.sh" <<'EOF'
#!/bin/bash
# Wait for X server
while ! xdpyinfo >/dev/null 2>&1; do
    sleep 1
done

# Hide cursor
unclutter -idle 0 &

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Wait for puzzle servers to start
sleep 10

# Launch Chromium in kiosk mode pointing to world map (Puzzle 2)
chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --no-first-run \
    --fast \
    --fast-start \
    --disable-translate \
    --disable-features=TranslateUI \
    --disk-cache-dir=/dev/null \
    --overscroll-history-navigation=0 \
    http://localhost:3000
EOF

chmod +x "$PROJECT_DIR/raspberry-pi/scripts/start-kiosk-props.sh"
chown $ACTUAL_USER:$ACTUAL_USER "$PROJECT_DIR/raspberry-pi/scripts/start-kiosk-props.sh"

echo "✓ Kiosk script created"

echo "[10/10] Starting services..."
systemctl start puzzle-1-simon.service
systemctl start puzzle-2-world-map.service
systemctl start puzzle-5-missile.service

echo ""
echo "=========================================="
echo "Props Pi Setup Complete! ✓"
echo "=========================================="
echo ""
echo "Services installed:"
echo "  • puzzle-1-simon      (Port 3004)"
echo "  • puzzle-2-world-map  (Port 3000)"
echo "  • puzzle-5-missile    (Port 3003)"
echo "  • chromium-kiosk-props (World map display)"
echo ""
echo "Next steps:"
echo "  1. Configure Room Controller URL:"
echo "     sudo ./configure-room-controller.sh ws://192.168.1.100:3001"
echo ""
echo "  2. Reboot to enable kiosk mode:"
echo "     sudo reboot"
echo ""
echo "  3. Check service status after reboot:"
echo "     sudo systemctl status puzzle-1-simon"
echo "     sudo systemctl status puzzle-2-world-map"
echo "     sudo systemctl status puzzle-5-missile"
echo ""
echo "View logs: sudo journalctl -u puzzle-1-simon -f"
echo ""
