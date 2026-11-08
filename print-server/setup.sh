#!/bin/bash
# Complete setup for Brightek POS80 print server on Raspberry Pi

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Brightek POS80 Print Server Setup                        ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Install with: sudo apt install python3"
    exit 1
fi

# Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Add inklings user to groups
echo ""
echo "👤 Setting up user permissions..."
if id -u inklings &>/dev/null 2>&1; then
    sudo usermod -a -G dialout inklings 2>/dev/null || true
    sudo usermod -a -G lp inklings 2>/dev/null || true
    sudo usermod -a -G lpadmin inklings 2>/dev/null || true
    echo "   ✓ Added inklings to dialout, lp, lpadmin groups"
else
    echo "   ⚠ inklings user not found. Skip this, or create with:"
    echo "   sudo useradd -m -s /bin/bash inklings"
fi

# Setup environment
echo ""
echo "⚙️  Checking environment configuration..."
if [ -f .env ]; then
    echo "   ✓ .env file exists"
else
    echo "   ℹ Creating .env template..."
    cat > .env.template <<'ENVEOF'
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here

# Printer Configuration
PRINTER_ID=printer-uuid
USB_VENDOR_ID=0x0483
USB_PRODUCT_ID=0x5743

# Server Settings
POLL_INTERVAL=3
ENVEOF
    echo "   📝 Edit .env.template and rename to .env"
fi

# Systemd service
echo ""
echo "🔧 Setting up systemd service..."
if [ -f /etc/systemd/system/inklings-printer.service ]; then
    echo "   ✓ Service already configured"
else
    echo "   ⚠ Systemd service not found at /etc/systemd/system/inklings-printer.service"
    echo "   Create it with the configuration from the main setup"
fi

# Optional: CUPS setup
echo ""
echo "🖨️  CUPS Setup (optional)"
read -p "Install CUPS backend for system-wide printing? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   Installing CUPS backend..."
    sudo cp rastertomhtpos.py /usr/lib/cups/filter/rastertomhtpos 2>/dev/null || \
        echo "   ❌ Failed to copy filter"
    sudo cp usb-backend.py /usr/lib/cups/backend/usb-mhtpos 2>/dev/null || \
        echo "   ❌ Failed to copy backend"
    sudo chmod +x /usr/lib/cups/filter/rastertomhtpos 2>/dev/null || true
    sudo chmod +x /usr/lib/cups/backend/usb-mhtpos 2>/dev/null || true
    sudo systemctl restart cups 2>/dev/null || true
    echo "   ✓ CUPS backend installed"
fi

# Test bootloader exit
echo ""
echo "🔌 Testing bootloader exit utility..."
python3 bootloader_exit.py || true

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Setup Complete!                                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next: Edit .env with Supabase credentials, then:"
echo "  sudo systemctl start inklings-printer"
echo ""
