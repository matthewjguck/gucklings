# Getting Supabase Credentials for Print Server

Follow these steps to get your Supabase credentials for the print server.

## Step 1: Log into Supabase

1. Go to https://app.supabase.com
2. Sign in with your account
3. Select your project (or create one)

## Step 2: Get Project URL

1. Click **Settings** (gear icon) in the sidebar
2. Click **API** in the left menu
3. Copy the **Project URL** (looks like: `https://your-project.supabase.co`)
4. Save this as `SUPABASE_URL` in your `.env` file

## Step 3: Get Service Role Key

⚠️ **IMPORTANT:** Use the **Service Role Key**, NOT the Anon Key. The service role key bypasses Row Level Security (RLS) so the Pi can read all jobs.

1. In the same **Settings → API** page
2. Find **Service role key** (labeled as such)
3. Click the eye icon to reveal it
4. Click the copy button
5. Save this as `SUPABASE_SERVICE_KEY` in your `.env` file

## Step 4: Get Printer ID

The printer ID should match an entry in your `printers` table in Supabase:

1. Click **SQL Editor** in the sidebar
2. Run this query:
   ```sql
   SELECT id, name FROM printers;
   ```
3. Copy the `id` of your printer
4. Save this as `PRINTER_ID` in your `.env` file

Alternatively, use a simple identifier like: `home-printer-gucklings`

## Security Reminder

✅ **DO:**
- Keep your service role key private
- Only share `.env` files with trusted team members
- Store credentials securely

❌ **DON'T:**
- Commit `.env` to git (it's in .gitignore)
- Share your service key in Slack or email
- Use the Anon Key for the print server

## Example .env Configuration

```
SUPABASE_URL=https://izmeepar123456.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imyou...
PRINTER_ID=home-printer-gucklings
USB_VENDOR_ID=0x0483
USB_PRODUCT_ID=0x5743
POLL_INTERVAL=3
```

## Verify Credentials

Test your credentials before deploying to the Pi:

```bash
# On your computer (in the print-server directory):
python3 -c "
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env')

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_KEY')
printer_id = os.environ.get('PRINTER_ID')

try:
    supabase = create_client(url, key)
    
    # Test connection by querying print jobs
    response = supabase.table('print_jobs').select('*').eq('printer_id', printer_id).limit(1).execute()
    
    print('✓ Supabase connection successful!')
    print(f'  URL: {url}')
    print(f'  Printer ID: {printer_id}')
    print(f'  Can query print_jobs table')
except Exception as e:
    print(f'✗ Connection failed: {e}')
"
```

If you get an error:
1. Check that SUPABASE_URL and SUPABASE_SERVICE_KEY are correct (no extra spaces)
2. Verify your Supabase project is active
3. Check that the `print_jobs` table exists in your database
4. Ensure the printer entry exists in the `printers` table

## Still Having Issues?

Common problems:

| Problem | Solution |
|---------|----------|
| "Invalid URL" | Remove trailing slash, should end with `.supabase.co` |
| "Unauthorized" | You might have used the Anon Key instead of Service Role Key |
| "Connection timeout" | Check internet connection, Supabase service status |
| "Table not found" | The `print_jobs` table hasn't been created yet |

For more help, contact your team lead or check the main README.md
