-- SP Basketball — baseline schema (already applied on hosted)
-- แหล่งความจริงของโครงสร้าง DB — คัดลอกไป migrations/20260101000000_baseline_schema.sql เมื่อแก้
-- โปรเจกต์ใหม่บน hosted: รันไฟล์นี้ใน SQL Editor แล้วตามด้วย seed.sql
-- Local CLI: supabase start / db reset ใช้สำเนาใน migrations/ + local_role_grants

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rulesets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_count int not null default 4,
  period_length_ms int not null default 600000,
  ot_length_ms int not null default 300000,
  foul_out_count int not null default 5,
  team_fouls_bonus_at int not null default 5,
  three_pt_profile text not null default 'FIBA_FULL',
  created_at timestamptz not null default now()
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  ruleset_id uuid not null references public.rulesets(id),
  name text not null,
  season text,
  created_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  name text not null,
  short_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id),
  display_name text not null,
  jersey_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.rosters (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id),
  team_id uuid not null references public.teams(id),
  player_id uuid not null references public.players(id),
  jersey_number text,
  unique (competition_id, team_id, player_id)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id),
  venue_id uuid references public.venues(id),
  our_team_id uuid not null references public.teams(id),
  opponent_name text not null,
  our_side text not null default 'HOME' check (our_side in ('HOME', 'AWAY')),
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  scheduled_at timestamptz,
  status text not null default 'scheduled',
  roster_locked boolean not null default false,
  home_coach text,
  away_coach text,
  crew_chief text,
  umpire text,
  created_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create table if not exists public.game_officials (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  display_name text not null,
  role text
);

create table if not exists public.game_states (
  game_id uuid primary key references public.games(id) on delete cascade,
  status text not null default 'scheduled',
  period int not null default 1,
  home_score int not null default 0,
  away_score int not null default 0,
  possession_team_id uuid references public.teams(id),
  possession_arrow_team_id uuid references public.teams(id),
  home_attack_side_period1 text not null default 'LEFT',
  home_team_fouls_period int not null default 0,
  away_team_fouls_period int not null default 0,
  updated_at timestamptz not null default now(),
  version int not null default 1
);

create table if not exists public.on_court (
  game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  player_id uuid not null references public.players(id),
  slot int not null check (slot between 1 and 5),
  primary key (game_id, team_id, slot),
  unique (game_id, team_id, player_id)
);

-- Dress list for a match (both teams): who plays + who starts
create table if not exists public.game_rosters (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  player_id uuid not null references public.players(id),
  is_starter boolean not null default false,
  starter_slot int check (starter_slot is null or starter_slot between 1 and 5),
  unique (game_id, player_id)
);

create index if not exists game_rosters_game_team_idx
  on public.game_rosters (game_id, team_id);

create table if not exists public.game_period_scores (
  game_id uuid not null references public.games(id) on delete cascade,
  period int not null check (period >= 1),
  home_points int not null default 0 check (home_points >= 0),
  away_points int not null default 0 check (away_points >= 0),
  primary key (game_id, period)
);

create table if not exists public.play_by_play (
  event_id uuid primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  period int not null,
  clock_ms int,
  team_id uuid references public.teams(id),
  player_id uuid references public.players(id),
  type text not null,
  hlc jsonb not null,
  payload jsonb not null default '{}'::jsonb,
  voided_at timestamptz,
  void_reason text,
  voided_by_event_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists play_by_play_game_created_idx
  on public.play_by_play (game_id, created_at);

create index if not exists play_by_play_game_type_idx
  on public.play_by_play (game_id, type);

create table if not exists public.box_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid references public.players(id),
  team_id uuid not null references public.teams(id),
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (game_id, player_id)
);

create table if not exists public.device_registry (
  device_id text primary key,
  game_id uuid references public.games(id),
  role text not null default 'primary',
  label text,
  last_seen_at timestamptz not null default now()
);

create table if not exists public.sync_cursors (
  device_id text not null,
  game_id uuid not null references public.games(id) on delete cascade,
  last_event_id uuid,
  last_hlc jsonb,
  updated_at timestamptz not null default now(),
  primary key (device_id, game_id)
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  display_name text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.organizations enable row level security;
alter table public.rulesets enable row level security;
alter table public.competitions enable row level security;
alter table public.venues enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.rosters enable row level security;
alter table public.games enable row level security;
alter table public.game_officials enable row level security;
alter table public.game_states enable row level security;
alter table public.on_court enable row level security;
alter table public.game_rosters enable row level security;
alter table public.game_period_scores enable row level security;
alter table public.play_by_play enable row level security;
alter table public.box_score_snapshots enable row level security;
alter table public.device_registry enable row level security;
alter table public.sync_cursors enable row level security;
alter table public.profiles enable row level security;

-- Authenticated read
do $$ begin create policy "authenticated read rulesets" on public.rulesets for select to authenticated using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated read competitions" on public.competitions for select to authenticated using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated read games" on public.games for select to authenticated using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated read pbp" on public.play_by_play for select to authenticated using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated read teams" on public.teams for select to authenticated using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated read players" on public.players for select to authenticated using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated read rosters" on public.rosters for select to authenticated using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "users read own profile" on public.profiles for select to authenticated using (auth.uid() = user_id); exception when duplicate_object then null; end $$;

-- CMS write (authenticated admin)
do $$ begin create policy "authenticated manage players" on public.players for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated manage rosters" on public.rosters for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated manage games" on public.games for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated manage game_rosters" on public.game_rosters for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated manage game_period_scores" on public.game_period_scores for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated manage teams" on public.teams for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "authenticated manage competitions" on public.competitions for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;

-- Courtside anon sync (read structure + push PBP)
do $$ begin create policy "anon read pbp" on public.play_by_play for select to anon using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon insert pbp" on public.play_by_play for insert to anon with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon read games" on public.games for select to anon using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon insert games" on public.games for insert to anon with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon update games" on public.games for update to anon using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon insert game_states" on public.game_states for insert to anon with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon update game_states" on public.game_states for update to anon using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon read teams" on public.teams for select to anon using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon read players" on public.players for select to anon using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon read game_rosters" on public.game_rosters for select to anon using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon read game_period_scores" on public.game_period_scores for select to anon using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon insert game_period_scores" on public.game_period_scores for insert to anon with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon update game_period_scores" on public.game_period_scores for update to anon using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon read competitions" on public.competitions for select to anon using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "anon read rulesets" on public.rulesets for select to anon using (true); exception when duplicate_object then null; end $$;
