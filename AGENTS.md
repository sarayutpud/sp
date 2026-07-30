# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
pnpm + turbo monorepo (Node 22, pnpm 9.15.0). Two frontends and shared packages, all talking **directly to Supabase** (no separate API server):
- `apps/cms` (`@sp/cms`) — Vite + React web app (competition CMS: players, rosters, coach reports). Primary runnable product in the cloud VM.
- `apps/courtside` (`@sp/courtside`) — Tauri 2 desktop app (offline-first live stats). Full desktop run needs `tauri:dev` (Rust + platform webview; the app targets Windows). Its plain Vite web dev (`pnpm --filter @sp/courtside dev`) boots for UI work but Tauri-only plugins (SQLite) won't function in a browser.
- `packages/*` — `shared-types` (zod), `rules-engine`, `sync-protocol`, `ui`.

### Standard commands (see root `package.json` / `turbo.json`)
- `pnpm dev` / `pnpm build` / `pnpm test` / `pnpm typecheck` / `pnpm lint`
- Run a single app dev server: `pnpm --filter @sp/cms dev` (port 5173).
- Tests live in `rules-engine` and `sync-protocol` (vitest); the apps have no tests yet.
- `pnpm typecheck` and `pnpm build` depend on `^build`, so shared packages must be built first (turbo handles this). Vite dev of the apps resolves `@sp/*` to source via aliases, so it does not require a prior build.

### Backend: local Supabase (self-contained, no secrets needed)
The apps require a Supabase backend. For the cloud VM there is a fully local option using the Supabase CLI (Docker-based) — no hosted keys required.

- Docker is installed but there is **no systemd**; start the daemon once per session before using Supabase:
  `sudo nohup dockerd > /tmp/dockerd.log 2>&1 &` (daemon is preconfigured for `fuse-overlayfs` + `iptables-legacy`, and Docker 29 has `containerd-snapshotter` disabled in `/etc/docker/daemon.json` so fuse-overlayfs works).
- Start the stack from repo root: `supabase start` (API on `http://127.0.0.1:54321`, Studio on `54323`). Use `supabase status` to print keys, `supabase db reset` to re-apply migrations + seed.
- `supabase/migrations/` contains a **baseline schema migration** (copy of `supabase/schema.sql`) plus a **local role-grants migration**. These exist so `supabase start` applies the schema before `supabase/seed.sql` runs, and so the `anon`/`authenticated` roles get the table grants that hosted Supabase provides by default (RLS still enforces access). Without them the CLI's auto-seed fails and tears the stack down. They only affect local CLI dev; the team deploys against an already-migrated hosted project.
- Seed creates a ready CMS login: **`sp@test.com` / `sptest`** plus demo teams/players/games.

### Pointing the apps at a backend
Vite reads env from the **repo-root `.env`** (`apps/*/vite.config.ts` set `envDir` to the root). `.env` is gitignored. Required keys: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`). For local Supabase use the `API_URL` and `ANON_KEY` from `supabase status`. The `scripts/seed-default-data.mjs` (`pnpm seed`) also reads `SUPABASE_SERVICE_ROLE_KEY` from `.env` (only needed against a hosted project; the local `seed.sql` already creates the user).
