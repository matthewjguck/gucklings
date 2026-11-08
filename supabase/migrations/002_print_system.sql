-- Printers table: each physical printer registers itself
create table public.printers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  -- Geofence center point
  latitude double precision not null,
  longitude double precision not null,
  -- Radius in meters — jobs from users within this radius route here
  geofence_radius_m double precision not null default 500,
  -- The Pi authenticates with a service-role key, but we track which printer it is
  api_key text unique not null default encode(gen_random_bytes(32), 'hex'),
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Print jobs table
create table public.print_jobs (
  id uuid default gen_random_uuid() primary key,
  printer_id uuid references public.printers(id) on delete set null,
  -- Who sent it
  sender_id uuid references public.profiles(id) on delete set null,
  recipient_name text,
  -- ESC/POS binary payload encoded as base64
  payload_base64 text not null,
  -- pending → printing → done | failed
  status text not null default 'pending'
    check (status in ('pending', 'printing', 'done', 'failed')),
  error_message text,
  -- Location the sender was at when they hit send
  sender_latitude double precision,
  sender_longitude double precision,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index print_jobs_printer_status_idx on public.print_jobs(printer_id, status);
create index print_jobs_created_at_idx on public.print_jobs(created_at desc);
create index printers_active_idx on public.printers(is_active) where is_active = true;

-- Updated-at triggers
create trigger printers_updated_at
  before update on public.printers
  for each row execute function public.update_updated_at();

create trigger print_jobs_updated_at
  before update on public.print_jobs
  for each row execute function public.update_updated_at();

-- RLS
alter table public.printers enable row level security;
alter table public.print_jobs enable row level security;

-- Printers: readable by authenticated users (for geofence matching)
create policy "Printers are viewable by authenticated users"
  on public.printers for select
  using (auth.role() = 'authenticated');

-- Print jobs: users can insert their own, and read their own
create policy "Users can create print jobs"
  on public.print_jobs for insert
  with check (auth.uid() = sender_id);

create policy "Users can view own print jobs"
  on public.print_jobs for select
  using (auth.uid() = sender_id);

-- Service role (used by Pi) bypasses RLS, so no explicit policy needed for the printer daemon.

-- Helper: find the nearest active printer to a given point
create or replace function public.nearest_printer(lat double precision, lng double precision)
returns uuid as $$
  select id
  from public.printers
  where is_active = true
    -- Only consider printers whose geofence covers this point
    and (
      6371000 * acos(
        cos(radians(lat)) * cos(radians(latitude))
        * cos(radians(longitude) - radians(lng))
        + sin(radians(lat)) * sin(radians(latitude))
      )
    ) <= geofence_radius_m
  order by (
    6371000 * acos(
      cos(radians(lat)) * cos(radians(latitude))
      * cos(radians(longitude) - radians(lng))
      + sin(radians(lat)) * sin(radians(latitude))
    )
  )
  limit 1;
$$ language sql stable security definer;
