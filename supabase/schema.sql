-- RibaRun Supabase schema (Auth + Best-time leaderboard)

create table if not exists public.player_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    username text not null,
    username_normalized text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint player_profiles_username_len check (char_length(username) between 3 and 20),
    constraint player_profiles_username_normalized_len check (char_length(username_normalized) between 3 and 20)
);

create unique index if not exists player_profiles_username_normalized_uq
    on public.player_profiles (username_normalized);

create table if not exists public.leaderboard_best (
    user_id uuid primary key references auth.users(id) on delete cascade,
    username_snapshot text not null,
    best_survived_ms integer not null,
    updated_at timestamptz not null default now(),
    constraint leaderboard_best_ms_non_negative check (best_survived_ms >= 0)
);

create index if not exists leaderboard_best_rank_idx
    on public.leaderboard_best (best_survived_ms desc, updated_at asc);

create or replace view public.leaderboard_public as
select
    username_snapshot,
    best_survived_ms,
    updated_at
from public.leaderboard_best
order by best_survived_ms desc, updated_at asc;

alter table public.player_profiles enable row level security;
alter table public.leaderboard_best enable row level security;

-- Profiles: users can read/write only their own profile row.
drop policy if exists "profiles select own" on public.player_profiles;
create policy "profiles select own"
    on public.player_profiles
    for select
    using (auth.uid() = user_id);

drop policy if exists "profiles insert own" on public.player_profiles;
create policy "profiles insert own"
    on public.player_profiles
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "profiles update own" on public.player_profiles;
create policy "profiles update own"
    on public.player_profiles
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Leaderboard best: users can read all rows, write only their own row.
drop policy if exists "leaderboard select all" on public.leaderboard_best;
create policy "leaderboard select all"
    on public.leaderboard_best
    for select
    using (true);

drop policy if exists "leaderboard insert own" on public.leaderboard_best;
create policy "leaderboard insert own"
    on public.leaderboard_best
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "leaderboard update own" on public.leaderboard_best;
create policy "leaderboard update own"
    on public.leaderboard_best
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Optional: prevent deletes from client-side code.
drop policy if exists "leaderboard delete none" on public.leaderboard_best;
create policy "leaderboard delete none"
    on public.leaderboard_best
    for delete
    using (false);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists player_profiles_set_updated_at on public.player_profiles;
create trigger player_profiles_set_updated_at
before update on public.player_profiles
for each row execute function public.set_updated_at();

drop trigger if exists leaderboard_best_set_updated_at on public.leaderboard_best;
create trigger leaderboard_best_set_updated_at
before update on public.leaderboard_best
for each row execute function public.set_updated_at();
