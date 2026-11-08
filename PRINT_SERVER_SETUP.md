# Gucklings Print Server Setup

This guide covers setting up the local print server that runs at the parents' house and handles thermal printing.

## Hardware Requirements

- **Printer**: Brightek POS80 thermal printer
- **Computer**: Any Linux/macOS/Windows machine that stays on
- **USB Cable**: To connect printer to computer

## Installation

### 1. Install Python Dependencies

```bash
pip install supabase python-dotenv pillow pyusb
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
```

### 3. Connect Thermal Printer

1. Plug in the Brightek POS80 thermal printer via USB
2. Install printer drivers if needed (see [Brightek documentation](https://www.posprinter.com/))

### 4. Test Printer Connection

```bash
python3 -c "import usb.core; print(usb.core.find(idVendor=0x0471, idProduct=0x066f))"
```

Should output something like:
```
DEVICE ID 0471:066f on Bus 001 Device 002
```

If not found, check:
- Printer is plugged in and powered on
- Drivers are installed
- USB permissions: `sudo chmod 666 /dev/usb*`

### 5. Run the Print Server

```bash
python3 print_server.py
```

Output should show:
```
Connected to thermal printer
Print server started. Polling for jobs...
```

### 6. Run as Background Service (Optional)

**systemd (Linux):**

Create `/etc/systemd/system/gucklings-print.service`:

```ini
[Unit]
Description=Gucklings Print Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/gucklings
ExecStart=/usr/bin/python3 /home/pi/gucklings/print_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable gucklings-print
sudo systemctl start gucklings-print
```

Check status:

```bash
sudo systemctl status gucklings-print
tail -f /var/log/syslog | grep gucklings
```

**macOS (launchd):**

Create `~/Library/LaunchAgents/com.gucklings.print.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.gucklings.print</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>/path/to/gucklings/print_server.py</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/gucklings-print.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/gucklings-print-error.log</string>
</dict>
</plist>
```

Load and start:

```bash
launchctl load ~/Library/LaunchAgents/com.gucklings.print.plist
```

## How It Works

1. **Frontend**: User composes letter → clicks "Send to Printer"
2. **Vercel API** (`/api/print`): Stores print job in Supabase with `status: pending`
3. **Frontend**: Polls `/api/print/{jobId}` every second for status
4. **Print Server** (local): Continuously polls Supabase for pending jobs
5. **Print Server**: When job found:
   - Updates status to `printing`
   - Decodes base64 image
   - Sends to thermal printer via USB
   - Updates status to `printed`
6. **Frontend**: Receives `status: printed` → shows success

## Debugging

### Printer not found

```bash
# List USB devices
lsusb  # Linux
system_profiler SPUSBDataType  # macOS

# Check if it's the right device (0471:066f)
```

### Print jobs stuck in "pending"

1. Check print server is running: `ps aux | grep print_server`
2. Check logs: `tail -f /tmp/gucklings-print.log` (macOS) or `journalctl -u gucklings-print` (Linux)
3. Verify Supabase connection: Check `.env` file

### Image not printing correctly

- Check image size (should be ~384px wide)
- Check image is valid PNG/JPEG
- Try printing a test image manually

## Troubleshooting

**"Thermal printer not found"**
- Restart print server
- Reconnect printer USB
- Check device ID with `lsusb`

**"Failed to connect to Supabase"**
- Verify `.env` file has correct credentials
- Check internet connection
- Test with: `curl https://your-project.supabase.co`

**Printer queuing jobs but not printing**
- Check printer is powered on
- Check paper feed
- Check for error lights on printer
- Try restarting print server: `sudo systemctl restart gucklings-print`

## API Endpoints

### POST `/api/print`

Submit a print job.

**Request:**
```json
{
  "receiptImage": "iVBORw0KGgoAAAANSUhEUgAA...",
  "senderName": "Mom"
}
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### GET `/api/print/{jobId}`

Check print job status.

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "printed",
  "errorMessage": null,
  "createdAt": "2026-11-07T12:00:00Z",
  "updatedAt": "2026-11-07T12:01:00Z"
}
```

Status values: `pending`, `printing`, `printed`, `failed`

## More Help

- Thermal printer manual: Check Brightek POS80 documentation
- ESC/POS reference: https://en.wikipedia.org/wiki/ESC/P
- Supabase docs: https://supabase.com/docs
