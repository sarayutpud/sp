import { metersFromBasket } from "@sp/rules-engine";
import type { ShotDot } from "@sp/ui";
import type { PbpEvent, Player } from "./types";

/** Extra payload fields carried by non-shot events. */
type EventPayload = {
  made?: boolean;
  isThree?: boolean;
  x?: number;
  y?: number;
  basketSide?: "LEFT" | "RIGHT";
  countsAsFga?: boolean;
  kind?: string;
};

export type FullBoxLine = {
  playerId: string;
  playerName: string;
  jersey: string;
  teamId: string;
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
};

function blankLine(
  playerId: string,
  meta: Player | undefined,
  teamId: string,
): FullBoxLine {
  return {
    playerId,
    playerName: meta?.display_name ?? playerId.slice(0, 8),
    jersey: meta?.jersey_number ?? "—",
    teamId: meta?.team_id ?? teamId,
    pts: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    oreb: 0,
    dreb: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    tov: 0,
    pf: 0,
  };
}

/** Traditional box score aggregated per player from the play-by-play stream. */
export function buildFullBoxScore(
  events: PbpEvent[],
  players: Player[],
  teamFilter?: string,
): FullBoxLine[] {
  const meta = new Map(players.map((p) => [p.id, p]));
  const lines = new Map<string, FullBoxLine>();

  const lineFor = (playerId: string, teamId: string) => {
    let line = lines.get(playerId);
    if (!line) {
      line = blankLine(playerId, meta.get(playerId), teamId);
      lines.set(playerId, line);
    }
    return line;
  };

  for (const e of events) {
    if (teamFilter && e.team_id && e.team_id !== teamFilter) continue;
    if (!e.player_id) continue;
    const p = e.payload as EventPayload;
    const line = lineFor(e.player_id, e.team_id ?? "");

    switch (e.type) {
      case "SHOT": {
        if (p.countsAsFga !== false) {
          line.fga += 1;
          if (p.isThree) line.tpa += 1;
          if (p.made) {
            line.fgm += 1;
            if (p.isThree) {
              line.tpm += 1;
              line.pts += 3;
            } else {
              line.pts += 2;
            }
          }
        }
        break;
      }
      case "FT": {
        line.fta += 1;
        if (p.made) {
          line.ftm += 1;
          line.pts += 1;
        }
        break;
      }
      case "REB": {
        if (p.kind === "OFFENSIVE") line.oreb += 1;
        else line.dreb += 1;
        line.reb = line.oreb + line.dreb;
        break;
      }
      case "AST":
        line.ast += 1;
        break;
      case "STL":
        line.stl += 1;
        break;
      case "BLK":
        line.blk += 1;
        break;
      case "TO":
        line.tov += 1;
        break;
      case "FOUL":
        line.pf += 1;
        break;
      default:
        break;
    }
  }

  return [...lines.values()].sort((a, b) => b.pts - a.pts);
}

export function sumBoxLines(lines: FullBoxLine[]): FullBoxLine | null {
  if (lines.length === 0) return null;
  const tot = blankLine("team", undefined, lines[0]?.teamId ?? "");
  tot.playerName = "รวมทีม";
  for (const l of lines) {
    tot.pts += l.pts;
    tot.fgm += l.fgm;
    tot.fga += l.fga;
    tot.tpm += l.tpm;
    tot.tpa += l.tpa;
    tot.ftm += l.ftm;
    tot.fta += l.fta;
    tot.oreb += l.oreb;
    tot.dreb += l.dreb;
    tot.reb += l.reb;
    tot.ast += l.ast;
    tot.stl += l.stl;
    tot.blk += l.blk;
    tot.tov += l.tov;
    tot.pf += l.pf;
  }
  return tot;
}

type TeamAgg = {
  pts: number;
  fga: number;
  fgm: number;
  tpm: number;
  fta: number;
  oreb: number;
  tov: number;
};

