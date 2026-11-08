-- Drop unused follows table
drop table if exists public.follows cascade;

-- Create friends table with mutual friendship model
create table public.friends (
  id          uuid default gen_random_uuid() primary key,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  status      text not null default 'pending'
              check (status in ('pending', 'accepted')),
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,

  unique (requester_id, addressee_id),
  check (requester_id != addressee_id)
);

create index friends_requester_idx on public.friends(requester_id);
create index friends_addressee_idx on public.friends(addressee_id);
create index friends_status_idx on public.friends(status);

-- Add trigger for updated_at
create trigger friends_updated_at
  before update on public.friends
  for each row execute function public.update_updated_at();

-- Enable RLS
alter table public.friends enable row level security;

-- RLS Policies
-- Users can view their own friend rows
create policy "Users can view their own friend rows"
  on public.friends for select
  using (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Only the requester can send a friend request
create policy "Users can send friend requests"
  on public.friends for insert
  with check (auth.uid() = requester_id);

-- Only the addressee can accept friend requests
create policy "Addressee can accept friend requests"
  on public.friends for update
  using (auth.uid() = addressee_id)
  with check (status = 'accepted');

-- Either party can remove a friend
create policy "Users can remove friend rows"
  on public.friends for delete
  using (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Enhance print_jobs table
alter table public.print_jobs add column message_text text;
alter table public.print_jobs add column recipient_id uuid references public.profiles(id) on delete set null;

create index print_jobs_recipient_id_idx on public.print_jobs(recipient_id);

-- Allow recipients to view jobs sent to them
create policy "Recipients can view jobs sent to them"
  on public.print_jobs for select
  using (auth.uid() = recipient_id);
