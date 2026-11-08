# Plug-N-Play Raspberry Pi Print Server SD Card Setup

Complete guide to create a headless Brightek POS80 print server that boots and runs automatically.

## Prerequisites

- Raspberry Pi 4 or 5 with 4GB+ RAM
- 32GB+ microSD card
- USB cable for printer
- Mac or Linux computer for flashing
- Supabase credentials (URL, service key)

## Option 1: Using Raspberry Pi Imager (Recommended)

This is the easiest method for a completely automated setup.

### Step 1: Prepare the SD Card

1. Download and install **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Insert your microSD card into your computer
3. Open Raspberry Pi Imager
4. Click **"Choose Device"** → Select your Pi model (4 or 5)
5. Click **"Choose OS"** → **Raspberry Pi OS (other)** → **Raspberry Pi OS Lite (64-bit)**
6. Click **"Choose Storage"** → Select your microSD card
7. Click **"Next"** → Click **"Edit Settings"**

### Step 2: Configure in Imager

In the settings dialog:

**General tab:**
- Hostname: `print-server` (or your preferred name)
- Username: `pi`
- Password: Set a strong password
- Wireless SSID: Your WiFi network name
- Wireless password: Your WiFi password
- Wireless country: Your country code (e.g., `US`)
- Set locale settings as needed

**Services tab:**
- ✅ Enable SSH
- Set password authentication (or add public key)

**Advanced tab:**
- ⚠️ DO NOT enable overscan
- Set GPU memory to 128MB (optional)

### Step 3: Write the Image

Click **"Save"** → **"Yes"** → Wait for flashing to complete (5-10 minutes)

### Step 4: Boot and Auto-Provision

1. Insert the SD card into your Raspberry Pi
2. Connect the printer via USB
3. Power on the Pi
4. Wait 2-3 minutes for first boot and provisioning
5. The print server will auto-install dependencies and configure

### Step 5: Configure Supabase Credentials

SSH into the Pi:

```bash
ssh pi@print-server.local
# or if mDNS doesn't work: ssh pi@<ip-address>
```

Edit the environment file:

```bash
nano ~/capstone/print-server/.env
```

Update these values:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
PRINTER_ID=home-printer-gucklings
```

Save (Ctrl+X, Y, Enter) and start the service:

```bash
sudo systemctl start inklings-printer
sudo journalctl -u inklings-printer -f  # Watch logs
```

---

## Option 2: Manual Setup (Advanced)

For more control or if using a different OS.

### Step 1: Flash Raspberry Pi OS

```bash
# Using Raspberry Pi Imager or:
sudo dd if=image.img of=/dev/rdiskX bs=4m
```

### Step 2: Enable SSH on Boot

Create an empty `ssh` file on the boot partition:
```bash
touch /Volumes/boot/ssh
```

### Step 3: Configure WiFi

Create `wpa_supplicant.conf` on boot partition:

```bash
cat > /Volumes/boot/wpa_supplicant.conf <<'EOF'
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=US

network={
    ssid="Your-WiFi-SSID"
    psk="Your-WiFi-Password"
    key_mgmt=WPA-PSK
}
EOF
```

### Step 4: Boot and SSH In

```bash
# Wait 1-2 minutes for first boot
ssh pi@print-server.local
```

### Step 5: Clone Repository

```bash
mkdir -p ~/capstone
cd ~/capstone
git clone <your-repo-url>
cd ~/capstone/print-server
```

### Step 6: Run Provisioning

```bash
bash provision.sh
```

### Step 7: Configure Credentials

```bash
cp .env.local .env  # if using production credentials
# or
nano .env
```

Edit with your Supabase credentials.

### Step 8: Start Service

```bash
sudo systemctl start inklings-printer
sudo journalctl -u inklings-printer -f
```

---

## Option 3: Create Custom SD Card Image

For mass deployment or consistent setups.

### Step 1: Setup Master SD Card

Follow Option 1 completely, including provisioning and testing.

### Step 2: Create Image

On the Pi:
```bash
sudo dd if=/dev/mmcblk0 bs=4M | gzip > ~/print-server-backup.img.gz
```

Transfer to your computer:
```bash
scp pi@print-server.local:~/print-server-backup.img.gz .
```

### Step 3: Flash Future Cards

```bash
# On Mac:
gunzip -c print-server-backup.img.gz | sudo dd of=/dev/rdiskX bs=4m
diskutil eject /dev/diskX

# On Linux:
gunzip -c print-server-backup.img.gz | sudo dd of=/dev/sdX bs=4M
sync
```

---

## Verification Checklist

✅ Pi boots and connects to WiFi  
✅ SSH access works: `ssh pi@print-server.local`  
✅ Python installed: `python3 --version`  
✅ Virtual environment: `ls ~/capstone/print-server/venv/bin/python`  
✅ Dependencies installed: `~/capstone/print-server/venv/bin/pip list`  
✅ Service enabled: `sudo systemctl is-enabled inklings-printer`  
✅ Printer detected: `lsusb | grep 0483`  
✅ Service running: `sudo systemctl status inklings-printer`  

### Test Print

Via web app:
1. Create a receipt
2. Click "Print"
3. Check logs: `sudo journalctl -u inklings-printer -f`

---

## Troubleshooting

### WiFi Not Connecting

```bash
# Check WiFi status
sudo iwlist wlan0 scan | grep ESSID
sudo systemctl status networking

# Edit config
sudo nano /etc/wpa_supplicant/wpa_supplicant.conf

# Restart
sudo systemctl restart networking
```

### Printer Not Detected

```bash
# List USB devices
lsusb | grep 0483

# Check permissions
ls -la /dev/bus/usb/*/

# Reset USB
sudo systemctl restart inklings-printer
```

### Service Won't Start

```bash
# Check logs
sudo journalctl -u inklings-printer -n 50

# Check environment
cat ~/capstone/print-server/.env

# Verify credentials
~/capstone/print-server/venv/bin/python -c "from supabase import create_client; print('OK')"
```

### High CPU Usage

- Reduce `POLL_INTERVAL` if needed (default: 3 seconds)
- Check for USB issues: `dmesg | tail -20`
- Monitor: `top -u pi`

---

## Security Notes

⚠️ **Important:**
- The `.env` file contains Supabase service keys — keep it private
- Use `sudo systemctl edit inklings-printer` to view logs without exposing credentials
- Consider disabling SSH password auth once set up: use key-based auth only
- Regularly update system: `sudo apt update && sudo apt upgrade`

---

## Network Configuration for Headless Setup

### Find Your Pi on the Network

```bash
# Method 1: mDNS (if supported)
ping print-server.local

# Method 2: Find IP by MAC address
arp -a | grep -i b8  # Raspberry Pi MAC prefix

# Method 3: Check router DHCP clients
# Access your router admin panel
```

### Static IP (Optional)

Edit `/etc/dhcpcd.conf`:

```bash
sudo nano /etc/dhcpcd.conf
```

Add at the end:
```
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
```

Restart: `sudo systemctl restart dhcpcd`

---

## Emergency Reset

To reconfigure everything (if credentials changed):

```bash
ssh pi@print-server.local
rm ~/capstone/print-server/.env
bash ~/capstone/print-server/provision.sh
# Then edit .env and restart
```

---

## Support & Logs

View real-time logs:
```bash
sudo journalctl -u inklings-printer -f
```

Collect debug info:
```bash
sudo systemctl status inklings-printer
lsusb
python3 --version
~/capstone/print-server/venv/bin/pip list | grep -E "supabase|pyusb|pillow"
```

Share output if troubleshooting with team.
