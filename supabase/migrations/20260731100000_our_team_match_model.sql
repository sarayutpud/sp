-- Our-team match model: real team + text opponent + side + dress roster

alter table public.games
  add column if not exists our_team_id uuid references public.teams(id),
  add column if not exists opponent_name text,
  add column if not exists our_side text;

update public.games g
set
  our_team_id = coalesce(g.our_team_id, g.home_team_id),
  our_side = coalesce(g.our_side, 'HOME'),
  opponent_name = coalesce(
    nullif(g.opponent_name, ''),
    (select t.name from public.teams t where t.id = g.away_team_id),
    'คู่แข่ง'
  )
where g.our_team_id is null
   or g.opponent_name is null
   or g.our_side is null;

alter table public.games
  alter column our_team_id set not null,
  alter column opponent_name set not null,
  alter column our_side set not null,
  alter column our_side set default 'HOME';

alter table public.games drop constraint if exists games_our_side_check;
alter table public.games
  add constraint games_our_side_check check (our_side in ('HOME', 'AWAY'));

alter table public.games alter column home_team_id drop not null;
alter table public.games alter column away_team_id drop not null;

-- Sync legacy columns from our_side for older reads
update public.games
set
  home_team_id = case when our_side = 'HOME' then our_team_id else null end,
  away_team_id = case when our_side = 'AWAY' then our_team_id else null end;

create table if not exists public.game_rosters (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id),
  is_starter boolean not null default false,
  starter_slot int check (starter_slot is null or starter_slot between 1 and 5),
  unique (game_id, player_id)
);

create index if not exists game_rosters_game_idx on public.game_rosters (game_id);

alter table public.game_rosters enable row level security;

do $$ begin
  create policy "authenticated manage game_rosters"
    on public.game_rosters for all to authenticated
    using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon read game_rosters"
    on public.game_rosters for select to anon using (true);
exception when duplicate_object then null;
end $$;

-- Seed dress list from existing on_court + remaining home players if empty
insert into public.game_rosters (game_id, player_id, is_starter, starter_slot)
select oc.game_id, oc.player_id, true, oc.slot
from public.on_court oc
on conflict (game_id, player_id) do update
  set is_starter = excluded.is_starter,
      starter_slot = excluded.starter_slot;
