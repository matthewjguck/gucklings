-- Onboarding flow: phone on profiles, pending receipts for unsigned recipients.

alter table public.profiles
  add column phone text unique;

create index profiles_phone_idx on public.profiles(phone);

-- Propagate phone from auth.users on signup.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone);
  return new;
end;
$$ language plpgsql security definer;

-- Receipts addressed to a recipient who hasn't signed up yet.
-- Promoted to public.receipts when the matching phone signs up.
create table public.pending_receipts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  recipient_phone text not null,
  content jsonb not null,
  print_job_id uuid references public.print_jobs(id) on delete set null,
  created_at timestamptz default now() not null
);

create index pending_receipts_recipient_phone_idx on public.pending_receipts(recipient_phone);
create index pending_receipts_author_id_idx on public.pending_receipts(author_id);

alter table public.pending_receipts enable row level security;

create policy "Authors can view their pending receipts"
  on public.pending_receipts for select
  using (auth.uid() = author_id);

create policy "Recipients can view pending by phone"
  on public.pending_receipts for select
  using (
    recipient_phone in (select phone from public.profiles where id = auth.uid())
  );

create policy "Authors can create pending"
  on public.pending_receipts for insert
  with check (auth.uid() = author_id);

create policy "Author or recipient can delete"
  on public.pending_receipts for delete
  using (
    auth.uid() = author_id
    or recipient_phone in (select phone from public.profiles where id = auth.uid())
  );
