# Printing Setup Guide

This guide covers setting up remote thermal printer support using Supabase as a message queue and a Raspberry Pi as the print server.

## Architecture Overview

```
Web App (Prague)
    ↓ (submits print job)
Supabase print_jobs table (queue)
    ↓ (polls)
Raspberry Pi (print_server.py)
    ↓ (sends ESC/POS)
Brightek POS80 Thermal Printer (USB)
```

## Prerequisites

- **Supabase project** with tables created (see Schema section below)
- **Raspberry Pi 4/5** with Python 3.8+
- **Brightek POS80** thermal printer (or compatible ESC/POS printer)
- Internet connection on both devices

## 1. Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for it to initialize
4. Save your Project URL and Anon Key

### 1.2 Create Database Tables

Run the following SQL in the Supabase SQL Editor to create the required tables:

```sql
-- Printers table (geofence-enabled print servers)
CREATE TABLE public.printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  geofence_radius_m integer DEFAULT 500,
  api_key text NOT NULL DEFAULT gen_random_uuid()::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Print Jobs table (work queue)
CREATE TABLE public.print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id uuid REFERENCES public.printers(id),
  sender_id uuid,
  recipient_name text,
  payload_base64 text NOT NULL,
  status text DEFAULT 'pending',
  error_message text,
  sender_latitude double precision,
  sender_longitude double precision,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Geofence routing function
CREATE OR REPLACE FUNCTION public.nearest_printer(lat double precision, lng double precision)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id
  FROM public.printers
  WHERE is_active = true
    AND ST_DWithin(
      ST_Point(longitude, latitude)::geography,
      ST_Point(lng, lat)::geography,
      geofence_radius_m
    )
  ORDER BY ST_Distance(
    ST_Point(longitude, latitude)::geography,
    ST_Point(lng, lat)::geography
  )
  LIMIT 1
$$;

-- Add indexes for performance
CREATE INDEX idx_print_jobs_status ON public.print_jobs(status);
CREATE INDEX idx_print_jobs_printer_id ON public.print_jobs(printer_id);
CREATE INDEX idx_printers_active ON public.printers(is_active);
```

### 1.3 Enable PostGIS Extension (for geofencing)

In the Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 1.4 Insert Your First Printer

In the Supabase SQL Editor:

```sql
INSERT INTO public.printers (name, latitude, longitude, geofence_radius_m, is_active)
VALUES (
  'Living Room Printer',
  40.7128,           -- Your latitude
  -74.0060,          -- Your longitude
  500,               -- Geofence radius in meters
  true
);
```

Save the printer ID from the response.

### 1.5 Get Your API Keys

From the Supabase dashboard:
- **Anon Key**: Settings → API → `VITE_SUPABASE_ANON_KEY` (for web app)
- **Service Role Key**: Settings → API → `SUPABASE_SERVICE_KEY` (for Raspberry Pi)

## 2. Frontend Configuration

### 2.1 Update `.env` file

Edit `/prague/.env`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key

# Print Backend Configuration
# Options: 'local' (http://localhost:9100) or 'supabase' (cloud-based)
VITE_PRINT_BACKEND=supabase
VITE_PRINT_SERVER_URL=http://127.0.0.1:9100
```

### 2.2 Testing Locally

To test with local printing first:

```env
VITE_PRINT_BACKEND=local
```

Then start the local print server:

```bash
npm run dev:print
```

The server will run on `http://localhost:9100` and output to `last-print.bin`.

## 3. Raspberry Pi Setup

### 3.1 SSH into Raspberry Pi

```bash
ssh pi@192.168.1.X
```

### 3.2 Install Python Dependencies

```bash
cd ~/capstone-print-server  # or wherever you clone it
pip install -r requirements.txt
```

Required packages:
- `python-dotenv` - environment variables
- `supabase` - Supabase client
- `pyusb` - USB printer access

### 3.3 Install ESC/POS Library

```bash
pip install pyusb pyudev
```

### 3.4 Disable CUPS (if printing via USB)

If using direct USB access, disable CUPS:

```bash
sudo systemctl stop cups
sudo systemctl disable cups
```

### 3.5 Configure USB Permissions

To access the printer without root:

```bash
sudo usermod -a -G lpadmin pi
sudo usermod -a -G dialout pi
```

