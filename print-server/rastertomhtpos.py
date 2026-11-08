#!/usr/bin/env python3
"""
CUPS filter: Convert raster images to ESC/POS format for Brightek POS80 thermal printer.

This is a Pi-compatible replacement for the macOS rastertomhtpos utility.
Handles raster input from CUPS and outputs ESC/POS binary to USB backend.

Usage as CUPS filter:
    rastertomhtpos.py job-id user title copies options [filename]

The filter receives PPM raster data and outputs ESC/POS commands suitable for
the Brightek POS80 80mm thermal printer.
"""

import struct
import sys
import os
import tempfile
from pathlib import Path
from io import BytesIO

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow not installed. Install with: pip install Pillow", file=sys.stderr)
    sys.exit(1)

# ESC/POS commands
ESC = b'\x1b'
GS = b'\x1d'

class ESCPOSImage:
    """Convert images to ESC/POS bitmap format."""

    def __init__(self, dither='floyd-steinberg'):
        self.dither = dither

    def _dither_floyd_steinberg(self, img):
        """Floyd-Steinberg dithering for better quality."""
        if img.mode != 'L':
            img = img.convert('L')

        pixels = img.load()
        width, height = img.size

        # Create error buffer
        error = [[0.0 for _ in range(width)] for _ in range(height)]

        # Dither
        for y in range(height):
            for x in range(width):
                old = float(pixels[x, y]) + error[y][x]
                new = 255 if old > 127 else 0
                pixels[x, y] = int(new)

                err = old - new
                if x + 1 < width:
                    error[y][x + 1] += err * 7 / 16
                if y + 1 < height:
                    if x - 1 >= 0:
                        error[y + 1][x - 1] += err * 3 / 16
                    error[y + 1][x] += err * 5 / 16
                    if x + 1 < width:
                        error[y + 1][x + 1] += err * 1 / 16

        return img

    def _threshold(self, img):
        """Simple threshold dithering."""
        if img.mode != 'L':
            img = img.convert('L')
        return img.point(lambda x: 255 if x > 127 else 0, '1')

    def _ordered_dither(self, img):
        """Ordered (Bayer) dithering."""
        if img.mode != 'L':
            img = img.convert('L')

        bayer = [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5],
        ]

        pixels = img.load()
        width, height = img.size

        for y in range(height):
            for x in range(width):
                threshold = (bayer[y % 4][x % 4] + 0.5) * (255 / 16)
                pixels[x, y] = 255 if pixels[x, y] > threshold else 0

        return img

    def dither_image(self, img):
        """Apply dithering to image."""
        if self.dither == 'floyd-steinberg':
            return self._dither_floyd_steinberg(img)
        elif self.dither == 'threshold':
            return self._threshold(img)
        elif self.dither == 'ordered':
            return self._ordered_dither(img)
        else:
            return self._threshold(img)

    def image_to_escpos(self, image_path, max_width=576, max_height=None):
        """Convert image to ESC/POS bitmap command sequence."""
        # Open image
        img = Image.open(image_path)

        # Convert to RGB if needed
        if img.mode not in ('RGB', 'L', '1'):
            img = img.convert('RGB')

        # Scale to printer width (POS80 is 576 dots wide)
        aspect = img.height / img.width if img.width > 0 else 1
        new_width = min(img.width, max_width)
        new_height = int(new_width * aspect)
        if max_height and new_height > max_height:
            new_height = max_height
            new_width = int(new_height / aspect)

        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Convert to grayscale
        if img.mode != 'L':
            img = img.convert('L')

        # Apply dithering
        img = self.dither_image(img)

        # Convert to bitmap (1-bit)
        img = img.convert('1')

        # Generate ESC/POS bitmap command
        width_pixels = img.width
        height_pixels = img.height

        # Width and height in dots
        width_bytes = (width_pixels + 7) // 8

        # ESC/POS GS v 0 command for image printing
        # Format: GS v 0 mode width_low width_high height_low height_high [data]

        output = bytearray()

        # Initialize printer
        output += ESC + b'@'  # Reset

        # Set line spacing
        output += ESC + b'3' + bytes([20])  # 20/180 inch

        # Print image using raster mode
        # GS ( L: Set raster image
        x_low = width_bytes & 0xFF
        x_high = (width_bytes >> 8) & 0xFF
        y_low = height_pixels & 0xFF
        y_high = (height_pixels >> 8) & 0xFF

        # GS v 0: Raster image
        # m = 0 (normal), x (width in bytes), y (height in pixels)
        data_size = width_bytes * height_pixels

        # Alternative: use older GS / command (more compatible)
        output += b'\x1d\x2f'  # GS /
        output += bytes([1])    # m=1 (print)

        # Convert image to raster data
        raster_data = bytearray()
        pixels = img.load()

        for y in range(height_pixels):
            for x in range(0, width_pixels, 8):
                byte = 0
                for bit in range(8):
                    if x + bit < width_pixels:
                        if pixels[x + bit, y]:  # White pixel
                            byte |= (0x80 >> bit)
                raster_data.append(byte)

        # Send raster image command
        # GS v 0 m xL xH yL yH data
        output += GS + b'v' + b'0'
        output += bytes([0])  # m = 0 (normal width)
        output += bytes([x_low, x_high])
        output += bytes([y_low, y_high])
        output += raster_data

        # Feed paper and cut
        output += b'\n\n\n'  # Line feeds
        output += ESC + b'i'  # Partial cut

        return bytes(output)

