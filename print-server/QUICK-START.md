# Print Server SD Card - Quick Start

## TL;DR - Get Running in 5 Minutes

### 1. Download Raspberry Pi Imager
https://www.raspberrypi.com/software/

### 2. Flash SD Card
- Device: Raspberry Pi 4/5
- OS: Raspberry Pi OS Lite (64-bit)
- Storage: Your microSD card
- In "Edit Settings":
  - Hostname: `print-server`
  - WiFi: Your network + password
  - Username: `pi`
  - SSH: Enable
  - Save & Flash

### 3. Boot Pi with Printer
Insert SD card → Connect printer → Power on → Wait 2-3 minutes

### 4. SSH and Configure
```bash
ssh pi@print-server.local

# Get Supabase credentials from: /home/pi/capstone/print-server/GET-CREDENTIALS.md
nano ~/capstone/print-server/.env

# Edit these:
# SUPABASE_URL=...
# SUPABASE_SERVICE_KEY=...
# PRINTER_ID=...

# Validate setup
python3 ~/capstone/print-server/validate-setup.py

# Start service
sudo systemctl start inklings-printer

# Check logs
sudo journalctl -u inklings-printer -f
```

### 5. Test Print
Create a receipt in the web app and click Print. You should see output in the logs.

---

## What Happens on First Boot?

1. Raspberry Pi OS boots
2. Network connects (WiFi auto-configured)
3. **Provisioning script runs automatically:**
   - Installs Python and dependencies
   - Sets up virtual environment
   - Configures systemd service
   - Prepares print server (service won't start until you add credentials)

4. You SSH in and add Supabase credentials to `.env`
5. Service starts and begins polling for print jobs

---

## File Guide

| File | Purpose |
|------|---------|
| `provision.sh` | Automatic setup on first boot |
| `provision.service` | Runs `provision.sh` once on startup |
| `prague-printer.service` | Main print server service (runs print_server.py) |
| `print_server.py` | Main daemon that polls Supabase |
| `validate-setup.py` | Check if everything is configured correctly |
| `GET-CREDENTIALS.md` | Step-by-step guide to get Supabase credentials |
| `SD-CARD-SETUP.md` | Detailed setup instructions (3 options) |
| `.env.example` | Template for environment variables |
| `.env.local` | Pre-configured example (for development) |

---

## Troubleshooting

### Pi won't boot
- Try a different SD card
- Check power supply (need 5V/3A minimum)
- Make sure USB printer is powered on

### WiFi not connecting
```bash
sudo systemctl status networking
sudo wpa_cli -i wlan0 scan
sudo systemctl restart networking
```

### Printer not detected
```bash
lsusb | grep 0483

# If you see it, check permissions:
ls -la /dev/bus/usb/*/

# Reset service:
sudo systemctl restart inklings-printer
```

### Service won't start
```bash
# Check logs
sudo journalctl -u inklings-printer -n 50

# Validate setup
python3 ~/capstone/print-server/validate-setup.py

# Check .env file
cat ~/capstone/print-server/.env
```

### Print jobs stuck
```bash
# Restart service
sudo systemctl restart inklings-printer

# Check if Supabase credentials are correct
# Update .env if needed and restart
```

---

## Useful Commands

```bash
# SSH to Pi
ssh pi@print-server.local

# View live logs
sudo journalctl -u inklings-printer -f

# Stop/start service
sudo systemctl stop inklings-printer
sudo systemctl start inklings-printer

# Restart service
sudo systemctl restart inklings-printer

# Check service status
sudo systemctl status inklings-printer

# Edit service config
sudo systemctl edit inklings-printer

# View all recent logs
sudo journalctl -u inklings-printer -n 100

# Reboot Pi
sudo reboot

# Find Pi IP address
hostname -I

# Get printer USB info
lsusb -v | grep -A 10 "0483"
```

---

## Next Steps

- [ ] Flash SD card using Raspberry Pi Imager
- [ ] Boot Pi with printer connected
- [ ] SSH to `print-server.local`
- [ ] Get Supabase credentials (see `GET-CREDENTIALS.md`)
- [ ] Add credentials to `.env`
- [ ] Run `validate-setup.py` to verify
- [ ] Start service: `sudo systemctl start inklings-printer`
- [ ] Test with a print job from the web app
- [ ] Monitor logs: `sudo journalctl -u inklings-printer -f`

---

## Security Reminders

✅ **Secure your setup:**
- Change default `pi` password
- Use SSH keys instead of password auth
- Keep `.env` file private
- Don't commit credentials to git

```bash
# After setup, disable password auth and use keys only
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart ssh
```

---

## Performance Tips

- If CPU stays high (>70%): Increase `POLL_INTERVAL` in `.env` (e.g., 5 instead of 3)
- Use Ethernet instead of WiFi for reliability
- Keep printer powered on always
- Monitor disk space: `df -h`
- Check RAM: `free -h`

---

## Full Documentation

- **Setup Options:** See `SD-CARD-SETUP.md` for detailed manual setup
- **Troubleshooting:** See `README.md` in the print-server directory
- **Getting Credentials:** See `GET-CREDENTIALS.md` for step-by-step Supabase setup

---

## Support

If you get stuck:
1. Check logs: `sudo journalctl -u inklings-printer -f`
2. Run validation: `python3 ~/capstone/print-server/validate-setup.py`
3. Verify credentials in: `cat ~/capstone/print-server/.env`
4. Check printer connection: `lsusb | grep 0483`

Share the output of these commands with your team for debugging.
