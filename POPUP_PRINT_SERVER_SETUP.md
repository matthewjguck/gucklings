# Pop-Up Event Print Server Setup (MacBook)

Quick setup guide for running the print server on a MacBook for a temporary pop-up event.

> **Got 30 minutes?** Follow the 6 steps below. No prior technical knowledge needed.

---

## What You'll Receive

Before the event, you should have:
- 📄 **`.env` file** (already prepared — just copy it)
- 🖨️ **USB thermal printer** (Brightek POS80)
- 🔌 **USB cable** for printer
- 📶 **WiFi access** on the same network as guests

## ⚡ 6 Simple Steps

### **Step 1: Clone the Code** (1 min)
Open Terminal and run:
```bash
cd ~/Desktop
git clone git@github.com:carmahhawwari/CAPSTONE.git capstone
cd capstone/print-server
```

### **Step 2: Copy the `.env` File** (1 min)
You'll receive a file called `.env`. Copy it to the folder:
```bash
# Assuming the .env file is on your Desktop
cp ~/Desktop/.env ~/Desktop/capstone/print-server/.env

# Verify it's there:
ls -la .env
```

### **Step 3: Install Python Dependencies** (3 min)
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

⚠️ **No `python3` command?** Install it first:
```bash
brew install python3
```
Then repeat the steps above.

### **Step 4: Plug in the Printer** (1 min)
1. Connect the Brightek thermal printer via USB to the MacBook
2. Verify it's recognized:
   ```bash
   system_profiler SPUSBDataType | grep -i brightek
   ```
   You should see: `ID 0483:5743` (or `0x5720`)

### **Step 5: Start the Print Server** (instant)
```bash
source venv/bin/activate
python print_server.py
```

**✅ Success looks like:**
```
[server] Print server starting
[server] Printer ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[server] Polling every 3s
[server] Ready to accept print jobs
```

**Keep this terminal open.** ← This is now running!

### **Step 6: Test It** (1 min)
1. Open the app on any phone/laptop on the **same WiFi**
2. Navigate to: **Home → Print → Select a message**
3. Tap **Print**
4. **Look at the MacBook terminal** — you should see:
   ```
   [job xxxxxxxx] Processing...
   [job xxxxxxxx] ✓ Printed successfully
   ```
5. **Check the printer** — the receipt prints! 🎉

---

**All steps done? You're ready for the event!**

## 🔧 Troubleshooting

### Problem: "Ready to accept print jobs" but nothing prints

**Step 1: Check the printer hardware**
```bash
system_profiler SPUSBDataType | grep -i brightek
```
Should show: `ID 0483:5743` (or `0x5720`)
- ✅ See it? Hardware is connected. Move to Step 2.
- ❌ Don't see it? Unplug/replug the USB cable.

**Step 2: Check the `.env` file is correct**
```bash
cat .env | grep -E "PRINTER_ID|USB_"
```
Verify:
- `PRINTER_ID=` matches your printer UUID
- `USB_VENDOR_ID=0x0483`
- `USB_PRODUCT_ID=0x5743` (or `0x5720`)

**Step 3: Check Supabase connection**
```bash
source venv/bin/activate
python -c "from supabase import create_client; create_client('https://test.com', 'test-key')" 2>&1 | head
```
- ✅ No errors? Supabase is reachable. Move to Step 4.
- ❌ Connection error? Check WiFi/internet.

**Step 4: Check if jobs are in the queue**
1. Open https://supabase.com in your browser
2. Navigate to the `print_jobs` table
3. Look for rows with `status = 'pending'`
- ✅ See pending jobs? The app is working. **Restart the server** (Ctrl+C, then re-run).
- ❌ No jobs? The app isn't submitting. Check WiFi on phones.

---

### Problem: "ModuleNotFoundError: No module named 'supabase'"

The dependencies aren't installed. Run:
```bash
source venv/bin/activate
pip install -r requirements.txt
python print_server.py
```

---

### Problem: "Permission denied" or USB error

```bash
# Try restarting:
# 1. Press Ctrl+C to stop
# 2. Unplug the printer
# 3. Wait 2 seconds
# 4. Plug it back in
# 5. Run again:
python print_server.py
```

If still stuck:
```bash
# Run as administrator (not ideal, but works):
sudo python print_server.py
```

---

### Problem: "Printer not responding" in the app

**Check 1: Is everyone on the same WiFi?**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
Tell guests to connect to the same network.

**Check 2: Is the MacBook connected to the internet?**
- Open a browser, try visiting any website
- If no internet, ask for WiFi help from event organizer

**Check 3: Can you reach Supabase?**
- Open https://supabase.com in the browser
- If it loads, Supabase is reachable

---

### Problem: Server shows "Ready" but no jobs arrive

**Option 1: Restart with more details**
```bash
python -u print_server.py 2>&1 | tee print-server.log
```
Look for error messages like `ConnectionError` or `PermissionError`.

**Option 2: Check the polling interval**
```bash
cat .env | grep POLL_INTERVAL
```
Default is `3` (3 seconds). If higher, jobs take longer to print.

## 📋 Quick Commands

| Task | Command |
|------|---------|
| **Start server** | `cd ~/Desktop/capstone/print-server && source venv/bin/activate && python print_server.py` |
| **Stop server** | Press `Ctrl+C` in the terminal |
| **Check printer connected** | `system_profiler SPUSBDataType \| grep -i brightek` |
| **View `.env` settings** | `cat .env` |

### What to Look For in the Terminal

| Sign | Meaning |
|------|---------|
| `[server] Ready to accept print jobs` | ✅ Server is working |
| `[job xxxxxxxx] ✓ Printed successfully` | ✅ Print worked |
| `[job xxxxxxxx] ✗ FAILED: ...` | ❌ Print failed (check error message) |
| No output after 10 seconds | ⚠️ May have crashed (restart it) |

---

## 📤 After the Event

Before you pack up:

1. **Stop the server:** Press `Ctrl+C`
2. **Unplug the printer**
3. **You're done!** (Or keep it running if printing continues)

---

## ❓ Still Stuck?

**Before you contact support:**
1. ✅ Reread the **Troubleshooting** section above
2. ✅ Take a screenshot of the error in the terminal
3. ✅ Verify the printer is plugged in and powered on
4. ✅ Try restarting: `Ctrl+C` then `python print_server.py`

If none of that works, share:
- The screenshot from the terminal
- Output from: `cat .env | grep -v SECRET`
- Output from: `system_profiler SPUSBDataType | grep -i brightek`
