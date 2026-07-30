import type { LocalStore } from "./local-store";
import {
  cacheGames,
  cacheRoster,
  type GameListItem,
  loadCachedGames,
  loadCachedRoster,
} from "./game-session";
import { supabase } from "./supabase";

type TeamRow = { id: string; name: string; short_name: string | null };
type GameRow = {
  id: string;
  status: string;
  scheduled_at: string | null;
  home_team_id: string;
  away_team_id: string;
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

/** Prefetch rosters for all teams in the game list while online */
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

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, short_name")
    .in("id", teamIds);

  if (teamsError) throw teamsError;

  const teamMap = new Map(
    ((teams ?? []) as TeamRow[]).map((t) => [t.id, t]),
  );
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
