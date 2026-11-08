# Brightek POS80 Print Server for Raspberry Pi

Complete print server solution for internet-based thermal printing via Supabase.

## Architecture

Two parallel printing pipelines:

### Pipeline 1: Internet-based (via Supabase)
```
Web App → Supabase → print_server.py → USB Printer
```
Jobs created in app are sent to Supabase, print server polls and prints.

### Pipeline 2: System CUPS printing
```
Any App → CUPS → rastertomhtpos → usb-backend → USB Printer
```
System-wide printing from any application via CUPS.

## Components

### `print_server.py` — Supabase Polling Server
- Connects to Supabase PostgreSQL
- Polls every 3 seconds for pending print jobs
- Sends ESC/POS binary to USB printer via pyusb
- Updates job status (pending → printing → done/failed)
- Auto-starts as systemd service
- **Best for:** Web app printing

### `bootloader_exit.py` — Device Mode Switcher
- Detects printer in bootloader mode (USB 0x0483:0x5720)
- Attempts USB reset and firmware control transfers
- Waits for device to re-enumerate in application mode (0x5743)
- Called automatically by print_server.py on startup
- **Solves:** "Invalid endpoint address" errors

### `rastertomhtpos.py` — Raster-to-ESC/POS Converter
- CUPS filter that converts PPM raster to ESC/POS bitmap
- Replacement for macOS rastertomhtpos binary
- Dithering: Floyd-Steinberg, ordered (Bayer), or threshold
- Auto-scales images to printer width (227 dots / 80mm)
- Outputs raw ESC/POS commands
- **Best for:** CUPS integration

### `usb-backend.py` — CUPS USB Backend
- CUPS backend (/usr/lib/cups/backend/usb-mhtpos)
- Receives ESC/POS from rastertomhtpos filter
- Handles bootloader mode detection and exit
- Sends data directly to USB printer
- **Best for:** System-wide printing from any app

## Installation

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

Requires: Pillow, pyusb, python-escpos, supabase, python-dotenv

### 2. Configure Environment
```bash
cp .env.example .env
# Edit with: SUPABASE_URL, SUPABASE_SERVICE_KEY, PRINTER_ID
# Optional: USB_VENDOR_ID, USB_PRODUCT_ID, POLL_INTERVAL
```

### 3. Setup Internet Printing (Supabase)
The service file at `/etc/systemd/system/inklings-printer.service` enables auto-start.

```bash
sudo systemctl enable inklings-printer
sudo systemctl start inklings-printer
sudo journalctl -u inklings-printer -f
```

This polls Supabase for jobs and prints them automatically.

### 4. (Optional) Setup System CUPS Printing
For printing from any Linux application via CUPS:

```bash
# Copy filter and backend to CUPS
sudo cp rastertomhtpos.py /usr/lib/cups/filter/rastertomhtpos
sudo cp usb-backend.py /usr/lib/cups/backend/usb-mhtpos
sudo chmod +x /usr/lib/cups/filter/rastertomhtpos
sudo chmod +x /usr/lib/cups/backend/usb-mhtpos

# Copy PPD printer definition
sudo cp /tmp/MP_POS_80.ppd /etc/cups/ppd/Brightek-POS80.ppd

# Create CUPS printer entry
sudo lpadmin -p Brightek-POS80 -E -v usb://0x0483:0x5743 -m Brightek-POS80.ppd

# Set as default (optional)
lpoptions -d Brightek-POS80

# Restart CUPS
sudo systemctl restart cups
```

Test CUPS printing:
```bash
echo "Test" | lp -d Brightek-POS80
# Or print an image:
lp -d Brightek-POS80 /path/to/image.png
```

## Troubleshooting

### Printer in Bootloader Mode
**Symptom:** "Invalid endpoint address 0x1" in logs

**Cause:** Device detected as 0x0483:0x5720 (bootloader) instead of 0x5743 (application)

**Fix:**
```bash
# Manual exit
python print-server/bootloader_exit.py

# Or automatic (runs on print server startup)
sudo systemctl restart inklings-printer
```

The device should re-enumerate as 0x5743. This happens automatically on print server startup.

