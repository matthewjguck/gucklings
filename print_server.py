#!/usr/bin/env python3
"""
Gucklings Print Server
Runs locally at parents' house, polls Supabase for print jobs, prints to thermal printer.
"""

import os
import time
import base64
import logging
from datetime import datetime
from io import BytesIO
from PIL import Image
import usb.core
import usb.util
from supabase import create_client, Client
import dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
dotenv.load_dotenv()

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')
PRINTER_ID = 'home-printer-gucklings'

# Brightek POS80 USB IDs
VENDOR_ID = 0x0471
PRODUCT_ID = 0x066f


class ThermalPrinter:
    def __init__(self):
        self.device = None
        self.connect()

    def connect(self):
        """Connect to thermal printer via USB"""
        try:
            self.device = usb.core.find(idVendor=VENDOR_ID, idProduct=PRODUCT_ID)
            if self.device is None:
                raise RuntimeError('Thermal printer not found. Ensure Brightek POS80 is connected.')

            if self.device.is_kernel_driver_active(0):
                self.device.detach_kernel_driver(0)

            self.device.set_configuration()
            logger.info('Connected to thermal printer')
        except Exception as e:
            logger.error(f'Failed to connect to printer: {e}')
            raise

    def print_image(self, image_base64: str):
        """Print base64 encoded image to thermal printer"""
        try:
            # Decode base64 to image
            image_data = base64.b64decode(image_base64)
            image = Image.open(BytesIO(image_data))

            # Convert to grayscale if needed
            if image.mode != 'L':
                image = image.convert('L')

            # Resize to thermal printer width (384 pixels for 80mm)
            width, height = image.size
            ratio = 384 / width
            new_height = int(height * ratio)
            image = image.resize((384, new_height), Image.Resampling.LANCZOS)

            # Dither image for thermal printer
            image = image.convert('1')

            # Convert image to ESC/POS format
            esc_pos_data = self._image_to_escpos(image)

            # Send to printer
            self.device.write(0x01, esc_pos_data)

            # Feed paper and cut
            cut_command = b'\x1d\x56\x41\n'
            self.device.write(0x01, cut_command)

            logger.info('Image sent to printer successfully')
            return True
        except Exception as e:
            logger.error(f'Failed to print image: {e}')
            return False

    def _image_to_escpos(self, image) -> bytes:
        """Convert PIL image to ESC/POS bitmap format"""
        width, height = image.size
        bytes_per_line = (width + 7) // 8

        # ESC/POS image print command
        header = b'\x1d\x2a'

        # Width and height in bytes (low byte, high byte)
        width_bytes = bytes_per_line
        height_bytes = height

        # Create bitmap data
        bitmap_data = b''
        pixels = image.load()

        for y in range(height):
            for x in range(0, width, 8):
                byte_val = 0
                for bit in range(8):
                    if x + bit < width:
                        # Get pixel value (0=black, 1=white)
                        pixel = pixels[x + bit, y]
                        # In PIL, 1-bit image: 0=black, 255=white
                        if pixel == 0:
                            byte_val |= (0x80 >> bit)
                bitmap_data += bytes([byte_val])

        # Construct full ESC/POS command
        return header + bytes([width_bytes & 0xff, (width_bytes >> 8) & 0xff]) + bytes([height_bytes & 0xff, (height_bytes >> 8) & 0xff]) + bitmap_data


class PrintServer:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.printer = ThermalPrinter()
        self.poll_interval = 5  # Check for jobs every 5 seconds

    def run(self):
        """Main server loop"""
        logger.info('Print server started. Polling for jobs...')

        while True:
            try:
                self.process_pending_jobs()
            except Exception as e:
                logger.error(f'Error processing jobs: {e}')

            time.sleep(self.poll_interval)

    def process_pending_jobs(self):
        """Fetch and process pending print jobs"""
        try:
            # Query pending jobs for this printer
            response = self.supabase.table('print_jobs').select(
                'id, payload_base64, message_text, status'
            ).eq('printer_id', PRINTER_ID).eq('status', 'pending').execute()

            jobs = response.data

            if not jobs:
                return

            for job in jobs:
                self.process_job(job)
        except Exception as e:
            logger.error(f'Failed to fetch jobs: {e}')

    def process_job(self, job):
        """Process a single print job"""
        job_id = job['id']
        logger.info(f'Processing job {job_id}...')

        try:
            # Update status to printing
            self.supabase.table('print_jobs').update({
                'status': 'printing',
                'updated_at': datetime.utcnow().isoformat(),
            }).eq('id', job_id).execute()

            # Print the image
            success = self.printer.print_image(job['payload_base64'])

            if success:
                # Update status to printed
                self.supabase.table('print_jobs').update({
                    'status': 'printed',
                    'updated_at': datetime.utcnow().isoformat(),
                }).eq('id', job_id).execute()
                logger.info(f'Job {job_id} printed successfully')
            else:
                raise Exception('Printer returned error')
        except Exception as e:
            logger.error(f'Failed to process job {job_id}: {e}')
            # Update status to failed
            self.supabase.table('print_jobs').update({
                'status': 'failed',
                'error_message': str(e),
                'updated_at': datetime.utcnow().isoformat(),
            }).eq('id', job_id).execute()


if __name__ == '__main__':
    try:
        server = PrintServer()
        server.run()
    except KeyboardInterrupt:
        logger.info('Print server stopped')
    except Exception as e:
        logger.error(f'Fatal error: {e}')
        exit(1)
