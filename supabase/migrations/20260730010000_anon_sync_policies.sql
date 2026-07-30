-- Temporary anon sync policies (also applied via MCP)
-- Tighten to authenticated + service_role once Auth is live

do $$ begin
  create policy "anon read pbp" on public.play_by_play for select to anon using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anon insert pbp" on public.play_by_play for insert to anon with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anon read games" on public.games for select to anon using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anon read teams" on public.teams for select to anon using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anon read players" on public.players for select to anon using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anon read competitions" on public.competitions for select to anon using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anon read rulesets" on public.rulesets for select to anon using (true);
exception when duplicate_object then null; end $$;
