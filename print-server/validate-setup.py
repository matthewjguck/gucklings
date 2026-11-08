#!/usr/bin/env python3
"""
Validate print server setup before starting.

Usage:
    python3 validate-setup.py
"""

import os
import sys
import subprocess
from pathlib import Path

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def check(condition, message):
    """Print a check result."""
    status = f"{GREEN}✓{RESET}" if condition else f"{RED}✗{RESET}"
    print(f"  {status} {message}")
    return condition

def section(title):
    """Print a section header."""
    print(f"\n{BLUE}━━━ {title}{RESET}")

def error(message):
    """Print an error message."""
    print(f"{RED}✗ {message}{RESET}")

def warning(message):
    """Print a warning message."""
    print(f"{YELLOW}⚠ {message}{RESET}")

def success(message):
    """Print a success message."""
    print(f"{GREEN}✓ {message}{RESET}")

def main():
    print(f"\n{BLUE}╔════════════════════════════════════════════════════════════╗{RESET}")
    print(f"{BLUE}║  Print Server Setup Validation                             ║{RESET}")
    print(f"{BLUE}╚════════════════════════════════════════════════════════════╝{RESET}\n")

    all_ok = True

    # ──────────────────────────────────────────────────────────────
    # 1. Check Python environment
    # ──────────────────────────────────────────────────────────────
    section("Python Environment")

    try:
        version = subprocess.check_output(['python3', '--version']).decode().strip()
        check(True, f"Python installed: {version}")
    except:
        error("Python 3 not found")
        all_ok = False

    # Check if we're in virtual environment
    in_venv = hasattr(sys, 'real_prefix') or (
        hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix
    )
    check(in_venv, "Running in virtual environment" + (" (recommended)" if in_venv else " (use venv for isolation)"))

    # ──────────────────────────────────────────────────────────────
    # 2. Check required packages
    # ──────────────────────────────────────────────────────────────
    section("Python Dependencies")

    required_packages = [
        'dotenv',
        'supabase',
        'usb',
        'PIL',
    ]

    for package in required_packages:
        try:
            __import__(package)
            check(True, f"✓ {package}")
        except ImportError:
            error(f"{package} not found")
            all_ok = False

    # ──────────────────────────────────────────────────────────────
    # 3. Check environment configuration
    # ──────────────────────────────────────────────────────────────
    section("Environment Configuration")

    env_file = Path('.env')
    if not env_file.exists():
        error(".env file not found")
        warning("Copy .env.local to .env or create from template")
        all_ok = False
    else:
        check(True, ".env file exists")

        # Check required variables
        from dotenv import load_dotenv
        load_dotenv('.env')

        required_vars = {
            'SUPABASE_URL': 'Supabase project URL',
            'SUPABASE_SERVICE_KEY': 'Supabase service role key',
            'PRINTER_ID': 'Printer identifier',
        }

        for var, desc in required_vars.items():
            value = os.environ.get(var)
            if value and value != '' and not value.startswith('your-'):
                check(True, f"{var} configured")
            else:
                warning(f"{var} not configured or uses placeholder")
                all_ok = False

    # ──────────────────────────────────────────────────────────────
    # 4. Test Supabase connection
    # ──────────────────────────────────────────────────────────────
    section("Supabase Connection")

    try:
        from dotenv import load_dotenv
        from supabase import create_client

        load_dotenv('.env')

        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_KEY')

        if not url or not key or url.startswith('your-'):
            warning("Skipping Supabase test (credentials not configured)")
        else:
            try:
                supabase = create_client(url, key)

                # Try a simple query
                response = supabase.table('print_jobs').select('count').execute()
                check(True, "Connected to Supabase")
                check(True, "print_jobs table accessible")

            except Exception as e:
                error(f"Supabase connection failed: {e}")
                all_ok = False
    except ImportError:
        error("Supabase package not installed")
        all_ok = False

    # ──────────────────────────────────────────────────────────────
    # 5. Check USB hardware
    # ──────────────────────────────────────────────────────────────
    section("USB Hardware")

    try:
        result = subprocess.run(['lsusb'], capture_output=True, text=True, timeout=5)
        if '0483' in result.stdout:
            check(True, "Brightek printer detected (0x0483)")
        else:
            warning("Brightek printer not detected on USB")
            warning("Make sure printer is plugged in and powered on")
    except:
        warning("lsusb not available (USB check skipped)")

    # ──────────────────────────────────────────────────────────────
    # 6. Check systemd service
    # ──────────────────────────────────────────────────────────────
    section("Systemd Service")

    service_file = Path('/etc/systemd/system/inklings-printer.service')
    if service_file.exists():
        check(True, "Service file installed")

        try:
            result = subprocess.run(
                ['systemctl', 'is-enabled', 'inklings-printer'],
                capture_output=True,
                text=True
            )
            enabled = result.returncode == 0
            check(enabled, "Service enabled on boot" + (" (recommended)" if enabled else " (enable with: sudo systemctl enable inklings-printer)"))
        except:
            warning("Could not check service status")
    else:
        warning("Service file not found (will be created on first provisioning)")

    # ──────────────────────────────────────────────────────────────
    # 7. Summary
    # ──────────────────────────────────────────────────────────────
    section("Summary")

    if all_ok:
        success("All checks passed! Ready to start print server.")
        success("Run: python3 print_server.py")
        success("Or:  sudo systemctl start inklings-printer")
        print()
        return 0
    else:
        warning("Some checks failed. Please fix the issues above.")
        print()
        return 1

if __name__ == '__main__':
    sys.exit(main())
