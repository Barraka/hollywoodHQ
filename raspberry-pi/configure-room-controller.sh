#!/bin/bash
#
# Configure Room Controller URL
# Updates all puzzle config files with the Room Controller WebSocket URL
#

set -e

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)"
   exit 1
fi

if [ -z "$1" ]; then
    echo "Usage: sudo ./configure-room-controller.sh <websocket-url>"
    echo "Example: sudo ./configure-room-controller.sh ws://192.168.1.100:3001"
    exit 1
fi

RC_URL="$1"
ACTUAL_USER=${SUDO_USER:-$USER}
HOME_DIR=$(eval echo ~$ACTUAL_USER)
PROJECT_DIR="$HOME_DIR/hollywoodHQ"

echo "=========================================="
echo "Configure Room Controller URL"
echo "=========================================="
echo ""
echo "Room Controller URL: $RC_URL"
echo "Project directory: $PROJECT_DIR"
echo ""

# Verify project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "ERROR: Project directory not found at $PROJECT_DIR"
    exit 1
fi

# Function to update a config file
update_config() {
    local config_file="$1"
    local puzzle_name="$2"

    if [ ! -f "$config_file" ]; then
        echo "⚠  $puzzle_name: config.js not found"
        return 1
    fi

    # Update roomControllerUrl (handles both null and existing URL)
    sed -i "s|roomControllerUrl: null|roomControllerUrl: '$RC_URL'|g" "$config_file"
    sed -i "s|roomControllerUrl: '.*'|roomControllerUrl: '$RC_URL'|g" "$config_file"
    sed -i 's|roomControllerUrl: ".*"|roomControllerUrl: '"'$RC_URL'"'|g' "$config_file"

    echo "✓  $puzzle_name updated"
}

echo "Updating puzzle configurations..."
echo ""

# Update all puzzle configs (whether they exist on this Pi or not)
update_config "$PROJECT_DIR/puzzle-1-simon/config.js" "Puzzle 1 (Simon)"
update_config "$PROJECT_DIR/puzzle-2-world-map/config.js" "Puzzle 2 (World Map)"
update_config "$PROJECT_DIR/puzzle-3-gadget-code/config.js" "Puzzle 3 (Gadget Code)"
update_config "$PROJECT_DIR/puzzle-4-vehicle/config.js" "Puzzle 4 (Vehicle)"
update_config "$PROJECT_DIR/puzzle-5-missile/config.js" "Puzzle 5 (Missile)"

echo ""
echo "=========================================="
echo "Configuration Complete! ✓"
echo "=========================================="
echo ""
echo "Room Controller URL set to: $RC_URL"
echo ""
echo "Restart puzzle services to apply changes:"
echo ""
echo "Props Pi:"
echo "  sudo systemctl restart puzzle-1-simon"
echo "  sudo systemctl restart puzzle-2-world-map"
echo "  sudo systemctl restart puzzle-5-missile"
echo ""
echo "Narrative Pi:"
echo "  sudo systemctl restart puzzle-3-gadget-code"
echo "  sudo systemctl restart puzzle-4-vehicle"
echo ""
echo "Or reboot: sudo reboot"
echo ""
