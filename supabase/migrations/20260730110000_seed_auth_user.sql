-- Default CMS admin user (email confirmed, no signup required)
-- Password: sptest

do $$
declare
  v_user_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaab01';
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_sso_user
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sp@test.com',
    crypt('sptest', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"SP Admin"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  )
  on conflict (id) do update set
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = now(),
    updated_at = now();

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'sp@test.com'),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do update set
    identity_data = excluded.identity_data,
    updated_at = now();

  insert into public.profiles (user_id, role, display_name)
  values (v_user_id, 'admin', 'SP Admin')
  on conflict (user_id) do update set
    role = excluded.role,
    display_name = excluded.display_name;
end $$;
