-- Purge match/stat data only. Keeps teams, players, competitions, venues, auth.
-- Run against local or hosted after backup. Prefer scripts/purge-match-data.mjs --dry-run first.

begin;

delete from public.play_by_play;
delete from public.box_score_snapshots;
delete from public.on_court;
delete from public.game_rosters;

do $$ begin
  delete from public.game_period_scores;
exception when undefined_table then null;
end $$;

delete from public.game_states;
delete from public.game_officials;
delete from public.sync_cursors;
update public.device_registry set game_id = null where game_id is not null;
delete from public.games;

commit;
