-- Allow Courtside (anon key) to create games when missing at sync / pre-game
do $$ begin
  create policy "anon insert games"
    on public.games for insert to anon
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon update games"
    on public.games for update to anon
    using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon insert game_states"
    on public.game_states for insert to anon
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon update game_states"
    on public.game_states for update to anon
    using (true) with check (true);
exception when duplicate_object then null;
end $$;
