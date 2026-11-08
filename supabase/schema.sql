-- Gucklings Schema: Family Letter Printing App
-- Initialize this schema in your Supabase project

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (Supabase auth integration)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone_number TEXT UNIQUE NOT NULL,
  passcode_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friends table (family member relationships)
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Receipts table (printed letters)
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content JSONB NOT NULL,
  print_job_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pending receipts table (for family members not yet registered)
CREATE TABLE IF NOT EXISTS pending_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Printers table (simplified for single home printer)
CREATE TABLE IF NOT EXISTS printers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Print jobs table (queue for printer)
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  printer_id TEXT NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_name TEXT,
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payload_base64 TEXT NOT NULL,
  message_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'printed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own and family members' profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM friends f
      WHERE (f.requester_id = auth.uid() AND f.addressee_id = profiles.id AND f.status = 'accepted')
      OR (f.addressee_id = auth.uid() AND f.requester_id = profiles.id AND f.status = 'accepted')
    )
  );

-- Profiles: users can update their own profile
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Friends: users can view their own friendships
CREATE POLICY "friends_select" ON friends FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Friends: users can insert new friendships (for pending friend requests)
CREATE POLICY "friends_insert" ON friends FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Receipts: users can insert their own receipts
CREATE POLICY "receipts_insert" ON receipts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Receipts: users can view receipts they sent or received
CREATE POLICY "receipts_select" ON receipts FOR SELECT
  USING (
    auth.uid() = author_id OR
    auth.uid() = recipient_id
  );

-- Pending receipts: users can insert their own
CREATE POLICY "pending_receipts_insert" ON pending_receipts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Print jobs: users can view their own sent/received print jobs
CREATE POLICY "print_jobs_select" ON print_jobs FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() = recipient_id
  );

-- Printers: all authenticated users can view active printers (public read)
CREATE POLICY "printers_select" ON printers FOR SELECT
  USING (is_active = TRUE);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS receipts_author_id ON receipts(author_id);
CREATE INDEX IF NOT EXISTS receipts_recipient_id ON receipts(recipient_id);
CREATE INDEX IF NOT EXISTS receipts_created_at ON receipts(created_at);
CREATE INDEX IF NOT EXISTS print_jobs_printer_id ON print_jobs(printer_id);
CREATE INDEX IF NOT EXISTS print_jobs_sender_id ON print_jobs(sender_id);
CREATE INDEX IF NOT EXISTS print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS friends_requester_id ON friends(requester_id);
CREATE INDEX IF NOT EXISTS friends_addressee_id ON friends(addressee_id);

-- Trigger to update profiles.updated_at
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- Trigger to auto-create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert the home printer (replace id with actual ID)
INSERT INTO printers (id, name, api_key, is_active)
VALUES ('home-printer-gucklings', 'Home Printer', NULL, TRUE)
ON CONFLICT (id) DO NOTHING;
