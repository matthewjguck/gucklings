# Print System - Quick Setup (5-10 minutes)

## ✅ Before You Start
- Brightek POS80 thermal printer (or compatible ESC/POS)
- Raspberry Pi 4/5 with internet
- Supabase project (free tier OK)

## 📋 Step 1: Supabase Setup (2 min)

1. Create project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   
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

   CREATE OR REPLACE FUNCTION public.nearest_printer(lat double precision, lng double precision)
   RETURNS uuid
   LANGUAGE sql
   STABLE
   AS $$
     SELECT id FROM public.printers
     WHERE is_active = true
     AND ST_DWithin(
       ST_Point(longitude, latitude)::geography,
       ST_Point(lng, lat)::geography,
       geofence_radius_m
     )
     ORDER BY ST_Distance(
       ST_Point(longitude, latitude)::geography,
       ST_Point(lng, lat)::geography
     ) LIMIT 1
   $$;

   INSERT INTO public.printers (name, latitude, longitude)
   VALUES ('My Printer', 40.7128, -74.0060);
   ```
3. Copy the printer ID from the response
4. Get keys from **Settings → API**

## 🖥️ Step 2: Frontend Setup (2 min)

1. Edit `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_PRINT_BACKEND=supabase
   ```

2. Test: `npm run test:print`

## 🍓 Step 3: Raspberry Pi Setup (5 min)

### SSH into Pi:
```bash
ssh pi@192.168.1.X
cd ~
git clone https://github.com/your-repo.git capstone
cd capstone/print-server
bash install.sh
```

### During install, edit `.env`:
```bash
nano .env
```

Paste:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PRINTER_ID=your-printer-uuid-from-step-1
USB_VENDOR_ID=0x0483
USB_PRODUCT_ID=0x5743
POLL_INTERVAL=3
```

### Test locally:
```bash
python3 print_server.py
```

Should show:
```
[server] Print server starting
[server] Printer ID: xxx
[server] Polling every 3s
```

### Install as service:
```bash
sudo bash setup.sh
sudo systemctl start prague-printer
sudo systemctl status prague-printer
```

## 🧪 Step 4: Test Printing

1. Open web app: `npm run dev`
2. Go to `/compose`
3. Build a test receipt
4. Click "Submit receipt"
5. Check Supabase dashboard → `print_jobs` table
   - Status should change: `pending` → `printing` → `done`
6. Watch Raspberry Pi logs:
   ```bash
   journalctl -u prague-printer -f
   ```
7. **Printer should print!**

## 🔍 Debugging

### Check Supabase connection:
```bash
# From Pi
python3 -c "from supabase import create_client; print('OK')"

# From web
npm run test:print
```

### Check printer USB:
```bash
# From Pi
lsusb | grep -i brightek
```

### View logs:
```bash
# Service logs
journalctl -u prague-printer -f

# Supabase table (watch for status changes)
curl 'https://your-project.supabase.co/rest/v1/print_jobs?limit=1' \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 📚 Full Docs

See [SETUP_PRINTING.md](./SETUP_PRINTING.md) for detailed configuration and troubleshooting.

## 💡 Tips

- **Test locally first**: Set `VITE_PRINT_BACKEND=local` to print to `last-print.bin`
- **Geofencing**: Update printer location in Supabase when you move
- **Multiple printers**: Add more rows to `printers` table with different locations
- **Permissions**: If "permission denied", run: `sudo usermod -a -G dialout pi`

## 🚀 Next Steps

- Set up systemd service auto-restart: `sudo systemctl enable prague-printer`
- Monitor printer health (offline detection)
- Add print history to UI
- Create printer admin dashboard
