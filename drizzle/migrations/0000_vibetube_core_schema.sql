-- VibeTube core schema

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles: one per auth user, auto-created on signup
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Users can view own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update to authenticated
using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Favorites
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id text not null,
  title text not null,
  channel_id text,
  channel_title text not null,
  thumbnail_url text,
  duration text,
  created_at timestamptz not null default now(),
  unique (user_id, video_id)
);

grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;

alter table public.favorites enable row level security;

create policy "Users can read own favorites"
on public.favorites for select to authenticated
using (auth.uid() = user_id);

create policy "Users can add own favorites"
on public.favorites for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can remove own favorites"
on public.favorites for delete to authenticated
using (auth.uid() = user_id);

-- Watch history
create table public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id text not null,
  title text not null,
  channel_id text,
  channel_title text not null,
  thumbnail_url text,
  duration text,
  watched_at timestamptz not null default now(),
  unique (user_id, video_id)
);

grant select, insert, update, delete on public.watch_history to authenticated;
grant all on public.watch_history to service_role;

alter table public.watch_history enable row level security;

create policy "Users can read own history"
on public.watch_history for select to authenticated
using (auth.uid() = user_id);

create policy "Users can record own history"
on public.watch_history for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can refresh own history"
on public.watch_history for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can clear own history"
on public.watch_history for delete to authenticated
using (auth.uid() = user_id);

-- Downloads
create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id text not null,
  title text not null,
  channel_title text,
  thumbnail_url text,
  quality text not null,
  file_size_bytes bigint,
  status text not null default 'queued' check (status in ('queued','downloading','paused','completed','failed','cancelled')),
  progress integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create trigger downloads_set_updated_at
before update on public.downloads
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.downloads to authenticated;
grant all on public.downloads to service_role;

alter table public.downloads enable row level security;

create policy "Users can read own downloads"
on public.downloads for select to authenticated
using (auth.uid() = user_id);

create policy "Users can create own downloads"
on public.downloads for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own downloads"
on public.downloads for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own downloads"
on public.downloads for delete to authenticated
using (auth.uid() = user_id);

-- Authorized media allowlist: the ONLY videos this app may offer for download.
-- Readable exclusively by service-role backend code; no Data API grants by design.
create table public.authorized_media (
  id uuid primary key default gen_random_uuid(),
  video_id text unique not null,
  title text not null,
  channel_title text,
  thumbnail_url text,
  description text,
  storage_paths jsonb not null default '{}'::jsonb,
  file_sizes jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

grant all on public.authorized_media to service_role;

alter table public.authorized_media enable row level security;

-- Private bucket for VibeTube-owned or licensed downloadable media.
-- Only trusted server-side code issues signed URLs for files in this bucket.
insert into storage.buckets (id, name, public)
values ('authorized-media', 'authorized-media', false)
on conflict (id) do update set public = false;
