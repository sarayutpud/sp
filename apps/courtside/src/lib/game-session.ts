import type { BasketSide } from "@sp/shared-types";
import type { LocalStore } from "./local-store";

export type OnCourtPlayer = {
  id: string;
  name: string;
  jerseyNumber: string;
  fouls: number;
};

function normalizePlayer(p: OnCourtPlayer): OnCourtPlayer {
  if (p.jerseyNumber) {
    return { ...p, jerseyNumber: String(p.jerseyNumber), name: p.name };
  }
  const m = p.name.match(/^(\S+)\s+(.+)$/);
  if (m?.[1] && m[2]) {
    return { id: p.id, jerseyNumber: m[1], name: m[2], fouls: p.fouls };
  }
  return { ...p, jerseyNumber: "—", name: p.name };
}

export type ActiveGameSession = {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  /** Team we record stats for (our team only) */
  ourTeamId: string;
  competitionId?: string;
  label: string;
  onCourt: OnCourtPlayer[];
  bench: OnCourtPlayer[];
  period: number;
  homeAttackSide: BasketSide;
  ourTeamFoulsPeriod: number;
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

function normalizeSession(raw: ActiveGameSession): ActiveGameSession {
  return {
    ...raw,
    ourTeamId: raw.ourTeamId ?? raw.homeTeamId,
    bench: (raw.bench ?? []).map(normalizePlayer),
    onCourt: (raw.onCourt ?? []).map(normalizePlayer),
    ourTeamFoulsPeriod: raw.ourTeamFoulsPeriod ?? 0,
  };
}

export async function loadSession(
  store: LocalStore,
): Promise<ActiveGameSession | null> {
  const raw = await store.getMeta(SESSION_KEY);
  if (!raw) return null;
  try {
    return normalizeSession(JSON.parse(raw) as ActiveGameSession);
  } catch {
    return null;
  }
}

export async function saveSession(
  store: LocalStore,
  session: ActiveGameSession,
): Promise<void> {
  await store.setMeta(SESSION_KEY, JSON.stringify(normalizeSession(session)));
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

export function bumpPlayerFoul(
  session: ActiveGameSession,
  playerId: string,
): ActiveGameSession {
  const onCourt = session.onCourt.map((p) =>
    p.id === playerId ? { ...p, fouls: p.fouls + 1 } : p,
  );
  const bench = session.bench.map((p) =>
    p.id === playerId ? { ...p, fouls: p.fouls + 1 } : p,
  );
  return {
    ...session,
    onCourt,
    bench,
    ourTeamFoulsPeriod: session.ourTeamFoulsPeriod + 1,
  };
}

export function applySub(
  session: ActiveGameSession,
  playerOutId: string,
  playerInId: string,
): ActiveGameSession {
  const out = session.onCourt.find((p) => p.id === playerOutId);
  const inn = session.bench.find((p) => p.id === playerInId);
  if (!out || !inn) return session;
  return {
    ...session,
    onCourt: session.onCourt.map((p) => (p.id === playerOutId ? inn : p)),
    bench: session.bench.map((p) => (p.id === playerInId ? out : p)),
  };
}

export function endPeriod(session: ActiveGameSession): ActiveGameSession {
  return {
    ...session,
    period: session.period + 1,
    ourTeamFoulsPeriod: 0,
  };
}
