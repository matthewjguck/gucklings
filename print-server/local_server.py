#!/usr/bin/env python3
"""
Local HTTP print server for testing on development machine.

Runs on localhost:9100 and accepts POST requests with ESC/POS binary data.
Sends directly to connected USB printer or saves to file for testing.

Usage:
    python3 local_server.py

Then from the web app:
    1. Set VITE_PRINT_BACKEND=local
    2. Click Print
    3. Server receives the ESC/POS binary and prints
"""

import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import json

try:
    from escpos.printer import Usb
except ImportError:
    print("Error: python-escpos not installed. Install with: pip install python-escpos")
    sys.exit(1)

# Printer config
VENDOR_ID = 0x0483
PRODUCT_ID = 0x5743

_printer = None


def get_printer():
    """Get or create USB printer connection."""
    global _printer
    if _printer is not None:
        return _printer

    try:
        _printer = Usb(VENDOR_ID, PRODUCT_ID)
        print(f"[printer] Connected to USB device {VENDOR_ID:#06x}:{PRODUCT_ID:#06x}")
        return _printer
    except Exception as e:
        print(f"[printer] Warning: Could not connect to USB printer: {e}")
        return None


class PrintRequestHandler(BaseHTTPRequestHandler):
    """Handle HTTP print requests."""

    def do_POST(self):
        """Handle POST request with ESC/POS binary data."""
        if self.path == '/print':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            print(f"[server] Received {len(body)} bytes")

            try:
                printer = get_printer()
                if printer:
                    # Send to USB printer
                    printer.device.write(printer.out_ep, body, timeout=10_000)
                    print(f"[server] ✓ Sent to printer")
                else:
                    # Fallback: save to file
                    output_path = Path("last_print.bin")
                    output_path.write_bytes(body)
                    print(f"[server] ✓ Saved to {output_path}")

                # Return success
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok"}).encode())

            except Exception as e:
                print(f"[server] Error: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())

        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())

    def log_message(self, format, *args):
        """Suppress default logging."""
        pass


def main():
    """Start local HTTP print server."""
    host = '127.0.0.1'
    port = 9100

    server = HTTPServer((host, port), PrintRequestHandler)
    print(f"[server] Local print server starting on http://{host}:{port}")
    print(f"[server] Listening for POST requests to /print")
    print(f"[server] Press Ctrl+C to stop\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[server] Shutting down...")
        server.shutdown()


if __name__ == '__main__':
    main()
