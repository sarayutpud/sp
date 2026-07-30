-- Seed data + default CMS user — run after schema.sql
-- หรือใช้: pnpm seed (ต้องมี SUPABASE_SERVICE_ROLE_KEY)

insert into public.organizations (id, name)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'SP FITNESS BANG SUE')
on conflict (id) do update set name = excluded.name;

insert into public.rulesets (id, name)
values ('00000000-0000-4000-8000-000000000001', 'FIBA Full Court')
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

insert into public.venues (id, name, city)
values ('44444444-4444-4444-8444-444444444401', 'SP Arena Bang Sue', 'Bangkok')
on conflict (id) do nothing;

insert into public.teams (id, organization_id, name, short_name) values
  ('33333333-3333-4333-8333-333333333301', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'SP Fitness', 'SPF'),
  ('33333333-3333-4333-8333-333333333302', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Away Arrows', 'AA')
on conflict (id) do update set name = excluded.name, short_name = excluded.short_name;

-- Home: 5 starters + 2 bench
insert into public.players (id, team_id, display_name, jersey_number) values
  ('11111111-1111-4111-8111-111111111101', '33333333-3333-4333-8333-333333333301', 'วิชัย', '11'),
  ('11111111-1111-4111-8111-111111111102', '33333333-3333-4333-8333-333333333301', 'อาทิตย์', '7'),
  ('11111111-1111-4111-8111-111111111103', '33333333-3333-4333-8333-333333333301', 'กิตติ', '23'),
  ('11111111-1111-4111-8111-111111111104', '33333333-3333-4333-8333-333333333301', 'ณัฐ', '5'),
  ('11111111-1111-4111-8111-111111111105', '33333333-3333-4333-8333-333333333301', 'สมชาย', '9'),
  ('11111111-1111-4111-8111-111111111106', '33333333-3333-4333-8333-333333333301', 'พงศ์', '15'),
  ('11111111-1111-4111-8111-111111111107', '33333333-3333-4333-8333-333333333301', 'ธนา', '3')
on conflict (id) do update set display_name = excluded.display_name, jersey_number = excluded.jersey_number;

-- Away: 5 players
insert into public.players (id, team_id, display_name, jersey_number) values
  ('11111111-1111-4111-8111-111111111201', '33333333-3333-4333-8333-333333333302', 'สุรชัย', '4'),
  ('11111111-1111-4111-8111-111111111202', '33333333-3333-4333-8333-333333333302', 'มานะ', '8'),
  ('11111111-1111-4111-8111-111111111203', '33333333-3333-4333-8333-333333333302', 'ปกรณ์', '12'),
  ('11111111-1111-4111-8111-111111111204', '33333333-3333-4333-8333-333333333302', 'เอก', '21'),
  ('11111111-1111-4111-8111-111111111205', '33333333-3333-4333-8333-333333333302', 'บาส', '1')
on conflict (id) do update set display_name = excluded.display_name, jersey_number = excluded.jersey_number;

insert into public.rosters (competition_id, team_id, player_id, jersey_number)
select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', team_id, id, jersey_number
from public.players
where team_id in (
  '33333333-3333-4333-8333-333333333301',
  '33333333-3333-4333-8333-333333333302'
)
on conflict (competition_id, team_id, player_id) do update
  set jersey_number = excluded.jersey_number;

insert into public.games (
  id, competition_id, venue_id, home_team_id, away_team_id, scheduled_at, status
) values (
  '22222222-2222-4222-8222-222222222201',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '44444444-4444-4444-8444-444444444401',
  '33333333-3333-4333-8333-333333333301',
  '33333333-3333-4333-8333-333333333302',
  now() + interval '2 hours',
  'scheduled'
)
on conflict (id) do update set status = excluded.status, scheduled_at = excluded.scheduled_at;

insert into public.game_states (game_id, status, period, home_attack_side_period1)
values ('22222222-2222-4222-8222-222222222201', 'scheduled', 1, 'LEFT')
on conflict (game_id) do update set status = excluded.status;

insert into public.on_court (game_id, team_id, player_id, slot) values
  ('22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111101', 1),
  ('22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111102', 2),
  ('22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111103', 3),
  ('22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111104', 4),
  ('22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111105', 5)
on conflict (game_id, team_id, slot) do update set player_id = excluded.player_id;

-- CMS admin: sp@test.com / sptest
do $$
declare
  v_user_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaab01';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token, is_sso_user
  ) values (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'sp@test.com', crypt('sptest', gen_salt('bf')), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"SP Admin"}'::jsonb, now(), now(), '', '', '', '', false
  )
  on conflict (id) do update set
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = now(), updated_at = now();

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'sp@test.com'),
    'email', v_user_id::text, now(), now(), now()
  )
  on conflict (provider_id, provider) do update set
    identity_data = excluded.identity_data, updated_at = now();

  insert into public.profiles (user_id, role, display_name)
  values (v_user_id, 'admin', 'SP Admin')
  on conflict (user_id) do update set role = excluded.role, display_name = excluded.display_name;
end $$;