function aggregateTeam(events: PbpEvent[], teamId: string): TeamAgg {
  const agg: TeamAgg = {
    pts: 0,
    fga: 0,
    fgm: 0,
    tpm: 0,
    fta: 0,
    oreb: 0,
    tov: 0,
  };
  for (const e of events) {
    if (e.team_id !== teamId) continue;
    const p = e.payload as EventPayload;
    switch (e.type) {
      case "SHOT":
        if (p.countsAsFga !== false) {
          agg.fga += 1;
          if (p.made) {
            agg.fgm += 1;
            if (p.isThree) {
              agg.tpm += 1;
              agg.pts += 3;
            } else {
              agg.pts += 2;
            }
          }
        }
        break;
      case "FT":
        agg.fta += 1;
        if (p.made) agg.pts += 1;
        break;
      case "REB":
        if (p.kind === "OFFENSIVE") agg.oreb += 1;
        break;
      case "TO":
        agg.tov += 1;
        break;
      default:
        break;
    }
  }
  return agg;
}

/** Estimated possessions: FGA − OREB + TOV + 0.44·FTA */
function possessions(a: TeamAgg): number {
  return a.fga - a.oreb + a.tov + 0.44 * a.fta;
}

export type TeamAdvanced = {
  pts: number;
  poss: number;
  offRtg: number | null;
  defRtg: number | null;
  netRtg: number | null;
  pace: number | null;
  efg: number | null;
  tovPct: number | null;
};

/**
 * Advanced team metrics. Ratings are points per 100 possessions; pace is the
 * average possessions used by both teams (FIBA 40-minute game).
 */
export function buildTeamAdvanced(
  events: PbpEvent[],
  teamId: string,
  oppTeamId: string,
): TeamAdvanced {
  const team = aggregateTeam(events, teamId);
  const opp = aggregateTeam(events, oppTeamId);
  const poss = possessions(team);
  const oppPoss = possessions(opp);
  const offRtg = poss > 0 ? (100 * team.pts) / poss : null;
  const defRtg = oppPoss > 0 ? (100 * opp.pts) / oppPoss : null;
  return {
    pts: team.pts,
    poss,
    offRtg,
    defRtg,
    netRtg: offRtg !== null && defRtg !== null ? offRtg - defRtg : null,
    pace: poss > 0 || oppPoss > 0 ? (poss + oppPoss) / 2 : null,
    efg: team.fga > 0 ? (team.fgm + 0.5 * team.tpm) / team.fga : null,
    tovPct: poss > 0 ? team.tov / poss : null,
  };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Normalize recorded shots to a single attacking half court for plotting. */
export function buildShotMarkers(
  events: PbpEvent[],
  teamFilter?: string,
): ShotDot[] {
  const dots: ShotDot[] = [];
  for (const e of events) {
    if (e.type !== "SHOT") continue;
    if (teamFilter && e.team_id && e.team_id !== teamFilter) continue;
    const p = e.payload as EventPayload;
    if (p.x == null || p.y == null || !p.basketSide) continue;
    if (p.countsAsFga === false) continue;
    const px = p.x * 28;
    const py = p.y * 15;
    const half = p.basketSide === "LEFT" ? px : 28 - px;
    const across = p.basketSide === "LEFT" ? py : 15 - py;
    dots.push({
      vx: clamp01(half / 14),
      vy: clamp01(across / 15),
      made: !!p.made,
      isThree: !!p.isThree,
    });
  }
  return dots;
}

/** Distance summary for the shot-chart footer (uses shared court geometry). */
export function shotDistanceSplit(events: PbpEvent[], teamFilter?: string) {
  let near = 0;
  let far = 0;
  for (const e of events) {
    if (e.type !== "SHOT" || !e.player_id) continue;
    if (teamFilter && e.team_id && e.team_id !== teamFilter) continue;
    const p = e.payload as EventPayload;
    if (p.x == null || p.y == null || !p.basketSide) continue;
    const { distanceM } = metersFromBasket({ x: p.x, y: p.y }, p.basketSide);
    if (distanceM < 4) near += 1;
    else far += 1;
  }
  return { near, far };
}
