import type {
  MatchBoxScore,
  MatchGameMeta,
  MatchPlayerMeta,
  PeriodScoreRow,
} from "@sp/rules-engine";
import { buildMatchBoxScore } from "@sp/rules-engine";
import type { PlayByPlayEvent } from "@sp/shared-types";
import type { GameRow, PbpEvent, Player, Team } from "./types";

export function toPlayByPlayEvents(
  gameId: string,
  events: PbpEvent[],
): PlayByPlayEvent[] {
  return events.map((e, i) => ({
    eventId: e.event_id,
    gameId: e.game_id || gameId,
    period: e.period || 1,
    teamId: e.team_id,
    playerId: e.player_id,
    type: e.type as PlayByPlayEvent["type"],
    hlc: { wallMs: i + 1, logical: i + 1, deviceId: "cms" },
    payload: e.payload ?? {},
  }));
}

export function toMatchPlayers(players: Player[]): MatchPlayerMeta[] {
  return players.map((p) => ({
    id: p.id,
    teamId: p.team_id,
    displayName: p.display_name,
    jerseyNumber: p.jersey_number,
  }));
}

export function teamCode(team: Team | undefined, fallback: string): string {
  return team?.short_name?.trim() || team?.name?.slice(0, 3).toUpperCase() || fallback;
}

export function buildCmsMatchBoxScore(input: {
  game: GameRow;
  events: PbpEvent[];
  players: Player[];
  teams: Team[];
  periodScores?: PeriodScoreRow[];
  tournament?: string;
  venue?: string;
  finalHome?: number;
  finalAway?: number;
}): MatchBoxScore {
  const teamMap = new Map(input.teams.map((t) => [t.id, t]));
  const home = teamMap.get(input.game.home_team_id);
  const away = teamMap.get(input.game.away_team_id);
  const meta: MatchGameMeta = {
    homeTeamId: input.game.home_team_id,
    awayTeamId: input.game.away_team_id,
    homeName: home?.name ?? "Home",
    awayName: away?.name ?? input.game.opponent_name,
    homeCode: teamCode(home, "HOM"),
    awayCode: teamCode(away, "AWY"),
    tournament: input.tournament,
    venue: input.venue,
    gameNo: input.game.id.slice(0, 8),
    scheduledAt: input.game.scheduled_at,
    finalHome: input.finalHome,
    finalAway: input.finalAway,
  };
  return buildMatchBoxScore(
    toPlayByPlayEvents(input.game.id, input.events),
    toMatchPlayers(input.players),
    meta,
    input.periodScores ?? [],
  );
}
