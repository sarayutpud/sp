import { resolve } from "node:path";
/**
 * Seed default SP data for CMS login + Courtside sync.
 *
 * Prerequisites:
 *   1. Add SUPABASE_SERVICE_ROLE_KEY to .env (Dashboard → Settings → API → service_role)
 *   2. Run: pnpm seed
 *
 * Creates:
 *   - User sp@test.com / sptest (admin profile)
 *   - Home team with 7 players (5 starters + 2 bench)
 *   - Away team with 5 players
 *   - Competition roster links + demo live game
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });

const URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SEED = {
  email: "sp@test.com",
  password: "sptest",
  orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  rulesetId: "00000000-0000-4000-8000-000000000001",
  competitionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  venueId: "44444444-4444-4444-8444-444444444401",
  homeTeamId: "33333333-3333-4333-8333-333333333301",
  awayTeamId: "33333333-3333-4333-8333-333333333302",
  gameId: "22222222-2222-4222-8222-222222222201",
  homePlayers: [
    {
      id: "11111111-1111-4111-8111-111111111101",
      name: "วิชัย",
      no: "11",
      starter: true,
    },
    {
      id: "11111111-1111-4111-8111-111111111102",
      name: "อาทิตย์",
      no: "7",
      starter: true,
    },
    {
      id: "11111111-1111-4111-8111-111111111103",
      name: "กิตติ",
      no: "23",
      starter: true,
    },
    {
      id: "11111111-1111-4111-8111-111111111104",
      name: "ณัฐ",
      no: "5",
      starter: true,
    },
    {
      id: "11111111-1111-4111-8111-111111111105",
      name: "สมชาย",
      no: "9",
      starter: true,
    },
    {
      id: "11111111-1111-4111-8111-111111111106",
      name: "พงศ์",
      no: "15",
      starter: false,
    },
    {
      id: "11111111-1111-4111-8111-111111111107",
      name: "ธนา",
      no: "3",
      starter: false,
    },
  ],
  awayPlayers: [
    { id: "11111111-1111-4111-8111-111111111201", name: "สุรชัย", no: "4" },
    { id: "11111111-1111-4111-8111-111111111202", name: "มานะ", no: "8" },
    { id: "11111111-1111-4111-8111-111111111203", name: "ปกรณ์", no: "12" },
    { id: "11111111-1111-4111-8111-111111111204", name: "เอก", no: "21" },
    { id: "11111111-1111-4111-8111-111111111205", name: "บาส", no: "1" },
  ],
};

function fail(step, error) {
  console.error(`\n[seed] ${step} failed:`, error?.message ?? error);
  process.exit(1);
}

async function ensureUser(admin) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) fail("list users", listError);

  const existing = listed.users.find(
    (u) => u.email?.toLowerCase() === SEED.email.toLowerCase(),
  );

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: SEED.password,
      email_confirm: true,
    });
    if (error) fail("update user", error);
    console.log(`[seed] user exists — password reset: ${SEED.email}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: SEED.email,
    password: SEED.password,
    email_confirm: true,
    user_metadata: { display_name: "SP Admin" },
  });
  if (error) fail("create user", error);
  console.log(`[seed] user created: ${SEED.email}`);
  return data.user.id;
}

async function upsert(db, table, rows, onConflict) {
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) fail(`upsert ${table}`, error);
}

async function main() {
  if (!URL || !SERVICE_KEY) {
    console.error(
      "Missing VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in .env",
    );
    console.error(
      "Get service_role from Supabase Dashboard → Project Settings → API",
    );
    process.exit(1);
  }

  const db = createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[seed] SP default data →", URL);

  const userId = await ensureUser(db);

  await upsert(
    db,
    "organizations",
    [{ id: SEED.orgId, name: "SP FITNESS BANG SUE" }],
    "id",
  );
  await upsert(
    db,
    "rulesets",
    [{ id: SEED.rulesetId, name: "FIBA Full Court" }],
    "id",
  );
  await upsert(
    db,
    "competitions",
    [
      {
        id: SEED.competitionId,
        organization_id: SEED.orgId,
        ruleset_id: SEED.rulesetId,
        name: "SP Demo League",
        season: "2026",
      },
    ],
    "id",
  );
  await upsert(
    db,
    "venues",
    [{ id: SEED.venueId, name: "SP Arena Bang Sue", city: "Bangkok" }],
    "id",
  );
  await upsert(
    db,
    "teams",
    [
      {
        id: SEED.homeTeamId,
        organization_id: SEED.orgId,
        name: "SP Fitness",
        short_name: "SPF",
      },
      {
        id: SEED.awayTeamId,
        organization_id: SEED.orgId,
        name: "Away Arrows",
        short_name: "AA",
      },
    ],
    "id",
  );

  const homePlayerRows = SEED.homePlayers.map((p) => ({
    id: p.id,
    team_id: SEED.homeTeamId,
    display_name: p.name,
    jersey_number: p.no,
  }));
  const awayPlayerRows = SEED.awayPlayers.map((p) => ({
    id: p.id,
    team_id: SEED.awayTeamId,
    display_name: p.name,
    jersey_number: p.no,
  }));
  await upsert(db, "players", [...homePlayerRows, ...awayPlayerRows], "id");

  const rosterRows = [
    ...SEED.homePlayers.map((p) => ({
      competition_id: SEED.competitionId,
      team_id: SEED.homeTeamId,
      player_id: p.id,
      jersey_number: p.no,
    })),
    ...SEED.awayPlayers.map((p) => ({
      competition_id: SEED.competitionId,
      team_id: SEED.awayTeamId,
      player_id: p.id,
      jersey_number: p.no,
    })),
  ];
  await upsert(db, "rosters", rosterRows, "competition_id,team_id,player_id");

  const scheduledAt = new Date();
  scheduledAt.setHours(scheduledAt.getHours() + 2);

  await upsert(
    db,
    "games",
    [
      {
        id: SEED.gameId,
        competition_id: SEED.competitionId,
        venue_id: SEED.venueId,
        our_team_id: SEED.homeTeamId,
        opponent_name: "Away Arrows",
        our_side: "HOME",
        home_team_id: SEED.homeTeamId,
        away_team_id: null,
        scheduled_at: scheduledAt.toISOString(),
        status: "scheduled",
        roster_locked: false,
      },
    ],
    "id",
  );
  await upsert(
    db,
    "game_states",
    [
      {
        game_id: SEED.gameId,
        status: "scheduled",
        period: 1,
        home_attack_side_period1: "LEFT",
      },
    ],
    "game_id",
  );

  const starters = SEED.homePlayers.filter((p) => p.starter);
  const onCourtRows = starters.map((p, i) => ({
    game_id: SEED.gameId,
    team_id: SEED.homeTeamId,
    player_id: p.id,
    slot: i + 1,
  }));
  await upsert(db, "on_court", onCourtRows, "game_id,team_id,slot");

  const gameRosterRows = SEED.homePlayers.map((p, i) => {
    const starterIndex = starters.findIndex((s) => s.id === p.id);
    return {
      game_id: SEED.gameId,
      player_id: p.id,
      is_starter: starterIndex >= 0,
      starter_slot: starterIndex >= 0 ? starterIndex + 1 : null,
    };
  });
  await upsert(db, "game_rosters", gameRosterRows, "game_id,player_id");

  await upsert(
    db,
    "profiles",
    [
      {
        user_id: userId,
        role: "admin",
        display_name: "SP Admin",
      },
    ],
    "user_id",
  );

  console.log("\n[seed] done");
  console.log("  CMS login :", SEED.email, "/", SEED.password);
  console.log("  Game ID   :", SEED.gameId);
  console.log("  Home team :", "SP Fitness — 7 players (5 ตัวจริง + 2 สำรอง)");
  console.log(
    "  Starters  :",
    starters.map((p) => `${p.no} ${p.name}`).join(", "),
  );
  console.log(
    "  Bench     :",
    SEED.homePlayers
      .filter((p) => !p.starter)
      .map((p) => `${p.no} ${p.name}`)
      .join(", "),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
