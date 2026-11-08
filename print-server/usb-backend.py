#!/usr/bin/env python3
"""
CUPS USB backend for Brightek/MP POS thermal printer.

Handles USB communication with support for bootloader mode detection and switching.
Can be installed as /usr/lib/cups/backend/usb-mhtpos for CUPS integration.

Usage: Called by CUPS with device-uri as first argument
  usb-backend.py "usb://0x0483:0x5743" < raster-data.bin
"""

import sys
import time
import os
import usb.core
import usb.util
from bootloader_exit import is_in_bootloader_mode, exit_bootloader

VENDOR_ID = 0x0483
PRODUCT_ID = 0x5743  # Application mode
BOOTLOADER_PRODUCT = 0x5720


def find_usb_device(vendor_id=VENDOR_ID, product_id=PRODUCT_ID):
    """Find USB device by vendor and product ID."""
    try:
        dev = usb.core.find(idVendor=vendor_id, idProduct=product_id)
        return dev
    except Exception as e:
        print(f"Error finding device: {e}", file=sys.stderr)
        return None


def open_endpoints(dev):
    """Find and return input/output endpoints for the device."""
    try:
        dev.set_configuration()
        cfg = dev.get_active_configuration()
        intf = cfg[(0, 0)]

        # Find OUT endpoint (device receives)
        out_ep = usb.util.find_descriptor(
            intf,
            custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_OUT
        )

        # Find IN endpoint (device sends)
        in_ep = usb.util.find_descriptor(
            intf,
            custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_IN
        )

        return out_ep, in_ep

    except Exception as e:
        print(f"Error opening endpoints: {e}", file=sys.stderr)
        return None, None


def send_data_to_printer(dev, data):
    """Send raw ESC/POS data to the printer."""
    try:
        out_ep, in_ep = open_endpoints(dev)
        if not out_ep:
            print("No output endpoint found", file=sys.stderr)
            return False

        # Send data in chunks
        chunk_size = 4096
        for i in range(0, len(data), chunk_size):
            chunk = data[i:i+chunk_size]
            bytes_written = out_ep.write(chunk, timeout=5000)
            if bytes_written != len(chunk):
                print(f"Warning: sent {bytes_written} of {len(chunk)} bytes", file=sys.stderr)

        return True

    except Exception as e:
        print(f"Error sending data: {e}", file=sys.stderr)
        return False


def main():
    """Main CUPS backend entry point."""
    # Parse CUPS device URI
    # Format: usb://vendor:product
    # or: usb://0x0483:0x5743

    device_uri = sys.argv[1] if len(sys.argv) > 1 else None

    # Try to parse vendor/product from URI if provided
    if device_uri and ":" in device_uri:
        try:
            parts = device_uri.split(":")
            if len(parts) >= 2:
                vendor_str = parts[0].replace("usb://", "").replace("0x", "")
                product_str = parts[1].replace("0x", "")
                vendor_id = int(vendor_str, 16)
                product_id = int(product_str, 16)
            else:
                vendor_id = VENDOR_ID
                product_id = PRODUCT_ID
        except:
            vendor_id = VENDOR_ID
            product_id = PRODUCT_ID
    else:
        vendor_id = VENDOR_ID
        product_id = PRODUCT_ID

    # Check bootloader mode
    if is_in_bootloader_mode():
        print("[backend] Printer in bootloader mode, attempting exit...", file=sys.stderr)
        if not exit_bootloader():
            print("[backend] Failed to exit bootloader mode", file=sys.stderr)
            sys.exit(1)
        time.sleep(2)  # Wait for re-enumeration

    # Find device
    dev = find_usb_device(vendor_id, product_id)
    if not dev:
        print(f"[backend] Printer not found ({vendor_id:#06x}:{product_id:#06x})", file=sys.stderr)
        sys.exit(1)

    print(f"[backend] Found printer {vendor_id:#06x}:{product_id:#06x}", file=sys.stderr)

    # Read data from stdin
    try:
        data = sys.stdin.buffer.read()
        print(f"[backend] Received {len(data)} bytes", file=sys.stderr)

        # Send to printer
        if send_data_to_printer(dev, data):
            print("[backend] Data sent successfully", file=sys.stderr)
            sys.exit(0)
        else:
            print("[backend] Failed to send data", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"[backend] Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
