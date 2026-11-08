# Thermal Printer + Raspberry Pi Setup Guide

This guide documents the complete process to set up a new Brightek thermal printer with a Raspberry Pi print server for the Inklings app.

## Hardware Setup

### Requirements
- Brightek POS80 thermal printer (USB connection)
- Raspberry Pi 4 or later with Raspberry Pi OS
- USB cable (for printer connection)
- Network connection (WiFi or Ethernet)

### Connections
1. Connect Brightek printer via USB to the Raspberry Pi
2. Verify connection: `lsusb | grep 0483`
   - Should show: `0483:5720 STMicroelectronics` (bootloader mode - this is correct)

## Raspberry Pi Setup

### Initial SSH Access
```bash
ssh inklings@<pi-ip-address>
```

### Install Python & Dependencies
```bash
sudo apt update
sudo apt install python3-full python3-venv pip git
```

### Clone Repository
```bash
cd /home/inklings
git clone git@github.com:carmahhawwari/CAPSTONE.git capstone
cd capstone/print-server
```

### Create Python Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Common Issue:** `externally-managed-environment` error
- Solution: Use a virtual environment (shown above) - don't use system Python

## Supabase Configuration

### Add Printer to Database

1. Go to Supabase dashboard → `printers` table
2. Insert a new row with:
   - `name`: Printer location name (e.g., "d.School")
   - `latitude`: GPS latitude of printer location
   - `longitude`: GPS longitude of printer location
   - `geofence_radius_m`: Service radius in meters (e.g., 500)
   - `api_key`: Generate a random UUID (use `uuidgen` command)
   - `is_active`: `true`

3. **Copy the generated `id` UUID** - you'll need this for the Pi's `.env`

### Example Row
```
id: 90d1ab1d-8336-416d-8d54-a191e5812dda
name: d.School
latitude: 37.4261808998927
longitude: -122.180506029008
geofence_radius_m: 500
api_key: 78154f67-db65-4758-8ebc-b1e544248f31
is_active: true
```

## Print Server Configuration

### Create `.env` File
```bash
nano /home/inklings/capstone/print-server/.env
```

Paste (replace values):
```
SUPABASE_URL=https://yyhbbqjgwcjnipdguygp.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PRINTER_ID=90d1ab1d-8336-416d-8d54-a191e5812dda
USB_VENDOR_ID=0x0483
USB_PRODUCT_ID=0x5720
POLL_INTERVAL=3
```

**Critical:** 
- `PRINTER_ID` must match the UUID from Supabase `printers` table
- `USB_PRODUCT_ID` must be `0x5720` (bootloader mode, not 0x5743)
- `SUPABASE_SERVICE_KEY` needs full permissions to access `print_jobs` table

### Test Configuration
```bash
source venv/bin/activate
python print_server.py
```

You should see:
```
[server] Print server starting
[server] Printer ID: 90d1ab1d-...
[server] Polling every 3s
[server] Ready to accept print jobs
```

Leave it running and test by submitting a print job from the app. Should see:
```
[job <job-id>] Processing...
[job <job-id>] ✓ Printed successfully
```

Press Ctrl+C to stop.

## Systemd Service Setup

### Create Service File
```bash
sudo nano /etc/systemd/system/prague-printer.service
```

Paste:
```ini
[Unit]
Description=Prague Thermal Printer Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/inklings/capstone/print-server
Environment="PATH=/home/inklings/capstone/print-server/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/home/inklings/capstone/print-server/venv/bin/python -u /home/inklings/capstone/print-server/print_server.py
StandardOutput=journal
StandardError=journal
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Enable & Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable prague-printer
sudo systemctl start prague-printer
```

### Verify Service is Running
```bash
sudo systemctl status prague-printer
sudo journalctl -u prague-printer -f
```

Should show:
```
[server] Print server starting
[server] Printer ID: ...
[server] Ready to accept print jobs
```

## Troubleshooting

### Service Fails to Start

**Issue:** Service shuts down immediately
- **Cause:** USB permissions or venv issues
- **Fix:** 
  1. Run `python print_server.py` manually to test
  2. If it works manually but not via systemd, restart the Pi: `sudo reboot`
  3. Check service file has correct path to venv Python

**Issue:** `ModuleNotFoundError: No module named 'supabase'`
- **Cause:** Requirements not installed in venv
- **Fix:** Run `pip install -r requirements.txt` in the venv

**Issue:** `[Errno 13] Access denied (insufficient permissions)`
- **Cause:** Python process can't access USB printer
- **Fix:** Ensure service runs as root (remove `User=inklings` if present)

### Printer Not Found

**Issue:** Service says "Ready to accept print jobs" but doesn't process them
- **Cause:** `PRINTER_ID` in `.env` doesn't match Supabase
- **Fix:** Verify `.env` PRINTER_ID matches the `id` column in Supabase `printers` table

**Issue:** USB device shows as `0483:5743` instead of `0x5720`
- **Cause:** Printer firmware difference
- **Fix:** Update `USB_PRODUCT_ID` in `.env` to match actual device ID from `lsusb`

### Print Jobs Stuck in "Pending"

**Issue:** Job created in Supabase but never printed
- **Cause:** Service not polling or printer unreachable
- **Fix:**
  1. Check service is running: `sudo systemctl status prague-printer`
  2. Check logs: `sudo journalctl -u prague-printer -f`
  3. Verify printer is connected: `lsusb | grep 0483`

## Testing the Flow

### End-to-End Test
1. Open app at `http://10.15.134.171:5173`
2. Go to Home → Print
3. Select an unprinted message
4. See printer location displayed (auto-selected via geofence)
5. Click "Print on the Inklings printer"
6. Message should print immediately
7. Check Pi logs: `sudo journalctl -u prague-printer -f`

### Manual Job Submission (Testing)
If you need to test without the app:
```sql
-- In Supabase SQL editor
INSERT INTO print_jobs (printer_id, payload_base64, recipient_name, status)
VALUES (
  '90d1ab1d-8336-416d-8d54-a191e5812dda',
  'base64_encoded_escpos_data_here',
  'Test User',
  'pending'
);
```

## Device Model Reference

### Brightek POS80 Details
- **USB Vendor ID:** 0x0483 (STMicroelectronics)
- **USB Product ID:** 0x5720 (Bootloader/Normal mode)
- **Connection:** USB 2.0
- **Protocol:** ESC/POS
- **Paper Width:** 80mm (3.15 inches)
- **Max Print Width:** 576 pixels at 203 DPI

## Pi Hostnames & IPs

Keep this updated as you add more Pis:
- `inklings2` @ 10.31.5.113 → d.School printer
- [Add more as needed]

## Future Enhancements

- [ ] Add printer heartbeat monitoring (update `updated_at` timestamp)
- [ ] Implement print job status updates back to app
- [ ] Add udev rules for USB permissions instead of running as root
- [ ] Web UI for printer management
- [ ] Print queue visualization
