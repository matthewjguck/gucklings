# Print System Setup - Summary

## What's Been Done ✅

All infrastructure for remote thermal printer support has been set up. The system is ready for configuration and testing.

### 1. **Supabase Integration** ✅

- Database schema defined with TypeScript types (`src/types/database.ts`)
- Tables ready: `printers` (hardware registry) and `print_jobs` (job queue)
- Geofence SQL function for nearest printer routing
- PostGIS extension support for location-based routing

### 2. **Frontend - Print Flow** ✅

- **Receipt rendering** (`src/lib/escpos.ts`): HTML → ESC/POS with Floyd-Steinberg dithering
- **Job submission** (`src/lib/printJob.ts`): Submits jobs to Supabase with geolocation
- **Configuration** (`src/lib/printBackend.ts`): Supports both local and cloud backends
- **Integration**: `Write.tsx` page uses block-based receipt canvas

### 3. **Backend - Raspberry Pi** ✅

- Python print server (`print-server/print_server.py`) - polls Supabase and prints
- Systemd service setup (`print-server/prague-printer.service`)
- Installation script (`print-server/install.sh`) - automated setup on Pi
- Environment template (`print-server/.env.example`)

### 4. **Local Development** ✅

- Node.js print server (`scripts/print-server.mjs`) - test without Pi
- Canvas preview support (`scripts/canvas-shim.mjs`)
- Test script (`scripts/test-print-setup.mjs`) - validates configuration
- NPM scripts:
  - `npm run dev:print` - start local print server
  - `npm run test:print` - check setup

### 5. **Documentation** ✅

- **PRINT_QUICK_SETUP.md** - 5-10 minute getting started (start here!)
- **SETUP_PRINTING.md** - Complete technical guide with SQL, USB setup, troubleshooting
- **PRINTING.md** - API reference, file structure, performance notes
- This file - overview of what's been set up

## Next Steps

### 👤 You (Developer)

1. **Get Supabase credentials:**
   - Create free project at https://supabase.com
   - Copy URL and Anon Key to `.env`
   - Run SQL schema from SETUP_PRINTING.md (or use web UI)

2. **Test locally (no Pi needed):**
   ```bash
   npm run dev:print    # Terminal 1
   npm run dev          # Terminal 2
   npm run test:print   # Terminal 3
   ```
   - Go to http://localhost:5173/compose
   - Build a receipt and submit
   - Check `last-print.bin` was created

3. **Deploy to Raspberry Pi:**
   - Follow PRINT_QUICK_SETUP.md Step 3
   - Get service role key from Supabase
   - Use `bash print-server/install.sh` on Pi

### 🔐 Configuration Files

Edit these before running:

**Frontend** (`.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PRINT_BACKEND=supabase  # or 'local' for testing
```

**Raspberry Pi** (`print-server/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PRINTER_ID=your-printer-uuid
USB_VENDOR_ID=0x0483
USB_PRODUCT_ID=0x5743
```

## Architecture

```
User submits receipt
        ↓
Receipt HTML rendered to ESC/POS bitmap
        ↓
Base64 encoded and submitted to Supabase
        ↓
print_jobs table (status: pending)
        ↓
Raspberry Pi polls every 3 seconds
        ↓
Print server finds job, claims it
        ↓
Decodes ESC/POS and sends to USB printer
        ↓
Updates job status → printing → done
```

## Features Included

✅ **Geofence Routing** - Automatically selects nearest printer  
✅ **Multiple Printers** - Support for different printers in different locations  
✅ **Job Queue** - Supabase acts as durable message queue  
✅ **Retry Logic** - Built into polling (not yet error handling)  
✅ **Web UI Integration** - `/compose` screen submits jobs  
✅ **ESC/POS Rendering** - HTML to bitmap with dithering  
✅ **Local Testing** - No printer needed to develop  

## Testing Without Printer

Before setting up Raspberry Pi:

```bash
# Terminal 1: Start local print server
npm run dev:print

# Terminal 2: Start web app
npm run dev

# Terminal 3: Check configuration
npm run test:print
```

Then navigate to http://localhost:5173/compose and submit a receipt. The output will be saved to `last-print.bin`.

## Monitoring & Logs

**Local development:**
```bash
# Watch last-print.bin changes
tail -f last-print.bin | xxd | head -20
```

**Raspberry Pi:**
```bash
# Real-time service logs
journalctl -u prague-printer -f

# Check service status
systemctl status prague-printer

# Restart service
sudo systemctl restart prague-printer
```

**Supabase Dashboard:**
- Navigate to `print_jobs` table
- Watch status changes: pending → printing → done
- Check error_message if status is 'failed'

## Common Tasks

### View All Print Jobs
```bash
curl 'https://your-project.supabase.co/rest/v1/print_jobs' \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Update Printer Location
```sql
UPDATE printers 
SET latitude = 40.7580, longitude = -73.9855 
WHERE id = 'printer-uuid';
```

### Check Printer Status
```sql
SELECT id, name, is_active, latitude, longitude FROM printers;
```

### Manual Print Job (testing)
```bash
# Insert a test job into Supabase
curl -X POST 'https://your-project.supabase.co/rest/v1/print_jobs' \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "printer_id": "your-printer-uuid",
    "recipient_name": "Test User",
    "payload_base64": "base64-encoded-escpos-here",
    "status": "pending"
  }'
```

## Troubleshooting

**Print server won't start:**
```bash
node scripts/print-server.mjs
# Check for errors in console
```

**Can't find printer USB:**
```bash
lsusb | grep -i brightek
# Should show: ID 0483:5743
```

**Supabase connection fails:**
```bash
npm run test:print
# Will test all connections
```

**Jobs stuck in pending:**
- Verify printer exists and is_active = true
- Check Raspberry Pi service logs
- Ensure service role key is correct

## Files Changed/Added

```
prague/
├── .env                           (updated: Supabase config)
├── package.json                   (added: dev:print, test:print scripts)
├── PRINTING.md                    (new: API reference)
├── PRINT_QUICK_SETUP.md          (new: 5-min quick start)
├── SETUP_PRINTING.md             (new: complete technical guide)
├── PRINT_SETUP_SUMMARY.md        (new: this file)
├── scripts/
│   ├── test-print-setup.mjs      (new: configuration validator)
│   └── print-server.mjs          (already exists: local dev server)
└── print-server/
    └── install.sh                 (new: Pi installation helper)
```

## Ready to Test? 

Start with **PRINT_QUICK_SETUP.md** for a 5-minute overview!

For complete details, see **SETUP_PRINTING.md**.

Questions? Check **PRINTING.md** for API reference and troubleshooting.