Then create a udev rule:

```bash
sudo nano /etc/udev/rules.d/99-printer.rules
```

Add:

```
# Brightek POS80 thermal printer
SUBSYSTEMS=="usb", ATTRS{idVendor}=="0483", ATTRS{idProduct}=="5743", MODE="0666"
```

Reload:

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### 3.6 Find Printer USB IDs

List USB devices:

```bash
lsusb
```

Example output:

```
Bus 001 Device 008: ID 0483:5743 STMicroelectronics ...
```

This means:
- `USB_VENDOR_ID=0x0483`
- `USB_PRODUCT_ID=0x5743`

### 3.7 Configure Environment

Create `/home/pi/capstone-print-server/.env`:

```bash
cd ~/capstone-print-server
cp print-server/.env.example .env
nano .env
```

Fill in:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-role-key
PRINTER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
USB_VENDOR_ID=0x0483
USB_PRODUCT_ID=0x5743
POLL_INTERVAL=3
```

### 3.8 Test the Print Server

```bash
cd ~/capstone-print-server
python print-server/print_server.py
```

You should see:

```
[server] Print server starting
[server] Printer ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[server] Polling every 3s
```

### 3.9 Install as Systemd Service

Copy the service file:

```bash
sudo cp print-server/prague-printer.service /etc/systemd/system/
```

Edit the path:

```bash
sudo nano /etc/systemd/system/prague-printer.service
```

Update `WorkingDirectory` and `ExecStart` paths.

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable prague-printer
sudo systemctl start prague-printer
```

Check status:

```bash
sudo systemctl status prague-printer
journalctl -u prague-printer -f
```

## 4. Testing the Full Flow

### 4.1 Submit a Print Job

In the web app:
1. Navigate to `/compose`
2. Build a receipt with blocks
3. Click "Submit receipt"

### 4.2 Monitor the Job

In the Supabase dashboard:
1. Go to `print_jobs` table
2. Verify a new row appears with `status: 'pending'`
3. Watch it change to `printing` then `done`

In the Raspberry Pi:

```bash
journalctl -u prague-printer -f
```

You should see:

```
[job abc12345] Processing...
[job abc12345] Printed successfully (1234 bytes)
```

## 5. Geofencing

The system automatically selects the nearest printer based on your location.

### 5.1 Update Printer Location

```sql
UPDATE public.printers
SET latitude = 40.7580, longitude = -73.9855
WHERE id = 'your-printer-id';
```

### 5.2 Adjust Geofence Radius

```sql
UPDATE public.printers
SET geofence_radius_m = 1000  -- 1km radius
WHERE id = 'your-printer-id';
```

## 6. Troubleshooting

### Printer Not Found

```bash
lsusb | grep -i brightek
```

If nothing appears, check USB connection.

### Permission Denied (USB)

```bash
ls -la /dev/bus/usb/*/
sudo usermod -a -G plugdev pi
```

### Service Won't Start

```bash
journalctl -u prague-printer -n 50
python /path/to/print_server.py  # Run directly to see errors
```

### No Jobs Being Processed

1. Check Supabase connection:
   ```python
   python -c "from supabase import create_client; print('OK')"
   ```

2. Verify printer ID exists:
   ```bash
   curl 'https://your-project.supabase.co/rest/v1/printers?id=eq.your-printer-id' \
     -H "Authorization: Bearer your-service-key"
   ```

3. Check print_jobs table:
   ```bash
   curl 'https://your-project.supabase.co/rest/v1/print_jobs?status=eq.pending' \
     -H "Authorization: Bearer your-service-key"
   ```

## 7. Production Checklist

- [ ] Supabase project created and schema loaded
- [ ] API keys configured in `.env` files
- [ ] Raspberry Pi SSH access working
- [ ] Python dependencies installed
- [ ] USB printer detected and accessible
- [ ] Service running and auto-starting
- [ ] Geofence location set correctly
- [ ] Test print job submitted and printed
- [ ] Logs showing no errors

## 8. Security Notes

- **Service Key**: Keep `SUPABASE_SERVICE_KEY` secret (only on Raspberry Pi)
- **Anon Key**: Safe to share in web app code
- **API Key**: Rotate printer API keys periodically
- **Network**: Use HTTPS/VPN if Raspberry Pi is on public network
