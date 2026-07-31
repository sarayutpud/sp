/**
 * Purge games and related match data (keeps teams/players/auth).
 *
 *   node scripts/purge-match-data.mjs --dry-run
 *   node scripts/purge-match-data.mjs
 *
 * Requires VITE_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY in .env
 */
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });

const dryRun = process.argv.includes("--dry-run");
const URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error("Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES = [
  "play_by_play",
  "box_score_snapshots",
  "on_court",
  "game_rosters",
  "game_period_scores",
  "game_states",
  "game_officials",
  "sync_cursors",
  "games",
];

async function countRows(table) {
  const { count, error } = await sb
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    if (error.code === "42P01" || /does not exist|relation/i.test(error.message)) {
      return 0;
    }
    throw error;
  }
  return count ?? 0;
}

async function deleteAll(table) {
  // Prefer delete with a filter that matches all rows (uuid not null / true)
  const { error } = await sb.from(table).delete().neq(
    table === "sync_cursors" ? "device_id" : table === "on_court" ? "game_id" : "id",
    "00000000-0000-0000-0000-000000000000",
  );
  if (error) {
    // Fallback for tables without `id`
    const { error: err2 } = await sb.from(table).delete().gte("created_at", "1970-01-01");
    if (err2) throw err2;
  }
}

async function main() {
  console.log(dryRun ? "DRY RUN — counts only" : "PURGING match data…");
  const counts = {};
  for (const t of TABLES) {
    counts[t] = await countRows(t);
    console.log(`  ${t}: ${counts[t]}`);
  }

  const { count: devices } = await sb
    .from("device_registry")
    .select("*", { count: "exact", head: true })
    .not("game_id", "is", null);
  console.log(`  device_registry (with game_id): ${devices ?? 0}`);

  if (dryRun) {
    console.log("Done (no deletes).");
    return;
  }

  for (const t of [
    "play_by_play",
    "box_score_snapshots",
    "on_court",
    "game_rosters",
    "game_period_scores",
    "game_states",
    "game_officials",
    "sync_cursors",
  ]) {
    try {
      await deleteAll(t);
      console.log(`deleted ${t}`);
    } catch (e) {
      console.warn(`skip/fail ${t}:`, e.message ?? e);
    }
  }

  await sb.from("device_registry").update({ game_id: null }).not("game_id", "is", null);
  await deleteAll("games");
  console.log("deleted games");
  console.log("Purge complete. Re-seed with supabase/seed.sql or pnpm seed if needed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
