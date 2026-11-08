-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Posts table
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Likes table
create table public.likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (user_id, post_id)
);

-- Follows table
create table public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (follower_id, following_id),
  check (follower_id != following_id)
);

-- Indexes
create index posts_author_id_idx on public.posts(author_id);
create index posts_created_at_idx on public.posts(created_at desc);
create index likes_post_id_idx on public.likes(post_id);
create index likes_user_id_idx on public.likes(user_id);
create index follows_follower_id_idx on public.follows(follower_id);
create index follows_following_id_idx on public.follows(following_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.update_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Posts: anyone can read, only author can insert/update/delete
create policy "Posts are viewable by everyone"
  on public.posts for select using (true);

create policy "Users can create posts"
  on public.posts for insert with check (auth.uid() = author_id);

create policy "Users can update own posts"
  on public.posts for update using (auth.uid() = author_id);

create policy "Users can delete own posts"
  on public.posts for delete using (auth.uid() = author_id);

-- Likes: anyone can read, only own likes can be inserted/deleted
create policy "Likes are viewable by everyone"
  on public.likes for select using (true);

create policy "Users can like posts"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on public.likes for delete using (auth.uid() = user_id);

-- Follows: anyone can read, only own follows can be inserted/deleted
create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

create policy "Users can follow others"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow others"
  on public.follows for delete using (auth.uid() = follower_id);
