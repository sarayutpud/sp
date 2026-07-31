import {
  type GameListItem,
  type OurSide,
  cacheGameRoster,
  cacheGames,
  cacheRoster,
  loadCachedGameRoster,
  loadCachedGames,
  loadCachedRoster,
} from "./game-session";
import type { LocalStore } from "./local-store";
import { supabase } from "./supabase";

export const DEFAULT_COMPETITION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

type TeamRow = { id: string; name: string; short_name: string | null };
type GameRow = {
  id: string;
  status: string;
  scheduled_at: string | null;
  our_team_id: string;
  opponent_name: string;
  our_side: OurSide;
  competition_id?: string;
  home_team_id?: string | null;
  away_team_id?: string | null;
};

export type RosterPlayer = {
  id: string;
  name: string;
  jerseyNumber: string;
  teamId: string;
  isStarter?: boolean;
};

const GAME_SELECT =
  "id, status, scheduled_at, our_team_id, opponent_name, our_side, competition_id, home_team_id, away_team_id";

function gameLabel(
  ourName: string,
  opponent: string,
  ourSide: OurSide,
  scheduledAt: string | null,
) {
  const date = scheduledAt
    ? new Date(scheduledAt).toLocaleString("th-TH", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "ยังไม่กำหนดเวลา";
  const match =
    ourSide === "HOME"
      ? `${ourName} vs ${opponent}`
      : `${opponent} vs ${ourName}`;
  return `${match} · ${date}`;
}

function legacySides(ourTeamId: string, ourSide: OurSide) {
  return {
    home_team_id: ourSide === "HOME" ? ourTeamId : null,
    away_team_id: ourSide === "AWAY" ? ourTeamId : null,
  };
}

function toGameListItem(
  g: GameRow,
  teams: Map<string, TeamRow>,
): GameListItem | null {
  const our = teams.get(g.our_team_id);
  if (!our) return null;
  const ourSide: OurSide = g.our_side === "AWAY" ? "AWAY" : "HOME";
  const opponent = g.opponent_name || "คู่แข่ง";
  return {
    id: g.id,
    status: g.status,
    scheduledAt: g.scheduled_at,
    ourTeamId: g.our_team_id,
    ourTeamName: our.name,
    opponentName: opponent,
    ourSide,
    competitionId: g.competition_id,
    label: gameLabel(our.name, opponent, ourSide, g.scheduled_at),
  };
}

function mapPlayers(
  rows: Array<{
    id: string;
    display_name: string;
    jersey_number: string | null;
    team_id: string;
  }>,
  starterIds?: Set<string>,
): RosterPlayer[] {
  return rows.map((p) => ({
    id: p.id,
    name: p.display_name,
    jerseyNumber: p.jersey_number ?? "—",
    teamId: p.team_id,
    isStarter: starterIds ? starterIds.has(p.id) : undefined,
  }));
}

async function pullPlayersFromWeb(teamId: string): Promise<RosterPlayer[]> {
  const { data, error } = await supabase
    .from("players")
    .select("id, display_name, jersey_number, team_id")
    .eq("team_id", teamId)
    .order("jersey_number");

  if (error) throw error;
  return mapPlayers(
    (data ?? []) as Array<{
      id: string;
      display_name: string;
      jersey_number: string | null;
      team_id: string;
    }>,
  );
}

async function pullGameRosterFromWeb(
  gameId: string,
  ourTeamId: string,
): Promise<RosterPlayer[]> {
  const { data: rosterRows, error } = await supabase
    .from("game_rosters")
    .select("player_id, is_starter, starter_slot")
    .eq("game_id", gameId)
    .order("starter_slot", { ascending: true, nullsFirst: false });

  if (error) throw error;
  const rows = (rosterRows ?? []) as Array<{
    player_id: string;
    is_starter: boolean;
    starter_slot: number | null;
  }>;

  if (rows.length === 0) {
    return pullPlayersFromWeb(ourTeamId);
  }

  const playerIds = rows.map((r) => r.player_id);
  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("id, display_name, jersey_number, team_id")
    .in("id", playerIds);
  if (pErr) throw pErr;

  const byId = new Map(
    (
      (players ?? []) as Array<{
        id: string;
        display_name: string;
        jersey_number: string | null;
        team_id: string;
      }>
    ).map((p) => [p.id, p]),
  );

  const starterIds = new Set(
    rows.filter((r) => r.is_starter).map((r) => r.player_id),
  );

  return rows.flatMap((r) => {
    const p = byId.get(r.player_id);
    if (!p) return [];
    return [
      {
        id: p.id,
        name: p.display_name,
        jerseyNumber: p.jersey_number ?? "—",
        teamId: p.team_id,
        isStarter: starterIds.has(p.id),
      },
    ];
  });
}

export async function fetchTeamsOnline(): Promise<TeamRow[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, short_name")
    .order("name");
  if (error) throw error;
  return (data ?? []) as TeamRow[];
}

export async function createGameOnline(input: {
  competitionId?: string;
  ourTeamId: string;
  opponentName: string;
  ourSide: OurSide;
  scheduledAt?: string | null;
}): Promise<GameListItem> {
  const opponent = input.opponentName.trim();
  if (!opponent) throw new Error("ใส่ชื่อคู่แข่ง");
  const competitionId = input.competitionId ?? DEFAULT_COMPETITION_ID;
  const scheduledAt = input.scheduledAt ?? new Date().toISOString();
  const sides = legacySides(input.ourTeamId, input.ourSide);

  const { data, error } = await supabase
    .from("games")
    .insert({
      competition_id: competitionId,
      our_team_id: input.ourTeamId,
      opponent_name: opponent,
      our_side: input.ourSide,
      ...sides,
      scheduled_at: scheduledAt,
      status: "scheduled",
    })
    .select(GAME_SELECT)
    .single();
  if (error) throw error;

  const game = data as GameRow;
  await supabase.from("game_states").upsert({
    game_id: game.id,
    status: "scheduled",
    period: 1,
    home_attack_side_period1: "LEFT",
  });

  const teams = await fetchTeamsOnline();
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const item = toGameListItem(game, teamMap);
  if (!item) throw new Error("สร้างแมตช์แล้ว แต่โหลดชื่อทีมไม่สำเร็จ");
  return item;
}

/** Ensure game row exists on Supabase before pushing PBP (FK). */
export async function ensureGameOnServer(input: {
  gameId: string;
  ourTeamId: string;
  opponentName: string;
  ourSide: OurSide;
  competitionId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase
      .from("games")
      .select("id")
      .eq("id", input.gameId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (data?.id) return { ok: true };

    const sides = legacySides(input.ourTeamId, input.ourSide);
    const { error: insertError } = await supabase.from("games").insert({
      id: input.gameId,
      competition_id: input.competitionId ?? DEFAULT_COMPETITION_ID,
      our_team_id: input.ourTeamId,
      opponent_name: input.opponentName || "คู่แข่ง",
      our_side: input.ourSide,
      ...sides,
      scheduled_at: new Date().toISOString(),
      status: "live",
    });
    if (insertError) return { ok: false, error: insertError.message };

    await supabase.from("game_states").upsert({
      game_id: input.gameId,
      status: "live",
      period: 1,
      home_attack_side_period1: "LEFT",
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "ensure game failed",
    };
  }
}

export async function fetchGames(
  store: LocalStore,
  online: boolean,
): Promise<{ games: GameListItem[]; fromCache: boolean }> {
  if (!online) {
    return { games: await loadCachedGames(store), fromCache: true };
  }

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select(GAME_SELECT)
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .limit(30);

  if (gamesError) {
    const cached = await loadCachedGames(store);
    if (cached.length > 0) return { games: cached, fromCache: true };
    throw gamesError;
  }

  const rows = (games ?? []) as GameRow[];
  const teamIds = [...new Set(rows.map((g) => g.our_team_id))];

  let teamMap = new Map<string, TeamRow>();
  if (teamIds.length > 0) {
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, short_name")
      .in("id", teamIds);
    if (teamsError) throw teamsError;
    teamMap = new Map(((teams ?? []) as TeamRow[]).map((t) => [t.id, t]));
  }

  const list = rows
    .map((g) => toGameListItem(g, teamMap))
    .filter((g): g is GameListItem => g !== null);

  await cacheGames(store, list);
  await Promise.all(
    list.map(async (g) => {
      try {
        const players = await pullGameRosterFromWeb(g.id, g.ourTeamId);
        await cacheGameRoster(store, g.id, players);
        await cacheRoster(store, g.ourTeamId, players);
      } catch {
        // keep existing cache
      }
    }),
  );
  return { games: list, fromCache: false };
}

export async function fetchGameRosterPlayers(
  store: LocalStore,
  gameId: string,
  ourTeamId: string,
  online: boolean,
): Promise<{ players: RosterPlayer[]; fromCache: boolean }> {
  if (online) {
    try {
      const players = await pullGameRosterFromWeb(gameId, ourTeamId);
      await cacheGameRoster(store, gameId, players);
      await cacheRoster(store, ourTeamId, players);
      return { players, fromCache: false };
    } catch {
      const cached = await loadCachedGameRoster(store, gameId);
      if (cached && cached.players.length > 0) {
        return { players: cached.players, fromCache: true };
      }
      const teamCached = await loadCachedRoster(store, ourTeamId);
      if (teamCached && teamCached.players.length > 0) {
        return { players: teamCached.players, fromCache: true };
      }
      throw new Error("โหลดรายชื่อผู้เล่นไม่สำเร็จ");
    }
  }

  const cached = await loadCachedGameRoster(store, gameId);
  if (cached && cached.players.length > 0) {
    return { players: cached.players, fromCache: true };
  }
  const teamCached = await loadCachedRoster(store, ourTeamId);
  if (teamCached && teamCached.players.length > 0) {
    return { players: teamCached.players, fromCache: true };
  }
  throw new Error("ออฟไลน์ — ยังไม่เคยดึงรายชื่อแมตช์นี้ไว้ ต้องต่อเน็ตครั้งแรก");
}

export async function fetchTeamPlayers(
  store: LocalStore,
  teamId: string,
  online: boolean,
): Promise<{ players: RosterPlayer[]; fromCache: boolean }> {
  if (online) {
    try {
      const players = await pullPlayersFromWeb(teamId);
      await cacheRoster(store, teamId, players);
      return { players, fromCache: false };
    } catch {
      const cached = await loadCachedRoster(store, teamId);
      if (cached && cached.players.length > 0) {
        return { players: cached.players, fromCache: true };
      }
      throw new Error("โหลดรายชื่อผู้เล่นไม่สำเร็จ");
    }
  }

  const cached = await loadCachedRoster(store, teamId);
  if (cached && cached.players.length > 0) {
    return { players: cached.players, fromCache: true };
  }
  throw new Error("ออฟไลน์ — ยังไม่เคยดึงรายชื่อทีมนี้ไว้ ต้องต่อเน็ตครั้งแรก");
}
