import type { BasketSide } from "@sp/shared-types";
import type { LocalStore } from "./local-store";

export type OnCourtPlayer = {
  id: string;
  name: string;
  fouls: number;
};

export type ActiveGameSession = {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  label: string;
  onCourt: OnCourtPlayer[];
  period: number;
  homeAttackSide: BasketSide;
};

export type GameListItem = {
  id: string;
  status: string;
  scheduledAt: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeName: string;
  awayName: string;
  label: string;
};

const SESSION_KEY = "active_game_session";
const GAMES_CACHE_KEY = "games_cache";
const ROSTER_CACHE_KEY = "roster_cache";

export type CachedRoster = {
  teamId: string;
  players: Array<{
    id: string;
    name: string;
    jerseyNumber: string;
    teamId: string;
  }>;
  cachedAt: string;
};

export async function loadSession(
  store: LocalStore,
): Promise<ActiveGameSession | null> {
  const raw = await store.getMeta(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveGameSession;
  } catch {
    return null;
  }
}

export async function saveSession(
  store: LocalStore,
  session: ActiveGameSession,
): Promise<void> {
  await store.setMeta(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(store: LocalStore): Promise<void> {
  await store.setMeta(SESSION_KEY, "");
}

export async function cacheGames(
  store: LocalStore,
  games: GameListItem[],
): Promise<void> {
  await store.setMeta(
    GAMES_CACHE_KEY,
    JSON.stringify({ cachedAt: new Date().toISOString(), games }),
  );
}

export async function loadCachedGames(
  store: LocalStore,
): Promise<GameListItem[]> {
  const raw = await store.getMeta(GAMES_CACHE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { games?: GameListItem[] };
    return parsed.games ?? [];
  } catch {
    return [];
  }
}

export async function cacheRoster(
  store: LocalStore,
  teamId: string,
  players: CachedRoster["players"],
): Promise<void> {
  const raw = await store.getMeta(ROSTER_CACHE_KEY);
  let map: Record<string, CachedRoster> = {};
  if (raw) {
    try {
      map = JSON.parse(raw) as Record<string, CachedRoster>;
    } catch {
      map = {};
    }
  }
  map[teamId] = {
    teamId,
    players,
    cachedAt: new Date().toISOString(),
  };
  await store.setMeta(ROSTER_CACHE_KEY, JSON.stringify(map));
}

export async function loadCachedRoster(
  store: LocalStore,
  teamId: string,
): Promise<CachedRoster | null> {
  const raw = await store.getMeta(ROSTER_CACHE_KEY);
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as Record<string, CachedRoster>;
    return map[teamId] ?? null;
  } catch {
    return null;
  }
}
