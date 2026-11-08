-- Receipts delivered via the email link flow.
-- Anyone with the link (UUID) can read; only the edge function (service role) inserts.

create table public.delivered_receipts (
  id uuid default gen_random_uuid() primary key,
  sender_name text not null,
  recipient_email text not null,
  content jsonb not null,
  print_job_id uuid references public.print_jobs(id) on delete set null,
  printed_at timestamptz,
  created_at timestamptz default now() not null
);

create index delivered_receipts_recipient_email_idx on public.delivered_receipts(recipient_email);
create index delivered_receipts_created_at_idx on public.delivered_receipts(created_at desc);

alter table public.delivered_receipts enable row level security;

-- Anyone with the link can read. The UUID is the auth.
create policy "Public read by id"
  on public.delivered_receipts for select
  using (true);

-- Authenticated users can mark printed (set print_job_id, printed_at).
create policy "Authenticated can mark printed"
  on public.delivered_receipts for update
  to authenticated
  using (true)
  with check (true);
