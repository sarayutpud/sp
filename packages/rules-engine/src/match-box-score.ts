import type { PlayByPlayEvent } from "@sp/shared-types";

export type MadeAtt = { made: number; att: number };
export type RebSplit = { off: number; def: number; tot: number };

export type BoxScorePlayerLine = {
  playerId: string | null;
  no: string;
  name: string;
  min: string | null;
  fg: MadeAtt;
  fg2: MadeAtt;
  fg3: MadeAtt;
  ft: MadeAtt;
  reb: RebSplit;
  ast: number;
  st: number;
  blk: number;
  to: number;
  pf: number;
  fd: number;
  plusMinus: number;
  ef: number;
  pts: number;
};

export type TeamBoxTotals = {
  fg: MadeAtt;
  fg2: MadeAtt;
  fg3: MadeAtt;
  ft: MadeAtt;
  reb: RebSplit;
  ast: number;
  st: number;
  blk: number;
  to: number;
  pf: number;
  fd: number;
  pts: number;
};

export type TeamBoxScore = {
  teamId: string;
  code: string;
  name: string;
  coach?: string;
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
  homeCoach?: string;
  awayCoach?: string;
  crewChief?: string;
  umpire?: string;
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
  homeCoach?: string | null;
  awayCoach?: string | null;
  crewChief?: string | null;
  umpire?: string | null;
  /** Tip-off starters (player ids); used for +/- when present. */
  homeStarters?: string[];
  awayStarters?: string[];
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
  playerInId?: string;
  playerOutId?: string;
  assistedByPlayerId?: string | null;
};

export function computeEfficiency(p: {
  pts: number;
  reb: RebSplit;
  ast: number;
  st: number;
  blk: number;
  fg: MadeAtt;
  ft: MadeAtt;
  to: number;
}): number {
  return (
    p.pts +
    p.reb.tot +
    p.ast +
    p.st +
    p.blk -
    (p.fg.att - p.fg.made) -
    (p.ft.att - p.ft.made) -
    p.to
  );
}

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
    fg: { made: 0, att: 0 },
    fg2: { made: 0, att: 0 },
    fg3: { made: 0, att: 0 },
    ft: { made: 0, att: 0 },
    reb: { off: 0, def: 0, tot: 0 },
    ast: 0,
    st: 0,
    blk: 0,
    to: 0,
    pf: 0,
    fd: 0,
    plusMinus: 0,
    ef: 0,
    pts: 0,
  };
}

function blankTotals(): TeamBoxTotals {
  return {
    fg: { made: 0, att: 0 },
    fg2: { made: 0, att: 0 },
    fg3: { made: 0, att: 0 },
    ft: { made: 0, att: 0 },
    reb: { off: 0, def: 0, tot: 0 },
    ast: 0,
    st: 0,
    blk: 0,
    to: 0,
    pf: 0,
    fd: 0,
    pts: 0,
  };
}

function addMadeAtt(a: MadeAtt, b: MadeAtt): MadeAtt {
  return { made: a.made + b.made, att: a.att + b.att };
}

function syncFg(line: Pick<BoxScorePlayerLine, "fg" | "fg2" | "fg3">) {
  line.fg = addMadeAtt(line.fg2, line.fg3);
}

function sumPlayers(players: BoxScorePlayerLine[]): TeamBoxTotals {
  const t = blankTotals();
  for (const p of players) {
    syncFg(p);
    t.fg = addMadeAtt(t.fg, p.fg);
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
    t.fd += p.fd;
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
    case "FOUL_DRAWN":
      line.fd += 1;
      break;
    default:
      break;
  }
}

function scoringPoints(type: string, p: EventPayload): number {
  if (type === "SHOT" && p.made) return p.isThree ? 3 : 2;
  if (type === "FT" && p.made) return 1;
  return 0;
}

function applyPlusMinus(
  lines: Map<string, BoxScorePlayerLine>,
  onCourt: Set<string>,
  delta: number,
) {
  for (const id of onCourt) {
    const line = lines.get(id);
    if (line) line.plusMinus += delta;
  }
}

function teamBoxFromEvents(
  teamId: string,
  code: string,
  name: string,
  events: PlayByPlayEvent[],
  players: MatchPlayerMeta[],
  coach?: string,
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
    if (e.type === "SUB") continue;
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

  for (const line of lines.values()) {
    syncFg(line);
    line.ef = computeEfficiency(line);
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
    coach,
    players: sorted,
    teamTotals: sumPlayers(sorted),
  };
}

