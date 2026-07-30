-- Day-1 schema for SP FIBA Competition + Courtside
-- Apply via: supabase db push / supabase migration up

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
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  scheduled_at timestamptz,
  status text not null default 'scheduled',
  roster_locked boolean not null default false,
  created_at timestamptz not null default now()
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

-- Seed default FIBA ruleset + demo game for courtside sync tests
insert into public.rulesets (id, name)
values ('00000000-0000-4000-8000-000000000001', 'FIBA Full Court')
on conflict (id) do nothing;

insert into public.organizations (id, name)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'SP Demo Org')
on conflict (id) do nothing;

insert into public.competitions (id, organization_id, ruleset_id, name, season)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '00000000-0000-4000-8000-000000000001',
  'SP Demo League',
  '2026'
)
on conflict (id) do nothing;

insert into public.teams (id, organization_id, name, short_name) values
  ('33333333-3333-4333-8333-333333333301', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Home Hawks', 'HH'),
  ('33333333-3333-4333-8333-333333333302', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Away Arrows', 'AA')
on conflict (id) do nothing;

insert into public.players (id, team_id, display_name, jersey_number) values
  ('11111111-1111-4111-8111-111111111101', '33333333-3333-4333-8333-333333333301', 'วิชัย', '11'),
  ('11111111-1111-4111-8111-111111111102', '33333333-3333-4333-8333-333333333301', 'อาทิตย์', '7'),
  ('11111111-1111-4111-8111-111111111103', '33333333-3333-4333-8333-333333333301', 'กิตติ', '23'),
  ('11111111-1111-4111-8111-111111111104', '33333333-3333-4333-8333-333333333301', 'ณัฐ', '5'),
  ('11111111-1111-4111-8111-111111111105', '33333333-3333-4333-8333-333333333301', 'สมชาย', '9')
on conflict (id) do nothing;

insert into public.games (
  id, competition_id, home_team_id, away_team_id, status
) values (
  '22222222-2222-4222-8222-222222222201',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '33333333-3333-4333-8333-333333333301',
  '33333333-3333-4333-8333-333333333302',
  'live'
)
on conflict (id) do nothing;

insert into public.game_states (game_id, status, period, home_attack_side_period1)
values (
  '22222222-2222-4222-8222-222222222201',
  'live',
  1,
  'LEFT'
)
on conflict (game_id) do nothing;

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
alter table public.play_by_play enable row level security;
alter table public.box_score_snapshots enable row level security;
alter table public.device_registry enable row level security;
alter table public.sync_cursors enable row level security;
alter table public.profiles enable row level security;

-- Read for authenticated; writes refined later via API roles
create policy "authenticated read rulesets" on public.rulesets
  for select to authenticated using (true);

create policy "authenticated read competitions" on public.competitions
  for select to authenticated using (true);

create policy "authenticated read games" on public.games
  for select to authenticated using (true);

create policy "authenticated read pbp" on public.play_by_play
  for select to authenticated using (true);

create policy "authenticated read teams" on public.teams
  for select to authenticated using (true);

create policy "authenticated read players" on public.players
  for select to authenticated using (true);

create policy "users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = user_id);
