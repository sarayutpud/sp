import type { PlayByPlayEvent } from "@sp/shared-types";

export type MadeAtt = { made: number; att: number };
export type RebSplit = { off: number; def: number; tot: number };

export type BoxScorePlayerLine = {
  playerId: string | null;
  no: string;
  name: string;
  min: string | null;
  fg2: MadeAtt;
  fg3: MadeAtt;
  ft: MadeAtt;
  reb: RebSplit;
  ast: number;
  st: number;
  blk: number;
  to: number;
  pf: number;
  pts: number;
};

export type TeamBoxTotals = {
  fg2: MadeAtt;
  fg3: MadeAtt;
  ft: MadeAtt;
  reb: RebSplit;
  ast: number;
  st: number;
  blk: number;
  to: number;
  pf: number;
  pts: number;
};

export type TeamBoxScore = {
  teamId: string;
  code: string;
  name: string;
  players: BoxScorePlayerLine[];
  teamTotals: TeamBoxTotals;
};

export type QuarterScore = {
  period: number;
  home: number;
  away: number;
  homeCum: number;
  awayCum: number;
};

export type MatchBoxMeta = {
  tournament?: string;
  date?: string;
  tipOff?: string;
  venue?: string;
  gameNo?: string;
  homeCode: string;
  awayCode: string;
  homeName: string;
  awayName: string;
  finalHome: number;
  finalAway: number;
};

export type MatchAdvanced = {
  pointsFromTurnovers?: { home: number; away: number };
  pointsInThePaint?: { home: number; away: number };
  secondChancePoints?: { home: number; away: number };
  fastBreakPoints?: { home: number; away: number };
  benchPoints?: { home: number; away: number };
  biggestLead?: { home: number; away: number };
};

export type MatchBoxScore = {
  meta: MatchBoxMeta;
  byQuarter: QuarterScore[];
  home: TeamBoxScore;
  away: TeamBoxScore;
  advanced?: MatchAdvanced;
};

export type PeriodScoreRow = {
  period: number;
  homePoints: number;
  awayPoints: number;
};

export type MatchPlayerMeta = {
  id: string;
  teamId: string;
  displayName: string;
  jerseyNumber: string | null;
};

export type MatchGameMeta = {
  homeTeamId: string;
  awayTeamId: string;
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  tournament?: string;
  venue?: string;
  gameNo?: string;
  scheduledAt?: string | null;
  finalHome?: number;
  finalAway?: number;
};

type EventPayload = {
  made?: boolean;
  isThree?: boolean;
  countsAsFga?: boolean;
  kind?: string;
  inPaint?: boolean;
  secondChance?: boolean;
  fastBreak?: boolean;
  fromTurnover?: boolean;
};

function blankLine(
  playerId: string | null,
  no: string,
  name: string,
): BoxScorePlayerLine {
  return {
    playerId,
    no,
    name,
    min: null,
    fg2: { made: 0, att: 0 },
    fg3: { made: 0, att: 0 },
    ft: { made: 0, att: 0 },
    reb: { off: 0, def: 0, tot: 0 },
    ast: 0,
    st: 0,
    blk: 0,
    to: 0,
    pf: 0,
    pts: 0,
  };
}

function blankTotals(): TeamBoxTotals {
  return {
    fg2: { made: 0, att: 0 },
    fg3: { made: 0, att: 0 },
    ft: { made: 0, att: 0 },
    reb: { off: 0, def: 0, tot: 0 },
    ast: 0,
    st: 0,
    blk: 0,
    to: 0,
    pf: 0,
    pts: 0,
  };
}

function addMadeAtt(a: MadeAtt, b: MadeAtt): MadeAtt {
  return { made: a.made + b.made, att: a.att + b.att };
}

function sumPlayers(players: BoxScorePlayerLine[]): TeamBoxTotals {
  const t = blankTotals();
  for (const p of players) {
    t.fg2 = addMadeAtt(t.fg2, p.fg2);
    t.fg3 = addMadeAtt(t.fg3, p.fg3);
    t.ft = addMadeAtt(t.ft, p.ft);
    t.reb.off += p.reb.off;
    t.reb.def += p.reb.def;
    t.reb.tot += p.reb.tot;
    t.ast += p.ast;
    t.st += p.st;
    t.blk += p.blk;
    t.to += p.to;
    t.pf += p.pf;
    t.pts += p.pts;
  }
  return t;
}

