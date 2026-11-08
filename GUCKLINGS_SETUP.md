# Gucklings Setup Guide

## Overview

Gucklings is a family-only letter printing app where siblings compose letters online that spontaneously print at parents' house.

## Prerequisites

- Node.js 18+
- Vercel account (for web deployment)
- Supabase account (free tier is fine with heartbeat to prevent pause)
- Brightek POS80 thermal printer (at parents' house)

## 1. Supabase Setup for Gucklings

### Create a new Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click "New project"
3. Name it "gucklings" or "gucklings-family"
4. Choose a region (e.g., us-west)
5. Generate a secure password
6. Create the project

### Get your credentials

Once created, go to **Project Settings → API**:
- Copy your **Project URL** (looks like `https://xxxxx.supabase.co`)
- Copy your **Anon Key** (public, used by the web app)
- Copy your **Service Role Key** (secret, used only by print server)

### Initialize database schema

Run the SQL commands from `supabase/schema.sql` in your Supabase SQL editor:
- Create `profiles` table (users)
- Create `receipts` table (printed letters)
- Create `pending_receipts` table (for non-registered recipients)
- Create `friends` table (family member relationships)
- Create `print_jobs` table (print queue)
- Set up RLS (Row Level Security) policies

> **TODO:** Create `supabase/schema.sql` with the full schema. See `database.ts` types for reference.

## 2. Environment Variables

### Web App (.env.local)

```env
# Supabase (required)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...

# Print server (optional, defaults to local)
VITE_PRINT_SERVER_URL=http://parents-printer.local:9100
VITE_PRINT_BACKEND=local  # or 'supabase'

# GIPHY sticker search (optional)
VITE_GIPHY_API_KEY=dc...your-giphy-key...
```

### Print Server (print-server/.env)

```env
# Supabase (required for service)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-role-key...

# Printer hardware
PRINTER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
USB_VENDOR_ID=0x0483
USB_PRODUCT_ID=0x5743

# Polling
POLL_INTERVAL=3
```

## 3. Authentication Setup

Gucklings uses a **phone number + family passcode** system. No SMS costs, completely free!

### How it works

- Family members log in with their phone number + a shared family passcode
- Phone numbers are stored in the `profiles` table
- Passcodes are hashed and stored in `passcode_hash` field
- Only pre-registered family members can access the app

### Set up family members

#### Quick Setup (Gucklings provided family list)

If using the provided family, simply run `supabase/seed.sql` after `schema.sql`:

1. Go to Supabase **SQL Editor**
2. Copy and paste the contents of `supabase/schema.sql` and run it
3. Copy and paste the contents of `supabase/seed.sql` and run it
4. Done! All family members are pre-loaded

**Pre-loaded family:**
- Chris: +1-903-445-7839
- Matthew: +1-903-445-5904
- Stephanie: +1-903-445-6139
- Cookie: +1-903-445-4552
- Mom: +1-903-240-7786
- Dad: +1-903-220-8120

**Default passcode:** `Gucklings2024!`

> ⚠️ **Security:** Change this passcode after first login! Update it in the database or create individual passcodes per person.

#### Custom family setup

To use a different family or passcode:

1. Go to Supabase **SQL Editor**
2. Run `schema.sql` first
3. Manually insert your family members:

```sql
INSERT INTO profiles (id, phone_number, passcode_hash, display_name)
VALUES (
  gen_random_uuid(),
  '+1-555-123-4567',
  'YourFamilyPasscode',
  'Matthew'
);
```

Phone number format: `+1-AAA-BBB-CCCC`

### Add/remove family members

To add someone new after initial setup:
1. Open Supabase **SQL Editor**
2. Insert new profile row with phone + passcode
3. They can log in immediately

To remove someone:
1. Delete their row from `profiles` table
2. Their access is revoked immediately

## 4. Deploy to Vercel

### Push to GitHub

```bash
git remote add origin https://github.com/matthewjguck/gucklings.git
git branch -M main
git push -u origin main
```

### Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Select the gucklings repository
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PRINT_SERVER_URL` (if using remote)
5. Deploy!

### Configure heartbeat to prevent free tier pause

Add a Vercel Cron to keep the app alive:

```javascript
// api/heartbeat.js
export default function handler(req, res) {
  res.status(200).json({ ok: true });
}

export const config = {
  schedule: '0 */6 * * *' // Every 6 hours
};
```

## 5. Print Server Setup (at parents' house)

### Option A: Raspberry Pi

1. Install Python 3.9+
2. Clone the repo: `git clone https://github.com/matthewjguck/gucklings.git`
3. Install dependencies: `pip install -r print-server/requirements.txt`
4. Create `.env` with Supabase credentials and printer ID
5. Run: `python print-server/main.py`
6. Connect Brightek POS80 printer via USB
7. Keep running 24/7 (use systemd service or supervisor)

### Option B: Parents' Mac/Windows

Same steps as Raspberry Pi, but keep the script running in the background.

### Option C: Network printer (if available)

Configure printer IP in `.env` instead of USB connection.

## 6. Testing

### Test login with phone + passcode

```bash
npm run dev
```

1. Go to http://localhost:5173/login
2. Enter a family member's phone number:
   - Matthew: `+1-903-445-5904`
   - Chris: `+1-903-445-7839`
   - Or any from the list above
3. Enter the family passcode: `Gucklings2024!`
4. Should log in to home screen

**Try different family members** to ensure everyone can access the app!

### Test letter composition

1. Log in as a family member
2. Go to /compose
3. Write a letter and select another family member as recipient
4. Click "Send to Printer"
5. Check if print job appears in Supabase `print_jobs` table

### Test printing

1. Start the print server (if set up)
2. Ensure Brightek POS80 is connected
3. Send a test print from the app
4. Verify it prints at parents' house

## 7. Deployment Checklist

- [ ] Supabase project created
- [ ] schema.sql executed (creates tables)
- [ ] seed.sql executed (loads family members)
- [ ] All 6 family members can log in with passcode
- [ ] Environment variables set for web app (.env.local)
- [ ] Test locally: `npm run dev` → verify login works
- [ ] Environment variables set for print server
- [ ] Web app deployed to Vercel
- [ ] Heartbeat cron configured in Vercel
- [ ] Print server running at parents' house
- [ ] Test print successful from one family member
- [ ] All family members able to log in
- [ ] Letters print correctly at home

## Troubleshooting

### OTP not sending

Check:
- Supabase phone provider is enabled
- Twilio account is configured (if using Twilio)
- Phone numbers are in international format (+1...)

### Print server not connecting

Check:
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
- Printer ID in `print_jobs` table matches `PRINTER_ID` in `.env`
- USB printer is connected (or network printer is reachable)

### Free tier pausing

Ensure heartbeat endpoint is configured in Vercel Crons.

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Vercel Deployment](https://vercel.com/docs)
- [Brightek POS80 Printer](https://www.brightek.com/)
