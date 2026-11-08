#!/usr/bin/env python3
"""
Attempt to exit Brightek POS80 bootloader mode.

Bootloader mode: 0x0483:0x5720
Application mode: 0x0483:0x5743

The device re-enumerates after exit, so we need to wait for the new device ID.
"""

import usb.core
import usb.util
import time
import sys

VENDOR_ID = 0x0483
BOOTLOADER_PRODUCT = 0x5720
APP_PRODUCT = 0x5743

def find_device(vendor_id, product_id):
    """Find a USB device by vendor and product ID."""
    try:
        return usb.core.find(find_all=False, idVendor=vendor_id, idProduct=product_id)
    except usb.core.NoBackendError:
        return None

def is_in_application_mode():
    """Check if device is in application mode."""
    return find_device(VENDOR_ID, APP_PRODUCT) is not None

def is_in_bootloader_mode():
    """Check if device is in bootloader mode."""
    return find_device(VENDOR_ID, BOOTLOADER_PRODUCT) is not None

def send_bootloader_exit_commands(dev):
    """
    Try common bootloader exit sequences.
    Different printers use different methods.
    """
    try:
        # Method 1: USB reset (often triggers re-enumeration)
        print("[bootloader] Attempting USB device reset...")
        dev.reset()
        time.sleep(1)
        return True
    except Exception as e:
        print(f"[bootloader] Reset failed: {e}")

    try:
        # Method 2: Control transfer with common bootloader exit sequence
        # bmRequestType, bRequest, wValue, wIndex, data_or_wLength
        print("[bootloader] Attempting control transfer exit...")

        # Try a common firmware exit request
        dev.ctrl_transfer(
            bmRequestType=0x40,  # Host-to-Device, Vendor
            bRequest=0x01,       # Generic exit/reset command
            wValue=0x0000,
            wIndex=0x0000,
            data_or_wLength=None
        )
        time.sleep(1)
        return True
    except Exception as e:
        print(f"[bootloader] Control transfer failed: {e}")

    try:
        # Method 3: Try setting device configuration
        print("[bootloader] Attempting device configuration...")
        if dev.get_active_configuration() is None:
            dev.set_configuration()
        time.sleep(1)
        return True
    except Exception as e:
        print(f"[bootloader] Configuration failed: {e}")

    return False

def exit_bootloader():
    """Main bootloader exit routine."""
    print("[bootloader] Checking device status...")

    if is_in_application_mode():
        print("[bootloader] ✓ Device in application mode (0x5743)")
        return True

    if not is_in_bootloader_mode():
        print("[bootloader] ℹ Device not in bootloader mode (0x5720)")
        # Check if application mode device might exist (USB backend issue)
        try:
            dev = usb.core.find(find_all=True, idVendor=VENDOR_ID)
            if dev:
                print("[bootloader] ✓ Found Brightek device (may be app mode)")
                return True
        except:
            pass
        return False

    print("[bootloader] Device found in bootloader mode (0x5720)")
    dev = find_device(VENDOR_ID, BOOTLOADER_PRODUCT)

    if not send_bootloader_exit_commands(dev):
        print("[bootloader] All exit attempts failed")
        return False

    # Wait for device to re-enumerate
    print("[bootloader] Waiting for device to re-enumerate...")
    for i in range(10):
        time.sleep(0.5)
        if is_in_application_mode():
            print("[bootloader] ✓ Device now in application mode (0x5743)")
            return True
        print(f"[bootloader] Waiting... ({i+1}/10)")

    print("[bootloader] Device did not re-enumerate to application mode")
    return False

if __name__ == "__main__":
    success = exit_bootloader()
    sys.exit(0 if success else 1)