def ppm_to_image(ppm_data):
    """Convert PPM binary data to PIL Image."""
    try:
        # PPM format: magic number, width, height, [maxval], pixel data
        # P4 = monochrome (binary)
        # P5 = grayscale (binary)
        # P6 = RGB (binary)

        return Image.open(BytesIO(ppm_data))
    except Exception as e:
        print(f"Error parsing PPM: {e}", file=sys.stderr)
        return None


def cups_filter_mode():
    """Run as CUPS filter."""
    # CUPS filter arguments: job-id user title copies options [filename]
    if len(sys.argv) < 6:
        print("Usage: rastertomhtpos.py job-id user title copies options [filename]", file=sys.stderr)
        sys.exit(1)

    # Read PPM raster data
    if len(sys.argv) > 6:
        # Read from file
        with open(sys.argv[6], 'rb') as f:
            ppm_data = f.read()
    else:
        # Read from stdin
        ppm_data = sys.stdin.buffer.read()

    try:
        # Convert PPM to image
        img = ppm_to_image(ppm_data)
        if not img:
            sys.exit(1)

        # Create temp file with the image
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            img.save(tmp.name, 'PNG')
            tmp_path = tmp.name

        # Convert to ESC/POS
        converter = ESCPOSImage(dither='floyd-steinberg')
        output = converter.image_to_escpos(tmp_path)

        # Write ESC/POS binary to stdout (for CUPS backend to send to printer)
        sys.stdout.buffer.write(output)

        # Cleanup
        Path(tmp_path).unlink()

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

def standalone_mode():
    """Run as standalone image converter."""
    if len(sys.argv) < 3:
        print("Usage: rastertomhtpos.py input.png output.bin", file=sys.stderr)
        print("  Converts image to ESC/POS binary format", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        converter = ESCPOSImage(dither='floyd-steinberg')
        output = converter.image_to_escpos(input_file)

        with open(output_file, 'wb') as f:
            f.write(output)

        print(f"✓ Converted {input_file} → {output_file} ({len(output)} bytes)")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    # Detect mode based on argument count
    if len(sys.argv) == 6 or (len(sys.argv) == 7 and sys.argv[6]):
        # CUPS filter mode
        cups_filter_mode()
    else:
        # Standalone mode
        standalone_mode()
