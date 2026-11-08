#!/bin/bash
# Install rastertomhtpos as CUPS filter on Raspberry Pi

set -e

echo "Installing rastertomhtpos CUPS filter..."

# Check if running on Pi
if ! uname -m | grep -q "armv7l\|armv6l\|aarch64"; then
    echo "Warning: This script is designed for Raspberry Pi (ARM). Current architecture: $(uname -m)"
fi

# Copy filter to CUPS directory
sudo cp rastertomhtpos.py /usr/lib/cups/filter/rastertomhtpos
sudo chmod +x /usr/lib/cups/filter/rastertomhtpos

# Create PPD file for the printer
# This defines the printer capabilities for CUPS

PPD_FILE="/etc/cups/ppd/Brightek-POS80.ppd"

sudo tee "$PPD_FILE" > /dev/null <<'EOPPD'
*PPDFileName: "Brightek-POS80.ppd"
*FormatVersion: "4.3"
*FileVersion: "1.0"
*LanguageVersion: English
*LanguageEncoding: ISOLatin1
*PSVersion: "(3010.000) 550"
*ModelName: "Brightek POS80"
*ShortNickName: "Brightek POS80"
*NickName: "Brightek POS80 Thermal Printer"
*Manufacturer: "Brightek"
*Product: "[Brightek POS80]"

*% Supported paper sizes
*PaperDimension Letter/US Letter: "612 792"
*PaperDimension A4/A4: "595 842"
*PaperDimension 80mm/80mm Roll: "227 792"
*PaperDimension Custom/Custom: "0 0"

*ImageableArea Letter/US Letter: "0 0 612 792"
*ImageableArea A4/A4: "0 0 595 842"
*ImageableArea 80mm/80mm Roll: "0 0 227 792"
*ImageableArea Custom/Custom: "0 0 227 792"

*DefaultPageSize: 80mm
*DefaultImageableArea: 80mm

*% Color support
*ColorModel RGB/RGB: "True"
*ColorModel Gray/Grayscale: "True"
*DefaultColorModel: Gray

*% Resolution
*Resolution 203dpi/203 dpi: ""
*DefaultResolution: 203dpi

*% Filters
*cupsFilter: "application/vnd.cups-raster 100 rastertomhtpos"
*cupsFilter: "application/vnd.cups-pdf 100 rastertomhtpos"

*% Supported input formats
*cupsFilter: "image/png 100 rastertomhtpos"
*cupsFilter: "image/jpeg 100 rastertomhtpos"

*% Job accounting
*JobPatchFile 1: "%% Brightek POS80 - Start of job"

EOPPD

echo "✓ CUPS filter installed at /usr/lib/cups/filter/rastertomhtpos"
echo "✓ PPD file installed at $PPD_FILE"
echo ""
echo "Next steps:"
echo "1. Restart CUPS: sudo systemctl restart cups"
echo "2. Add the printer: sudo lpadmin -p Brightek-POS80 -E -v usb://Brightek/POS80 -m Brightek-POS80.ppd"
echo "3. Set as default (optional): lpoptions -d Brightek-POS80"
echo "4. Test: lp -d Brightek-POS80 /path/to/image.png"
