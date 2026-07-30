import {
  type GameListItem,
  cacheGames,
  cacheRoster,
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
  home_team_id: string;
  away_team_id: string;
  competition_id?: string;
};

export type RosterPlayer = {
  id: string;
  name: string;
  jerseyNumber: string;
  teamId: string;
};

function gameLabel(home: string, away: string, scheduledAt: string | null) {
  const date = scheduledAt
    ? new Date(scheduledAt).toLocaleString("th-TH", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "ยังไม่กำหนดเวลา";
  return `${home} vs ${away} · ${date}`;
}

function toGameListItem(
  g: GameRow,
  teams: Map<string, TeamRow>,
): GameListItem | null {
  const home = teams.get(g.home_team_id);
  const away = teams.get(g.away_team_id);
  if (!home || !away) return null;
  return {
    id: g.id,
    status: g.status,
    scheduledAt: g.scheduled_at,
    homeTeamId: g.home_team_id,
    awayTeamId: g.away_team_id,
    homeName: home.name,
    awayName: away.name,
    label: gameLabel(home.name, away.name, g.scheduled_at),
  };
}

function mapPlayers(
  rows: Array<{
    id: string;
    display_name: string;
    jersey_number: string | null;
    team_id: string;
  }>,
): RosterPlayer[] {
  return rows.map((p) => ({
    id: p.id,
    name: p.display_name,
    jerseyNumber: p.jersey_number ?? "—",
    teamId: p.team_id,
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

async function prefetchRosters(
  store: LocalStore,
  games: GameListItem[],
): Promise<void> {
  const teamIds = [
    ...new Set(games.flatMap((g) => [g.homeTeamId, g.awayTeamId])),
  ];
  await Promise.all(
    teamIds.map(async (teamId) => {
      try {
        const players = await pullPlayersFromWeb(teamId);
        await cacheRoster(store, teamId, players);
      } catch {
        // keep existing cache for this team
      }
    }),
  );
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
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt?: string | null;
}): Promise<GameListItem> {
  if (input.homeTeamId === input.awayTeamId) {
    throw new Error("ทีมเหย้าและทีมเยือนต้องต่างกัน");
  }
  const competitionId = input.competitionId ?? DEFAULT_COMPETITION_ID;
  const scheduledAt = input.scheduledAt ?? new Date().toISOString();

  const { data, error } = await supabase
    .from("games")
    .insert({
      competition_id: competitionId,
      home_team_id: input.homeTeamId,
      away_team_id: input.awayTeamId,
      scheduled_at: scheduledAt,
      status: "scheduled",
    })
    .select("id, status, scheduled_at, home_team_id, away_team_id")
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
  homeTeamId: string;
  awayTeamId: string;
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

    const { error: insertError } = await supabase.from("games").insert({
      id: input.gameId,
      competition_id: input.competitionId ?? DEFAULT_COMPETITION_ID,
      home_team_id: input.homeTeamId,
      away_team_id: input.awayTeamId,
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
    .select("id, status, scheduled_at, home_team_id, away_team_id")
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .limit(30);

  if (gamesError) {
    const cached = await loadCachedGames(store);
    if (cached.length > 0) return { games: cached, fromCache: true };
    throw gamesError;
  }

  const rows = (games ?? []) as GameRow[];
  const teamIds = [
    ...new Set(rows.flatMap((g) => [g.home_team_id, g.away_team_id])),
  ];

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
  await prefetchRosters(store, list);
  return { games: list, fromCache: false };
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
