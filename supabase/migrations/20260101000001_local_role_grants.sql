-- Local-dev role grants for the Supabase CLI stack.
-- Mirrors Supabase's hosted default: broad table privileges are granted to the
-- anon/authenticated/service_role roles and access is actually enforced by the
-- RLS policies defined in the baseline schema. On the hosted project these
-- grants come from Supabase's default privileges (schema.sql was run in the SQL
-- Editor as the postgres role); this migration reproduces that for `supabase start`.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