/** Walk PBP to adjust +/- on player lines using starters + SUB. */
function applyPlusMinusFromEvents(
  home: TeamBoxScore,
  away: TeamBoxScore,
  events: PlayByPlayEvent[],
  game: MatchGameMeta,
) {
  const homeLines = new Map(
    home.players.filter((p) => p.playerId).map((p) => [p.playerId!, p]),
  );
  const awayLines = new Map(
    away.players.filter((p) => p.playerId).map((p) => [p.playerId!, p]),
  );

  const homeOn = new Set(
    (game.homeStarters ?? home.players.slice(0, 5).map((p) => p.playerId!)).filter(
      Boolean,
    ) as string[],
  );
  const awayOn = new Set(
    (game.awayStarters ?? away.players.slice(0, 5).map((p) => p.playerId!)).filter(
      Boolean,
    ) as string[],
  );

  // Only run +/- when we have on-court sets (starters or roster)
  if (homeOn.size === 0 && awayOn.size === 0) return;

  const ordered = [...events]
    .filter((e) => !e.voidedAt)
    .sort((a, b) => {
      if (a.period !== b.period) return a.period - b.period;
      if (a.hlc.wallMs !== b.hlc.wallMs) return a.hlc.wallMs - b.hlc.wallMs;
      return a.hlc.logical - b.hlc.logical;
    });

  for (const e of ordered) {
    const payload = e.payload as EventPayload;
    if (e.type === "SUB") {
      const outId = payload.playerOutId ?? null;
      const inId = payload.playerInId ?? e.playerId;
      const on =
        e.teamId === game.homeTeamId
          ? homeOn
          : e.teamId === game.awayTeamId
            ? awayOn
            : null;
      if (on) {
        if (outId) on.delete(outId);
        if (inId) on.add(inId);
      }
      continue;
    }

    const pts = scoringPoints(e.type, payload);
    if (pts <= 0 || !e.teamId) continue;
    if (e.teamId === game.homeTeamId) {
      applyPlusMinus(homeLines, homeOn, pts);
      applyPlusMinus(awayLines, awayOn, -pts);
    } else if (e.teamId === game.awayTeamId) {
      applyPlusMinus(awayLines, awayOn, pts);
      applyPlusMinus(homeLines, homeOn, -pts);
    }
  }
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

/** Aggregate a full two-team FIBA-style match box score from PBP. */
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
    game.homeCoach ?? undefined,
  );
  const away = teamBoxFromEvents(
    game.awayTeamId,
    game.awayCode,
    game.awayName,
    events,
    players,
    game.awayCoach ?? undefined,
  );

  applyPlusMinusFromEvents(home, away, events, game);

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
      homeCoach: game.homeCoach ?? undefined,
      awayCoach: game.awayCoach ?? undefined,
      crewChief: game.crewChief ?? undefined,
      umpire: game.umpire ?? undefined,
    },
    byQuarter,
    home,
    away,
    advanced,
  };
}

/** Build MatchBoxScore from a pre-baked team/player JSON (fixtures / imports). */
export type BoxScorePlayerInput = Omit<
  BoxScorePlayerLine,
  "fg" | "fd" | "plusMinus" | "ef"
> & {
  fg?: MadeAtt;
  fd?: number;
  plusMinus?: number;
  ef?: number;
};

export type TeamBoxInput = Omit<TeamBoxScore, "players" | "teamTotals"> & {
  players: BoxScorePlayerInput[];
  teamTotals: Omit<TeamBoxTotals, "fg" | "fd"> & { fg?: MadeAtt; fd?: number };
};

export function matchBoxFromStatic(input: {
  meta: MatchBoxMeta;
  byQuarter: { period: number; home: number; away: number }[];
  home: TeamBoxInput;
  away: TeamBoxInput;
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
  const normalizeTeam = (team: TeamBoxInput): TeamBoxScore => {
    const players: BoxScorePlayerLine[] = team.players.map((p) => {
      const next: BoxScorePlayerLine = {
        ...p,
        fg: p.fg ?? addMadeAtt(p.fg2, p.fg3),
        fd: p.fd ?? 0,
        plusMinus: p.plusMinus ?? 0,
        ef: p.ef ?? 0,
      };
      syncFg(next);
      if (p.ef === undefined) next.ef = computeEfficiency(next);
      return next;
    });
    const teamTotals: TeamBoxTotals = {
      ...team.teamTotals,
      fg:
        team.teamTotals.fg ??
        addMadeAtt(team.teamTotals.fg2, team.teamTotals.fg3),
      fd: team.teamTotals.fd ?? players.reduce((s, p) => s + p.fd, 0),
    };
    syncFg(teamTotals);
    return {
      teamId: team.teamId,
      code: team.code,
      name: team.name,
      coach: team.coach,
      players,
      teamTotals,
    };
  };
  return {
    meta: input.meta,
    byQuarter,
    home: normalizeTeam(input.home),
    away: normalizeTeam(input.away),
    advanced: input.advanced,
  };
}

export function fmtMadeAtt(m: MadeAtt): string {
  return `${m.made}/${m.att}`;
}

export function fmtReb(r: RebSplit): string {
  return `${r.off}/${r.def}`;
}

export function fmtPlusMinus(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

/** Shooting percentage 0–100, or null when no attempts. */
export function shotPct(m: MadeAtt): number | null {
  if (m.att <= 0) return null;
  return (m.made / m.att) * 100;
}

export function fmtShotPct(m: MadeAtt, digits = 1): string {
  const v = shotPct(m);
  if (v === null) return "—";
  return `${v.toFixed(digits)}`;
}
