#!/bin/bash
#
# Vehicle Pi Zero Setup Script
# Mission: Hollywood Escape Room
#
# This script configures the Pi Zero 2 W as a display-only kiosk
# showing the Puzzle 4 (Vehicle Selector) web interface served
# by the Narrative Pi over the network.
#
# No GPIO, no puzzle server — just Chromium in kiosk mode.
#
# Usage: sudo ./setup-vehicle-pi-zero.sh [NARRATIVE_PI_IP]
#        Default IP: 192.168.1.11
#

set -e

echo "=========================================="
echo "Vehicle Pi Zero Setup Script"
echo "Mission: Hollywood Escape Room"
echo "=========================================="
echo ""

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)"
   exit 1
fi

ACTUAL_USER=${SUDO_USER:-$USER}
HOME_DIR=$(eval echo ~$ACTUAL_USER)

NARRATIVE_PI_IP="${1:-192.168.1.11}"
VEHICLE_URL="http://${NARRATIVE_PI_IP}:3002"

echo "User: $ACTUAL_USER"
echo "Narrative Pi IP: $NARRATIVE_PI_IP"
echo "Vehicle URL: $VEHICLE_URL"
echo ""

echo "[1/5] Updating system packages..."
apt-get update
apt-get upgrade -y

echo "[2/5] Installing system dependencies..."
apt-get install -y \
    chromium-browser \
    unclutter \
    xdotool \
    x11-xserver-utils \
    curl

echo "[3/5] Configuring system settings..."

if [ -f /etc/xdg/lxsession/LXDE-pi/autostart ]; then
    grep -qxF '@xset s off' /etc/xdg/lxsession/LXDE-pi/autostart || \
        echo '@xset s off' >> /etc/xdg/lxsession/LXDE-pi/autostart
    grep -qxF '@xset -dpms' /etc/xdg/lxsession/LXDE-pi/autostart || \
        echo '@xset -dpms' >> /etc/xdg/lxsession/LXDE-pi/autostart
    grep -qxF '@xset s noblank' /etc/xdg/lxsession/LXDE-pi/autostart || \
        echo '@xset s noblank' >> /etc/xdg/lxsession/LXDE-pi/autostart
fi

if ! grep -q "gpu_mem=128" /boot/config.txt; then
    echo "gpu_mem=128" >> /boot/config.txt
fi

echo "✓ System settings configured"

echo "[4/5] Creating kiosk start script..."
mkdir -p "$HOME_DIR/kiosk"
cat > "$HOME_DIR/kiosk/start-kiosk-vehicle.sh" <<EOFSCRIPT
#!/bin/bash
# Kiosk for Pi Zero — Vehicle Selector display
# Points to Narrative Pi: $VEHICLE_URL

while ! xdpyinfo >/dev/null 2>&1; do
    sleep 1
done

unclutter -idle 0 &

xset s off
xset -dpms
xset s noblank

# Wait for network and Narrative Pi to be ready
echo "[kiosk] Waiting for Narrative Pi at $NARRATIVE_PI_IP..."
for i in \$(seq 1 30); do
    if curl -s --connect-timeout 2 "$VEHICLE_URL" > /dev/null 2>&1; then
        echo "[kiosk] Narrative Pi is ready"
        break
    fi
    echo "[kiosk] Attempt \$i/30 — waiting..."
    sleep 2
done

chromium-browser \\
    --kiosk \\
    --noerrdialogs \\
    --disable-infobars \\
    --no-first-run \\
    --fast \\
    --fast-start \\
    --disable-translate \\
    --disable-features=TranslateUI \\
    --disk-cache-dir=/dev/null \\
    --overscroll-history-navigation=0 \\
    $VEHICLE_URL
EOFSCRIPT

chmod +x "$HOME_DIR/kiosk/start-kiosk-vehicle.sh"
chown $ACTUAL_USER:$ACTUAL_USER "$HOME_DIR/kiosk/start-kiosk-vehicle.sh"

echo "✓ Kiosk script created"

echo "[5/5] Creating systemd service..."
cat > /etc/systemd/system/chromium-kiosk-vehicle.service <<EOFSERVICE
[Unit]
Description=Vehicle Display Kiosk
After=graphical.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$ACTUAL_USER
Environment=DISPLAY=:0
ExecStart=$HOME_DIR/kiosk/start-kiosk-vehicle.sh
Restart=always
RestartSec=10

[Install]
WantedBy=graphical.target
EOFSERVICE

systemctl daemon-reload
systemctl enable chromium-kiosk-vehicle.service

echo "✓ Service configured"

echo ""
echo "=========================================="
echo "Vehicle Pi Zero Setup Complete! ✓"
echo "=========================================="
echo ""
echo "  Display URL: $VEHICLE_URL"
echo "  Service: chromium-kiosk-vehicle"
echo ""
echo "Next steps:"
echo "  1. Ensure WiFi is configured to reach the Narrative Pi"
echo "  2. Reboot: sudo reboot"
echo "  3. To change IP: sudo ./setup-vehicle-pi-zero.sh 192.168.1.XX"
echo ""
