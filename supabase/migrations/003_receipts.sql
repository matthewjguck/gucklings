-- Receipts table: a receipt is either saved for self (recipient_id null)
-- or sent to a friend (recipient_id set); when sent, the same row is
-- visible in both author's and recipient's archive.
create table public.receipts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade,
  content jsonb not null,
  print_job_id uuid references public.print_jobs(id) on delete set null,
  created_at timestamptz default now() not null,
  check (recipient_id is null or recipient_id != author_id)
);

create index receipts_author_id_idx on public.receipts(author_id);
create index receipts_recipient_id_idx on public.receipts(recipient_id);
create index receipts_created_at_idx on public.receipts(created_at desc);

alter table public.receipts enable row level security;

create policy "Users can view their own receipts"
  on public.receipts for select
  using (auth.uid() = author_id or auth.uid() = recipient_id);

create policy "Users can create own receipts"
  on public.receipts for insert
  with check (auth.uid() = author_id);

create policy "Authors can delete own receipts"
  on public.receipts for delete
  using (auth.uid() = author_id);
