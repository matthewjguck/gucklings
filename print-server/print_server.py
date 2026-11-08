#!/usr/bin/env python3
"""
Raspberry Pi print server for Brightek POS80 thermal printer.

Polls Supabase for pending print jobs assigned to this printer,
sends the ESC/POS payload to the USB printer, and updates job status.

Usage:
    pip install -r requirements.txt
    cp .env.example .env   # fill in your values
    python print_server.py
"""

import base64
import os
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client
import usb.util

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
PRINTER_ID = os.environ["PRINTER_ID"]
USB_VENDOR_ID = int(os.environ.get("USB_VENDOR_ID", "0x0483"), 16)
USB_PRODUCT_ID = int(os.environ.get("USB_PRODUCT_ID", "0x5743"), 16)
USB_BOOTLOADER_ID = 0x5720  # Bootloader mode device ID
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "3"))

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ---------- USB Printer ----------

_printer = None


def get_printer():
    """Lazily connect to the USB thermal printer."""
    global _printer
    if _printer is not None:
        return _printer

    import usb.core
    import usb.util

    # Try application mode first (0x5743), then bootloader mode (0x5720)
    dev = usb.core.find(idVendor=USB_VENDOR_ID, idProduct=USB_PRODUCT_ID)
    product_id = USB_PRODUCT_ID

    if dev is None:
        dev = usb.core.find(idVendor=USB_VENDOR_ID, idProduct=USB_BOOTLOADER_ID)
        product_id = USB_BOOTLOADER_ID
        if dev is None:
            raise Exception(f"USB device not found (tried {USB_VENDOR_ID:#06x}:{USB_PRODUCT_ID:#06x} and {USB_VENDOR_ID:#06x}:{USB_BOOTLOADER_ID:#06x})")

    # Detach from kernel driver if needed
    try:
        if dev.is_kernel_driver_active(0):
            dev.detach_kernel_driver(0)
    except (usb.core.USBError, Exception):
        pass  # Not always available on all systems

    try:
        dev.set_configuration()
    except usb.core.USBError as e:
        if "Resource busy" in str(e):
            print("[printer] Device busy, trying to reset...")
            dev.reset()
            time.sleep(0.5)
            dev.set_configuration()
        else:
            raise

    cfg = dev.get_active_configuration()
    intf = cfg[(0, 0)]

    # Brightek POS80 uses non-standard endpoints: 0x81 (IN), 0x03 (OUT)
    out_ep = usb.util.find_descriptor(
        intf,
        bEndpointAddress=0x03
    )
    in_ep = usb.util.find_descriptor(
        intf,
        bEndpointAddress=0x81
    )

    if not out_ep or not in_ep:
        raise Exception("Could not find printer endpoints")

    _printer = {'device': dev, 'out_ep': out_ep, 'in_ep': in_ep}
    print(f"[printer] Connected to USB device {USB_VENDOR_ID:#06x}:{product_id:#06x} (EP OUT=0x03, EP IN=0x81)")
    return _printer


def send_to_printer(raw_bytes: bytes) -> None:
    """Send raw ESC/POS bytes to the thermal printer."""
    printer = get_printer()
    printer['device'].write(printer['out_ep'], raw_bytes, timeout=60_000)


def close_printer() -> None:
    """Explicitly close and release the USB device."""
    global _printer
    if _printer is not None:
        try:
            import usb.core
            _printer['device'].reset()
            usb.util.dispose_resources(_printer['device'])
        except Exception as e:
            print(f"[printer] Warning closing device: {e}")
        _printer = None


# ---------- Job Processing ----------


def claim_job(job_id: str) -> bool:
    """
    Atomically claim a job by setting status to 'printing'.
    Returns True if this server won the claim (prevents double-printing
    if multiple Pis poll at the same time).
    """
    result = (
        supabase.table("print_jobs")
        .update({"status": "printing"})
        .eq("id", job_id)
        .eq("status", "pending")  # only if still pending
        .execute()
    )
    return len(result.data) > 0


def mark_done(job_id: str) -> None:
    result = supabase.table("print_jobs").update({"status": "done"}).eq("id", job_id).execute()
    if not result.data:
        raise Exception(f"Failed to mark job {job_id} as done")


def mark_failed(job_id: str, error: str) -> None:
    result = (
        supabase.table("print_jobs")
        .update({"status": "failed", "error_message": error[:500]})
        .eq("id", job_id)
        .execute()
    )
    if not result.data:
        print(f"[job {job_id[:8]}] Warning: Failed to update job status")


def process_job(job: dict) -> None:
    job_id = job["id"]
    print(f"[job {job_id[:8]}] Processing...")

    if not claim_job(job_id):
        print(f"[job {job_id[:8]}] Already claimed by another server, skipping")
        return

    try:
        payload = base64.b64decode(job["payload_base64"])
        send_to_printer(payload)
        print(f"[job {job_id[:8]}] Sent {len(payload)} bytes to printer")

        # Mark as done
        mark_done(job_id)
        print(f"[job {job_id[:8]}] ✓ Completed successfully")

    except Exception as e:
        print(f"[job {job_id[:8]}] ✗ FAILED: {e}")
        try:
            mark_failed(job_id, str(e))
        except Exception as err:
            print(f"[job {job_id[:8]}] Could not mark failed: {err}")
    finally:
        # Always close printer connection after job
        close_printer()
        time.sleep(0.5)  # Brief delay before next job


# ---------- Poll Loop ----------


def poll_once() -> int:
    """Fetch and process all pending jobs for this printer. Returns count processed."""
    result = (
        supabase.table("print_jobs")
        .select("*")
        .eq("printer_id", PRINTER_ID)
        .eq("status", "pending")
        .order("created_at")
        .limit(10)
        .execute()
    )

    for job in result.data:
        process_job(job)

    return len(result.data)


def attempt_bootloader_exit() -> None:
    """Try to exit bootloader mode if the device is in it."""
    try:
        script_path = os.path.join(os.path.dirname(__file__), "bootloader_exit.py")
        if os.path.exists(script_path):
            print("[server] Checking bootloader status...")
            result = subprocess.run([sys.executable, script_path], capture_output=True, text=True, timeout=30)
            if result.stdout:
                for line in result.stdout.strip().split("\n"):
                    print(line)
            if result.returncode != 0:
                print("[server] Bootloader exit skipped (device may already be ready or in bootloader mode)")
        else:
            print(f"[server] Bootloader exit script not found at {script_path}")
    except Exception as e:
        print(f"[server] Bootloader exit error (continuing): {e}")


def main() -> None:
    print(f"[server] Print server starting")
    print(f"[server] Printer ID: {PRINTER_ID}")
    print(f"[server] Polling every {POLL_INTERVAL}s")

    # Skip bootloader exit (causes resource busy issues)
    # The printer can work in bootloader mode if we use correct endpoints
    print(f"[server] Ready to accept print jobs")

    # Graceful shutdown
    running = True

    def handle_signal(sig, frame):
        nonlocal running
        print("\n[server] Shutting down...")
        running = False

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    while running:
        try:
            poll_once()
        except Exception as e:
            print(f"[server] Poll error: {e}")
        time.sleep(POLL_INTERVAL)

    print("[server] Stopped")


if __name__ == "__main__":
    main()
