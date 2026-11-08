# Printing System

## Quick Start

### Local Development

Test printing locally without a Raspberry Pi:

```bash
# Terminal 1: Start the web app
npm run dev

# Terminal 2: Start the local print server
npm run dev:print
```

The print server runs on `http://localhost:9100` and saves output to `last-print.bin`.

### Production Setup

For remote printing via Raspberry Pi:

1. Follow [SETUP_PRINTING.md](./SETUP_PRINTING.md)
2. Update `.env` with your Supabase credentials
3. Install the print server on Raspberry Pi
4. Submit receipts from the web app

## How It Works

### Web App Flow

1. User submits a receipt in `/compose`
2. Receipt HTML is rendered to ESC/POS binary
3. ESC/POS is base64 encoded
4. Job inserted into Supabase `print_jobs` table with status `pending`
5. User is redirected to home

### Raspberry Pi Flow

1. Print server polls Supabase every 3 seconds
2. Fetches jobs with `status: 'pending'` for this printer
3. Claims the job (sets to `printing`)
4. Decodes base64 to ESC/POS
5. Sends to USB thermal printer
6. Updates status to `done`

### Geofencing

If the user grants location permission:
- Web app sends user's coordinates
- Supabase finds nearest printer within geofence radius
- Job routes to nearest printer
- Fallback: any active printer if none in range

## File Structure

```
prague/
├── .env                          # Frontend config (Supabase keys, backend mode)
├── SETUP_PRINTING.md            # Detailed setup guide
├── PRINTING.md                  # This file
├── scripts/
│   ├── print-server.mjs         # Local dev print server (Node.js)
│   └── canvas-shim.mjs          # Canvas library for print preview
├── src/
│   └── lib/
│       ├── supabase.ts          # Supabase client
│       ├── escpos.ts            # Receipt → ESC/POS rendering
│       ├── printJob.ts          # Submit job to Supabase
│       └── printBackend.ts      # Config (local vs. supabase)
└── print-server/                # Raspberry Pi server
    ├── .env.example             # Config template
    ├── print_server.py          # Main polling server
    ├── requirements.txt         # Python dependencies
    ├── setup.sh                 # Systemd service setup
    ├── prague-printer.service   # Systemd unit file
    └── install.sh               # Installation helper
```

## Configuration

### Frontend (.env)

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Print backend: 'local' or 'supabase'
VITE_PRINT_BACKEND=local
VITE_PRINT_SERVER_URL=http://127.0.0.1:9100
```

### Raspberry Pi (print-server/.env)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
PRINTER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
USB_VENDOR_ID=0x0483
USB_PRODUCT_ID=0x5743
POLL_INTERVAL=3
```

## Testing

### Unit: Local Print Server

```bash
npm run dev:print
```

Then POST to `http://localhost:9100/print`:

```bash
# Using the test binary
curl -X POST \
  --data-binary @last-print.bin \
  http://localhost:9100/print
```

### Integration: Full Stack

1. Start dev server: `npm run dev`
2. Open `/compose`
3. Build a test receipt
4. Click "Submit receipt"
5. Check Supabase dashboard: `print_jobs` table should have new row
6. On Raspberry Pi, watch logs: `journalctl -u prague-printer -f`
7. Printer should print and job status should update to `done`

### Geofencing

Test geofence routing:

```bash
# Check your location's nearest printer
curl 'https://your-project.supabase.co/rest/v1/rpc/nearest_printer' \
  -X POST \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lat": 40.7128, "lng": -74.0060}'
```

## Troubleshooting

### Printer Not Responding

```bash
# Check USB connection
lsusb | grep -i brightek

# Check permissions
ls -la /dev/bus/usb/*/

# List device IDs
lsusb -d 0483:
```

### Service Won't Start

```bash
# Check service status
systemctl status prague-printer

# Read logs
journalctl -u prague-printer -n 50

# Test manually
python3 print-server/print_server.py
```

### Jobs Stuck in "pending"

1. Verify printer exists in Supabase:
   ```sql
   SELECT * FROM printers WHERE is_active = true;
   ```

2. Check for import errors:
   ```bash
   python3 -c "from supabase import create_client; from escpos.printer import Usb; print('OK')"
   ```

3. Force retest:
   ```bash
   systemctl restart prague-printer
   tail -f /var/log/syslog | grep prague
   ```

## API Reference

### POST /print (Local Server)

Send ESC/POS binary:

```bash
curl -X POST \
  -H "Content-Type: application/octet-stream" \
  --data-binary @file.bin \
  http://localhost:9100/print
```

Response: `200 OK` or error message

### POST /preview (Local Server)

Convert base64 ESC/POS to PNG:

```bash
curl -X POST \
  -H "Content-Type: application/octet-stream" \
  --data "$(base64 file.bin)" \
  http://localhost:9100/preview \
  > output.png
```

### RPC: nearest_printer

Find nearest printer:

```sql
SELECT public.nearest_printer(40.7128::double precision, -74.0060::double precision);
```

Returns printer UUID or NULL.

## Security Checklist

- [ ] Service key never committed to git
- [ ] Service key only on Raspberry Pi
- [ ] Anon key safe for web client
- [ ] Print jobs table has RLS policies (optional)
- [ ] Printer geofence tested
- [ ] USB device accessible without root
- [ ] Firewall allows Supabase egress

## Performance

- **Poll interval**: 3 seconds (configurable)
- **Max jobs per poll**: 10 (prevents overload)
- **Timeout**: 10s USB write
- **Job lifecycle**: ~5-10 seconds total

## Future Enhancements

- [ ] Print queue dashboard
- [ ] Job history and analytics
- [ ] Printer health monitoring
- [ ] Retry logic for failed prints
- [ ] Multiple printer failover
- [ ] Print preview in UI
- [ ] Receipt template system
