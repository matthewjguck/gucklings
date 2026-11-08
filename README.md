# Gucklings 🦑

Family letters, printed and delivered home.

Gucklings is a web app where family members compose personal letters that spontaneously print on a thermal printer at parents' house. Simple, private, and heartfelt.

## Features

- 📝 **Compose letters** - Write notes and letters online from anywhere
- 🖨️ **Print at home** - Letters automatically print on the home thermal printer
- 👨‍👩‍👧 **Family-only** - Private messaging between family members, no public sharing
- 📲 **Phone OTP login** - Secure authentication via phone number
- 💬 **Personal notes** - Add stickers, signatures, and formatting
- 🎨 **Header variants** - Choose from different letter header designs

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, React Router v6
- **Backend:** Supabase (auth, database, realtime)
- **Printing:** Python print server, Brightek POS80 thermal printer, ESC/POS format
- **Deployment:** Vercel (web), Raspberry Pi or local device (print server)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (free tier works great)
- Brightek POS80 printer (at parents' house)

### Development Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/matthewjguck/gucklings.git
   cd gucklings
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Start dev server**
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173

## Deployment

See [GUCKLINGS_SETUP.md](./GUCKLINGS_SETUP.md) for complete setup and deployment instructions including:

- Setting up a new Supabase project
- Configuring Supabase phone OTP authentication
- Deploying to Vercel
- Setting up the print server at home
- Configuring the heartbeat to prevent free tier pause

## Environment Variables

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

## Project Structure

```
gucklings/
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page routes
│   ├── contexts/        # React contexts (Auth, etc)
│   ├── lib/             # Utilities (auth, print, database)
│   ├── types/           # TypeScript types
│   ├── assets/          # Images, icons
│   └── main.tsx
├── print-server/        # Python print server
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── supabase/           # Database schema
├── api/                # Vercel functions (heartbeat)
├── vite.config.ts
└── package.json
```

## Key Pages

- `/` - Onboarding intro
- `/login` - Phone OTP login
- `/home` - Home screen with received letters
- `/compose` - Letter composition
- `/receipt-sent` - Confirmation after sending
- `/prints` - Print status and queue
- `/friends` - Family member list
- `/profile` - User profile
- `/archive` - Saved letters

## Development Workflow

### Adding a new family member

1. They sign up with their phone number
2. They receive an SMS OTP code
3. After login, they appear in the family list automatically
4. Other family members can send them letters

### Sending a letter

1. Tap "Compose"
2. Write your letter and add stickers/signature
3. Select recipient (another family member)
4. Tap "Send to Printer"
5. Letter prints at home within seconds

### Print Server

The print server runs on the device at parents' house with the thermal printer connected. It:

- Polls the database every few seconds for new print jobs
- Renders letters as ESC/POS commands
- Sends to Brightek POS80 thermal printer via USB or network
- Updates job status in database

See `print-server/README.md` for setup.

## Troubleshooting

**OTP not sending:** Check that phone provider is enabled in Supabase and Twilio is configured.

**Letters not printing:** Verify print server is running and connected to printer. Check `print_jobs` table status in Supabase.

**Free tier pausing:** Ensure the heartbeat cron is configured in Vercel to keep the app alive.

## Contributing

This is a family project! Feel free to suggest features or improvements.

## License

MIT

## References

- Original capstone: [Inklings](https://github.com/matthewjguck/inklings)
- Supabase docs: https://supabase.com/docs
- Vercel docs: https://vercel.com/docs
- Brightek POS80: ESC/POS thermal printer

---

**Questions?** Check [GUCKLINGS_SETUP.md](./GUCKLINGS_SETUP.md) or reach out to the family!
