# Print Server Deployment Guide

Complete reference for deploying headless Brightek POS80 print servers to Raspberry Pi.

## Overview

This deployment creates a **fully automated, headless print server** that:
- ✅ Boots automatically with WiFi
- ✅ Polls Supabase every 3 seconds for print jobs
- ✅ Sends jobs to Brightek POS80 thermal printer
- ✅ Updates job status back to Supabase
- ✅ Restarts automatically on crash
- ✅ No manual intervention after initial setup

## Architecture

```
Supabase                Print Server (Pi)         Printer
  ↓                          ↓                        ↓
[print_jobs table]  ←→  [Polling daemon]  ←→  [USB thermal]
  ↓                          ↓                        ↓
[Updates status]      [Updates status]         [Output receipt]
```

**Flow:**
1. User creates receipt in web app
2. App sends binary to Supabase `print_jobs` table
3. Print server polls Supabase every 3 seconds
4. Server finds pending job, sends to printer
5. Server updates job status to "printing" then "done"
6. Status updated in real-time to web app

## Prerequisites

### Hardware
- Raspberry Pi 4 or 5 (4GB+ RAM recommended)
- 32GB+ microSD card (class 10 or better)
- Brightek POS80 thermal printer
- USB cable (printer to Pi)
- USB power supply (5V/3A minimum for Pi)
- Printer power supply
- WiFi network (or Ethernet cable)

### Software
- Raspberry Pi Imager (Mac/Linux/Windows)
- SSH client (built-in on Mac/Linux)
- Text editor (for `.env` file)

### Credentials
- Supabase project URL
- Supabase service role key (NOT anon key)
- Printer ID

## Installation Methods

### Quick Start (Recommended)
Best for single setup or testing.

See: `QUICK-START.md` (5 minutes)

### Detailed Setup
Multiple options including manual SD card setup and custom images.

See: `SD-CARD-SETUP.md` (10-15 minutes)

### Getting Credentials
Step-by-step guide for Supabase configuration.

See: `GET-CREDENTIALS.md` (5 minutes)

## File Structure

```
print-server/
├── print_server.py              # Main daemon
├── provision.sh                 # First-boot setup script
├── provision.service            # Systemd service for provisioning
├── prague-printer.service       # Main service definition
├── validate-setup.py            # Configuration validator
├── bootloader_exit.py           # USB bootloader handler
├── rastertomhtpos.py            # Image → ESC/POS converter
├── usb-backend.py               # CUPS USB backend
├── requirements.txt             # Python dependencies
├── .env.example                 # Config template
├── .env.local                   # Pre-configured example
├── README.md                    # Full documentation
├── QUICK-START.md               # 5-minute setup
├── SD-CARD-SETUP.md             # Detailed setup (3 options)
├── GET-CREDENTIALS.md           # Supabase credential guide
└── DEPLOYMENT-GUIDE.md          # This file
```

## Step-by-Step Deployment

### Phase 1: SD Card Preparation (10 minutes)

1. **Get microSD card** (32GB+, class 10)
2. **Download Raspberry Pi Imager**
   - https://www.raspberrypi.com/software/
3. **Flash SD card**
   - Choose: Raspberry Pi 4/5
   - Choose: Raspberry Pi OS Lite (64-bit)
   - Configure WiFi, hostname, SSH
   - Write image

### Phase 2: Hardware Setup (5 minutes)

1. **Insert SD card** into Raspberry Pi
2. **Connect printer** via USB
3. **Power on both Pi and printer**
4. **Wait 2-3 minutes** for first boot and provisioning

### Phase 3: Configuration (10 minutes)

1. **Get credentials**
   - Follow: `GET-CREDENTIALS.md`
   - You'll need: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `PRINTER_ID`

2. **SSH to Raspberry Pi**
   ```bash
   ssh pi@print-server.local
   # or: ssh pi@<ip-address>
   ```

3. **Edit environment file**
   ```bash
   nano ~/capstone/print-server/.env
   ```
   Update:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGc...your-key
   PRINTER_ID=home-printer-gucklings
   ```
   Save: `Ctrl+X`, `Y`, `Enter`

4. **Validate setup**
   ```bash
   cd ~/capstone/print-server
   python3 validate-setup.py
   ```

5. **Start service**
   ```bash
   sudo systemctl start inklings-printer
   ```

6. **Verify running**
   ```bash
   sudo journalctl -u inklings-printer -f
   # Should show: "Polling Supabase for print jobs"
   ```

### Phase 4: Testing (5 minutes)

1. **Create test receipt** in web app
2. **Click Print** button
3. **Check Pi logs** (from SSH):
   ```bash
   sudo journalctl -u inklings-printer -f
   ```
4. **Verify receipt printed** on thermal printer

### Phase 5: Verification Checklist

- [ ] Pi boots automatically with WiFi
- [ ] SSH access works: `ssh pi@print-server.local`
- [ ] Printer detected: `lsusb | grep 0483`
- [ ] Service running: `sudo systemctl status inklings-printer`
- [ ] Service enabled: `sudo systemctl is-enabled inklings-printer`
- [ ] Test print successful
- [ ] Status shows "done" in web app

## Multi-Unit Deployment

### Option A: Use Custom Image (Fastest)

After setting up first unit successfully:

```bash
# On the configured Pi:
sudo dd if=/dev/mmcblk0 bs=4M | gzip > ~/print-server-image.img.gz
scp pi@print-server.local:~/print-server-image.img.gz .