### USB Device Not Found
```bash
# Check if device is visible
lsusb | grep 0483

# If found: check permissions
ls -la /dev/bus/usb/*/

# Fix: Add user to dialout group
sudo usermod -a -G dialout inklings
sudo usermod -a -G lp inklings
```

Then log out and log back in, or restart the print server.

### CUPS Printer Offline
```bash
# Check CUPS status
lpstat -p -d

# Restart CUPS
sudo systemctl restart cups

# Check backend logs
tail -f /var/log/cups/error_log
```

### Resource Busy Error (USB)
**Symptom:** `[Errno 16] Resource busy` when printing

**Cause:** Device held by kernel driver or bootloader_exit script

**Fix:**
1. Ensure bootloader_exit script isn't running (`pkill -f bootloader_exit`)
2. The print server now auto-detaches kernel drivers
3. If still busy, unplug printer and wait 10 seconds before plugging back in

The print server handles both application mode (0x5743) and bootloader mode (0x5720) with automatic kernel driver detach.

### Test Printing

**From web app:**
1. Log in to Inklings
2. Create a test receipt
3. Click "Print"
4. Check logs: `sudo journalctl -u inklings-printer -f`

**From CUPS:**
```bash
lp -d Brightek-POS80 /path/to/image.png
lpstat -o  # Check print queue
lprm -P Brightek-POS80 -  # Clear queue
```

**Manual test:**
```bash
python print-server/rastertomhtpos.py test.png test.bin
hexdump -C test.bin | head  # Verify ESC/POS commands
```

## Architecture

```
Web App (React/Vite)
    ↓
Supabase (PostgreSQL)
    ↓
Print Server (polls every 3s)
    ↓
USB Printer
```

1. User creates receipt on web app
2. App sends ESC/POS data to Supabase
3. Print server polls and finds job
4. Server sends binary to USB printer via pyusb
5. Printer outputs receipt
6. Status updated back to app (real-time via Supabase)

## USB Protocol

The Brightek POS80 uses two device modes:

| Mode | Vendor ID | Product ID | Interface | Endpoints |
|------|-----------|-----------|-----------|-----------|
| **Application** | 0x0483 | 0x5743 | Printer | Variable (auto-detected) |
| **Bootloader** | 0x0483 | 0x5720 | Printer (0x81 IN, 0x03 OUT) | Fixed: IN=0x81, OUT=0x03 |

### Bootloader Mode Support

The printer often boots in bootloader mode (0x5720). **The print server now works in bootloader mode** using explicit endpoint addresses:

**Solution implemented:**
1. Detect both device IDs (0x5743 and 0x5720)
2. Use fixed endpoints (IN=0x81, OUT=0x03) for bootloader mode
3. Detach kernel driver if claimed (`usb.detach_kernel_driver()`)
4. Handle "Resource busy" errors with USB reset

**This eliminates the need for bootloader exit on most systems.** The printer prints successfully in bootloader mode as long as endpoints are explicit.

### ESC/POS Command Format

The printer uses standard ESC/POS (Epson Standard Code for POS) thermal printer commands:

```
ESC @ — Reset printer
ESC 3 <n> — Set line spacing
GS v 0 — Raster image command (for bitmaps)
1D 2F — Raster image (alternate)
ESC i — Partial cut
ESC m — Full cut
```

Our implementation uses:
- **GS v 0** format for bitmap images (standard)
- **Floyd-Steinberg dithering** for better image quality
- **203 DPI** (standard thermal printer resolution)
- **576 dots wide** = 80mm at 203 DPI

## Printer Specs

**Model:** Brightek POS80 (MP-POS80 in China)  
**Interface:** USB  
**Vendor ID:** 0x0483  
**Product ID:** 0x5743 (application) / 0x5720 (bootloader)  
**Width:** 80mm (227 points / 576 dots at 203 DPI)  
**Paper:** 80mm thermal roll  
**Command Set:** ESC/POS (Epson thermal printer standard)  
**Max Print Speed:** ~10 lines/second  
**Resolution:** 203 DPI (monochrome)
