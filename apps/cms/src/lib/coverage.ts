import type { PbpEvent } from "./types";

export type EventCoverage = {
  types: Set<string>;
  hasShot: boolean;
  hasFoul: boolean;
  hasFt: boolean;
  hasReb: boolean;
  hasTo: boolean;
  hasAst: boolean;
  hasSub: boolean;
  missingLabels: string[];
};

export function analyzeEventCoverage(
  events: PbpEvent[],
  teamFilter?: string,
): EventCoverage {
  const filtered = teamFilter
    ? events.filter((e) => !e.team_id || e.team_id === teamFilter)
    : events;
  const types = new Set(filtered.map((e) => e.type));
  const checks: Array<[string, string]> = [
    ["SHOT", "ช็อต"],
    ["FOUL", "ฟาล์ว"],
    ["FT", "ฟรีโธรว์"],
    ["REB", "รีบาวด์"],
    ["TO", "เทิร์นโอเวอร์"],
    ["AST", "แอสซิสต์"],
    ["SUB", "เปลี่ยนตัว"],
  ];
  const missingLabels = checks
    .filter(([t]) => !types.has(t))
    .map(([, label]) => label);

  return {
    types,
    hasShot: types.has("SHOT"),
    hasFoul: types.has("FOUL"),
    hasFt: types.has("FT"),
    hasReb: types.has("REB"),
    hasTo: types.has("TO"),
    hasAst: types.has("AST"),
    hasSub: types.has("SUB"),
    missingLabels,
  };
}

export type SeasonPlayerLine = {
  playerId: string;
  playerName: string;
  jersey: string;
  games: number;
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
};

/** Aggregate box lines across multiple games for one team. */
export function mergeSeasonLines(
  linesByGame: Array<
    Array<{
      playerId: string;
      playerName: string;
      jersey: string;
      pts: number;
      fgm: number;
      fga: number;
      tpm: number;
      tpa: number;
      ftm: number;
      fta: number;
      reb: number;
      ast: number;
      stl: number;
      blk: number;
      tov: number;
      pf: number;
    }>
  >,
): SeasonPlayerLine[] {
  const map = new Map<string, SeasonPlayerLine>();
  for (const lines of linesByGame) {
    const seen = new Set<string>();
    for (const l of lines) {
      let row = map.get(l.playerId);
      if (!row) {
        row = {
          playerId: l.playerId,
          playerName: l.playerName,
          jersey: l.jersey,
          games: 0,
          pts: 0,
          fgm: 0,
          fga: 0,
          tpm: 0,
          tpa: 0,
          ftm: 0,
          fta: 0,
          reb: 0,
          ast: 0,
          stl: 0,
          blk: 0,
          tov: 0,
          pf: 0,
        };
        map.set(l.playerId, row);
      }
      if (!seen.has(l.playerId)) {
        row.games += 1;
        seen.add(l.playerId);
      }
      row.pts += l.pts;
      row.fgm += l.fgm;
      row.fga += l.fga;
      row.tpm += l.tpm;
      row.tpa += l.tpa;
      row.ftm += l.ftm;
      row.fta += l.fta;
      row.reb += l.reb;
      row.ast += l.ast;
      row.stl += l.stl;
      row.blk += l.blk;
      row.tov += l.tov;
      row.pf += l.pf;
    }
  }
  return [...map.values()].sort((a, b) => b.pts - a.pts);
}