# Flash to new cards:
# On Mac:
gunzip -c print-server-image.img.gz | sudo dd of=/dev/rdiskX bs=4m
diskutil eject /dev/diskX

# On Linux:
gunzip -c print-server-image.img.gz | sudo dd of=/dev/sdX bs=4M
```

**Notes:**
- All cloned units will have same Supabase credentials
- All will use same `PRINTER_ID`
- For multi-printer setup, either:
  1. Use different credentials per unit, OR
  2. Update `.env` after cloning

### Option B: Automated Setup Script

For team deployment, provide units with:
1. Pre-flashed SD cards
2. Printed card with credentials and setup URL
3. Instructions to SSH and run: `bash ~/capstone/print-server/validate-setup.py`

## Configuration Options

### Environment Variables

```bash
# Required
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
PRINTER_ID=printer-id

# Optional (with defaults)
USB_VENDOR_ID=0x0483              # Default (Brightek)
USB_PRODUCT_ID=0x5743             # Default (Brightek app mode)
POLL_INTERVAL=3                   # Seconds (default: 3)
```

### Adjusting Poll Interval

If CPU usage is high or network is unreliable:

```bash
nano ~/capstone/print-server/.env
# Change: POLL_INTERVAL=5  (or higher)
sudo systemctl restart inklings-printer
```

## Monitoring & Maintenance

### View Live Logs
```bash
ssh pi@print-server.local
sudo journalctl -u inklings-printer -f
```

### Check Service Status
```bash
sudo systemctl status inklings-printer
```

### Restart Service
```bash
sudo systemctl restart inklings-printer
```

### Update Credentials
```bash
nano ~/capstone/print-server/.env
sudo systemctl restart inklings-printer
```

### System Updates
```bash
sudo apt update
sudo apt upgrade -y
sudo reboot
```

## Troubleshooting Matrix

| Issue | Check | Solution |
|-------|-------|----------|
| Pi won't boot | Power supply | Use 5V/3A supply |
| WiFi not connecting | Network config | Edit wpa_supplicant.conf |
| Printer not found | USB connection | Reseat cable, power cycle |
| Service won't start | Error logs | `sudo journalctl -u inklings-printer -n 50` |
| High CPU usage | Poll interval | Increase POLL_INTERVAL |
| Print jobs hang | Supabase connection | Verify credentials in .env |
| Service crashed | Auto-restart | Check logs: `journalctl -u inklings-printer` |

## Security Best Practices

### Initial Setup
```bash
# Change password
passwd

# Add SSH key (recommended)
mkdir -p ~/.ssh
# Copy public key from your computer
nano ~/.ssh/authorized_keys

# Disable password auth (optional but recommended)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart ssh
```

### Credential Management
- ✅ Keep `.env` files private (don't commit to git)
- ✅ Use service role key only (NOT anon key)
- ✅ Rotate credentials if compromised
- ✅ Use separate credentials per environment (dev/prod)

### Network Security
- ✅ Use strong WiFi password
- ✅ Keep system updated: `sudo apt upgrade`
- ✅ Use firewall if applicable
- ✅ Monitor for unauthorized access

## Performance Tuning

### For High-Volume Printing
- Increase RAM (8GB Pi recommended)
- Use Ethernet instead of WiFi
- Reduce POLL_INTERVAL to 2 seconds
- Monitor CPU and memory: `top`

### For Low-Bandwidth Environments
- Increase POLL_INTERVAL to 5-10 seconds
- Compress images before sending
- Use print job queuing (Supabase)

### Disk Space
```bash
# Check disk usage
df -h

# Clean old logs if needed
sudo journalctl --vacuum=30d  # Keep last 30 days
```

## Disaster Recovery

### Full Reconfiguration
```bash
ssh pi@print-server.local
rm ~/capstone/print-server/.env
bash ~/capstone/print-server/provision.sh
# Then reconfigure .env
```

### Replace Printer
```bash
# Update USB IDs if using different printer
lsusb  # Find new vendor/product IDs
nano ~/capstone/print-server/.env
# Update USB_VENDOR_ID and USB_PRODUCT_ID
sudo systemctl restart inklings-printer
```

### SD Card Recovery
If SD card fails, reflash using custom image or repeat SD-CARD-SETUP.

## Support Checklist

When reporting issues, provide:
- [ ] Error message from: `sudo journalctl -u inklings-printer -n 50`
- [ ] Setup validation output: `python3 validate-setup.py`
- [ ] Environment check: `lsusb | grep 0483`
- [ ] Service status: `sudo systemctl status inklings-printer`
- [ ] Network status: `sudo systemctl status networking`
- [ ] Disk space: `df -h`

## Next Steps

1. **Read QUICK-START.md** for fast deployment (5 min)
2. **Read SD-CARD-SETUP.md** for detailed options (10-15 min)
3. **Read GET-CREDENTIALS.md** before configuring (5 min)
4. **Follow README.md** for full technical reference

---

**Questions?** Check the relevant guide above or review logs with:
```bash
sudo journalctl -u inklings-printer -f
```
