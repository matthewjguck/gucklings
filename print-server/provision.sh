#!/bin/bash
# First-boot provisioning script for Raspberry Pi print server
# Run automatically on first boot via systemd service

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/print-server-provision.log"

# Ensure log file is writable
sudo touch "$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/print-server-provision.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "╔════════════════════════════════════════════════════════════╗"
log "║  Brightek POS80 Print Server - First Boot Provisioning    ║"
log "╚════════════════════════════════════════════════════════════╝"

# ──────────────────────────────────────────────────────────────
# 1. System updates (non-interactive)
# ──────────────────────────────────────────────────────────────
log ""
log "📦 Updating system packages..."
sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    python3 python3-pip python3-venv git wireless-tools wpasupplicant \
    cups libusb-1.0-0-dev 2>&1 | tee -a "$LOG_FILE"
log "   ✓ System packages updated"

# ──────────────────────────────────────────────────────────────
# 2. Create print server user
# ──────────────────────────────────────────────────────────────
log ""
log "👤 Setting up print server user..."
if ! id -u pi &>/dev/null 2>&1; then
    log "   ⚠ User 'pi' not found, trying 'ubuntu'..."
    if ! id -u ubuntu &>/dev/null 2>&1; then
        log "   ❌ Neither 'pi' nor 'ubuntu' user found"
        exit 1
    fi
    PRINT_USER="ubuntu"
else
    PRINT_USER="pi"
fi
log "   ✓ Using user: $PRINT_USER"

# Add to required groups
for group in dialout lp lpadmin; do
    sudo usermod -a -G "$group" "$PRINT_USER" 2>/dev/null || true
done
log "   ✓ User added to printer groups"

# ──────────────────────────────────────────────────────────────
# 3. Setup print server directory
# ──────────────────────────────────────────────────────────────
log ""
log "📁 Setting up print server directory..."
INSTALL_DIR="/home/$PRINT_USER/capstone/print-server"
if [ ! -d "$INSTALL_DIR" ]; then
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown "$PRINT_USER:$PRINT_USER" "$INSTALL_DIR"
    log "   ✓ Created $INSTALL_DIR"
fi

# Copy print server files
if [ -d "$SCRIPT_DIR" ] && [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    log "   📋 Copying print server files..."
    sudo cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/" 2>/dev/null || true
    sudo chown -R "$PRINT_USER:$PRINT_USER" "$INSTALL_DIR"
    log "   ✓ Files copied to $INSTALL_DIR"
fi

# ──────────────────────────────────────────────────────────────
# 4. Create Python virtual environment
# ──────────────────────────────────────────────────────────────
log ""
log "🐍 Setting up Python virtual environment..."
if [ ! -d "$INSTALL_DIR/venv" ]; then
    cd "$INSTALL_DIR"
    python3 -m venv venv
    log "   ✓ Virtual environment created"
fi

# Install dependencies
log "   📦 Installing Python dependencies..."
cd "$INSTALL_DIR"
./venv/bin/pip install -q --upgrade pip setuptools wheel 2>&1 | tee -a "$LOG_FILE"
if [ -f requirements.txt ]; then
    ./venv/bin/pip install -q -r requirements.txt 2>&1 | tee -a "$LOG_FILE"
    log "   ✓ Dependencies installed"
else
    log "   ⚠ requirements.txt not found"
fi

# ──────────────────────────────────────────────────────────────
# 5. Setup environment file
# ──────────────────────────────────────────────────────────────
log ""
log "⚙️  Configuring environment..."
ENV_FILE="$INSTALL_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$INSTALL_DIR/.env.local" ]; then
        log "   ✓ Using .env.local"
        cp "$INSTALL_DIR/.env.local" "$ENV_FILE"
        chmod 600 "$ENV_FILE"
    elif [ -f "$INSTALL_DIR/.env.example" ]; then
        log "   📝 Creating .env from template"
        cp "$INSTALL_DIR/.env.example" "$ENV_FILE"
        chmod 600 "$ENV_FILE"
        log "   ⚠ IMPORTANT: Edit $ENV_FILE with your Supabase credentials"
    else
        log "   ⚠ No environment template found"
    fi
else
    log "   ✓ .env already configured"
fi

# ──────────────────────────────────────────────────────────────
# 6. Setup systemd service
# ──────────────────────────────────────────────────────────────
log ""
log "🔧 Installing systemd service..."
SERVICE_FILE="/etc/systemd/system/inklings-printer.service"
SERVICE_TEMPLATE="$INSTALL_DIR/prague-printer.service"

if [ -f "$SERVICE_TEMPLATE" ]; then
    # Create service file with correct paths and user
    SERVICE_CONTENT="[Unit]
Description=Inklings Thermal Print Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$PRINT_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/venv/bin/python print_server.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
"
    sudo bash -c "cat > $SERVICE_FILE" <<< "$SERVICE_CONTENT"
    sudo chmod 644 "$SERVICE_FILE"
    sudo systemctl daemon-reload
    sudo systemctl enable inklings-printer
    log "   ✓ Service installed and enabled"
else
    log "   ⚠ Service template not found"
fi

# ──────────────────────────────────────────────────────────────
# 7. Setup WiFi (if needed)
# ──────────────────────────────────────────────────────────────
log ""
log "📡 Checking WiFi configuration..."
if [ -f /boot/firmware/wpa_supplicant.conf ] || [ -f /boot/wpa_supplicant.conf ]; then
    log "   ✓ WiFi configuration found"
elif [ -f /etc/wpa_supplicant/wpa_supplicant.conf ]; then
    log "   ✓ WiFi already configured"
else
    log "   ⚠ No WiFi configuration found (may be using Ethernet)"
fi

# ──────────────────────────────────────────────────────────────
# 8. Cleanup and completion
# ──────────────────────────────────────────────────────────────
log ""
log "🧹 Cleaning up..."
sudo systemctl daemon-reload

log ""
log "╔════════════════════════════════════════════════════════════╗"
log "║  ✓ Provisioning Complete!                                  ║"
log "╚════════════════════════════════════════════════════════════╝"
log ""
log "Next steps:"
log "  1. Edit environment: $ENV_FILE"
log "     - Set SUPABASE_URL and SUPABASE_SERVICE_KEY"
log "     - Verify PRINTER_ID matches your setup"
log "  2. Start service: sudo systemctl start inklings-printer"
log "  3. Check logs: sudo journalctl -u inklings-printer -f"
log ""
log "Provisioning complete! Logs saved to: $LOG_FILE"
