-- Two-team match model: required home/away, roster team_id, period scores

-- Placeholder opponent team for legacy one-sided games
insert into public.teams (id, organization_id, name, short_name)
values (
  '33333333-3333-4333-8333-333333333399',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'คู่แข่ง (legacy)',
  'OPP'
)
on conflict (id) do update
  set name = excluded.name, short_name = excluded.short_name;

-- Backfill home/away from our_side + our_team_id
update public.games g
set
  home_team_id = coalesce(
    g.home_team_id,
    case when g.our_side = 'HOME' then g.our_team_id else null end,
    '33333333-3333-4333-8333-333333333399'
  ),
  away_team_id = coalesce(
    g.away_team_id,
    case when g.our_side = 'AWAY' then g.our_team_id else null end,
    '33333333-3333-4333-8333-333333333399'
  )
where g.home_team_id is null or g.away_team_id is null;

-- Ensure our team is on the correct side
update public.games
set home_team_id = our_team_id
where our_side = 'HOME' and home_team_id is distinct from our_team_id;

update public.games
set away_team_id = our_team_id
where our_side = 'AWAY' and away_team_id is distinct from our_team_id;

-- Opponent name from the other team when blank-ish
update public.games g
set opponent_name = coalesce(
  nullif(trim(g.opponent_name), ''),
  (select t.name from public.teams t
   where t.id = case when g.our_side = 'HOME' then g.away_team_id else g.home_team_id end),
  'คู่แข่ง'
);

alter table public.games
  alter column home_team_id set not null,
  alter column away_team_id set not null;

alter table public.games drop constraint if exists games_home_away_distinct;
alter table public.games
  add constraint games_home_away_distinct check (home_team_id <> away_team_id);

-- game_rosters.team_id
alter table public.game_rosters
  add column if not exists team_id uuid references public.teams(id);

update public.game_rosters gr
set team_id = p.team_id
from public.players p
where gr.player_id = p.id and gr.team_id is null;

update public.game_rosters gr
set team_id = g.our_team_id
from public.games g
where gr.game_id = g.id and gr.team_id is null;

alter table public.game_rosters
  alter column team_id set not null;

create index if not exists game_rosters_game_team_idx
  on public.game_rosters (game_id, team_id);

-- Period scoring
create table if not exists public.game_period_scores (
  game_id uuid not null references public.games(id) on delete cascade,
  period int not null check (period >= 1),
  home_points int not null default 0 check (home_points >= 0),
  away_points int not null default 0 check (away_points >= 0),
  primary key (game_id, period)
);

alter table public.game_period_scores enable row level security;

do $$ begin
  create policy "authenticated read game_period_scores"
    on public.game_period_scores for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated manage game_period_scores"
    on public.game_period_scores for all to authenticated
    using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon read game_period_scores"
    on public.game_period_scores for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon insert game_period_scores"
    on public.game_period_scores for insert to anon with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon update game_period_scores"
    on public.game_period_scores for update to anon using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon delete game_period_scores"
    on public.game_period_scores for delete to anon using (true);
exception when duplicate_object then null;
end $$;
