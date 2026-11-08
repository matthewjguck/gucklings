#!/bin/bash
# Raspberry Pi Print Server Installation Script

set -e

echo "📦 Prague Print Server Installation"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Python version
echo -e "${BLUE}Checking Python version...${NC}"
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python $python_version"

# Create virtual environment (optional but recommended)
if [ ! -d "venv" ]; then
    echo -e "${BLUE}Creating virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
fi

# Install dependencies
echo -e "${BLUE}Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}.env file not found${NC}"
    echo "Creating .env from template..."
    cp .env.example .env
    echo -e "${BLUE}Edit .env with your Supabase credentials:${NC}"
    echo "  SUPABASE_URL=https://your-project.supabase.co"
    echo "  SUPABASE_SERVICE_KEY=eyJ..."
    echo "  PRINTER_ID=your-printer-uuid"
    echo ""
    exit 1
fi

# Check USB access
echo -e "${BLUE}Checking USB permissions...${NC}"
if lsusb | grep -iq brightek; then
    echo -e "${GREEN}✓ Printer detected${NC}"
else
    echo -e "${RED}⚠ No Brightek printer detected (may be powered off)${NC}"
fi

# Test Supabase connection
echo -e "${BLUE}Testing Supabase connection...${NC}"
python3 -c "
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
try:
    client = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
    result = client.table('printers').select('id').limit(1).execute()
    print('✓ Connected to Supabase')
except Exception as e:
    print(f'✗ Supabase error: {e}')
    exit(1)
" || exit 1

echo ""
echo -e "${GREEN}✓ Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Test the server:    python print_server.py"
echo "  2. Install service:    sudo bash setup.sh"
echo "  3. Check logs:         journalctl -u prague-printer -f"