function applyEvent(line: BoxScorePlayerLine, type: string, p: EventPayload) {
  switch (type) {
    case "SHOT": {
      if (p.countsAsFga !== false) {
        if (p.isThree) {
          line.fg3.att += 1;
          if (p.made) {
            line.fg3.made += 1;
            line.pts += 3;
          }
        } else {
          line.fg2.att += 1;
          if (p.made) {
            line.fg2.made += 1;
            line.pts += 2;
          }
        }
      }
      break;
    }
    case "FT": {
      line.ft.att += 1;
      if (p.made) {
        line.ft.made += 1;
        line.pts += 1;
      }
      break;
    }
    case "REB": {
      if (p.kind === "OFFENSIVE") line.reb.off += 1;
      else line.reb.def += 1;
      line.reb.tot = line.reb.off + line.reb.def;
      break;
    }
    case "AST":
      line.ast += 1;
      break;
    case "STL":
      line.st += 1;
      break;
    case "BLK":
      line.blk += 1;
      break;
    case "TO":
      line.to += 1;
      break;
    case "FOUL":
      line.pf += 1;
      break;
    default:
      break;
  }
}

function teamBoxFromEvents(
  teamId: string,
  code: string,
  name: string,
  events: PlayByPlayEvent[],
  players: MatchPlayerMeta[],
): TeamBoxScore {
  const roster = players.filter((p) => p.teamId === teamId);
  const lines = new Map<string, BoxScorePlayerLine>();
  for (const p of roster) {
    lines.set(
      p.id,
      blankLine(p.id, p.jerseyNumber ?? "—", p.displayName),
    );
  }

  for (const e of events) {
    if (e.voidedAt) continue;
    if (e.teamId !== teamId || !e.playerId) continue;
    let line = lines.get(e.playerId);
    if (!line) {
      const meta = players.find((p) => p.id === e.playerId);
      line = blankLine(
        e.playerId,
        meta?.jerseyNumber ?? "—",
        meta?.displayName ?? e.playerId.slice(0, 8),
      );
      lines.set(e.playerId, line);
    }
    applyEvent(line, e.type, e.payload as EventPayload);
  }

  const sorted = [...lines.values()].sort((a, b) => {
    const na = Number.parseInt(a.no, 10);
    const nb = Number.parseInt(b.no, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    return a.no.localeCompare(b.no, "th");
  });

  return {
    teamId,
    code,
    name,
    players: sorted,
    teamTotals: sumPlayers(sorted),
  };
}

function buildQuarters(periodScores: PeriodScoreRow[]): QuarterScore[] {
  const sorted = [...periodScores].sort((a, b) => a.period - b.period);
  let homeCum = 0;
  let awayCum = 0;
  return sorted.map((row) => {
    homeCum += row.homePoints;
    awayCum += row.awayPoints;
    return {
      period: row.period,
      home: row.homePoints,
      away: row.awayPoints,
      homeCum,
      awayCum,
    };
  });
}

/** Aggregate a full two-team IYBC-style match box score from PBP. */
export function buildMatchBoxScore(
  events: PlayByPlayEvent[],
  players: MatchPlayerMeta[],
  game: MatchGameMeta,
  periodScores: PeriodScoreRow[] = [],
  advanced?: MatchAdvanced,
): MatchBoxScore {
  const home = teamBoxFromEvents(
    game.homeTeamId,
    game.homeCode,
    game.homeName,
    events,
    players,
  );
  const away = teamBoxFromEvents(
    game.awayTeamId,
    game.awayCode,
    game.awayName,
    events,
    players,
  );

  const byQuarter = buildQuarters(periodScores);
  const lastQ = byQuarter[byQuarter.length - 1];
  const finalHome = game.finalHome ?? lastQ?.homeCum ?? home.teamTotals.pts;
  const finalAway = game.finalAway ?? lastQ?.awayCum ?? away.teamTotals.pts;

  let date: string | undefined;
  let tipOff: string | undefined;
  if (game.scheduledAt) {
    const d = new Date(game.scheduledAt);
    if (!Number.isNaN(d.getTime())) {
      date = d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      tipOff = d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  return {
    meta: {
      tournament: game.tournament,
      date,
      tipOff,
      venue: game.venue,
      gameNo: game.gameNo ?? undefined,
      homeCode: game.homeCode,
      awayCode: game.awayCode,
      homeName: game.homeName,
      awayName: game.awayName,
      finalHome,
      finalAway,
    },
    byQuarter,
    home,
    away,
    advanced,
  };
}

/** Build MatchBoxScore from a pre-baked team/player JSON (fixtures / imports). */
export function matchBoxFromStatic(input: {
  meta: MatchBoxMeta;
  byQuarter: { period: number; home: number; away: number }[];
  home: TeamBoxScore;
  away: TeamBoxScore;
  advanced?: MatchAdvanced;
}): MatchBoxScore {
  let homeCum = 0;
  let awayCum = 0;
  const byQuarter: QuarterScore[] = input.byQuarter.map((q) => {
    homeCum += q.home;
    awayCum += q.away;
    return {
      period: q.period,
      home: q.home,
      away: q.away,
      homeCum,
      awayCum,
    };
  });
  return {
    meta: input.meta,
    byQuarter,
    home: input.home,
    away: input.away,
    advanced: input.advanced,
  };
}

export function fmtMadeAtt(m: MadeAtt): string {
  return `${m.made}/${m.att}`;
}

export function fmtReb(r: RebSplit): string {
  return `${r.off}/${r.def}`;
}
