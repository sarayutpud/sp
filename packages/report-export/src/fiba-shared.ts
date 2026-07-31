import type {
  BoxScorePlayerLine,
  MadeAtt,
  MatchBoxScore,
  TeamBoxTotals,
} from "@sp/rules-engine";
import { fmtMadeAtt, fmtPlusMinus, fmtShotPct } from "@sp/rules-engine";

export const DASH = "—";

export const FIBA_COLORS = {
  navy: "FF0F1654",
  navyRgb: [15, 22, 84] as [number, number, number],
  headerBg: "FFE8ECF8",
  headerBgRgb: [232, 236, 248] as [number, number, number],
  teamBand: "FF1A237E",
  teamBandRgb: [26, 35, 126] as [number, number, number],
  totalsBg: "FFFFF3B0",
  totalsBgRgb: [255, 243, 176] as [number, number, number],
  line: "FFC5CAD8",
  muted: "FF5A6275",
  white: "FFFFFFFF",
};

export const COL_COUNT = 23;

export function ma(m: MadeAtt): string {
  return fmtMadeAtt(m);
}

export function pct(m: MadeAtt): string {
  return fmtShotPct(m, 1);
}

export function playerCells(p: BoxScorePlayerLine): (string | number)[] {
  return [
    p.no,
    p.name,
    p.min ?? DASH,
    ma(p.fg),
    pct(p.fg),
    ma(p.fg2),
    pct(p.fg2),
    ma(p.fg3),
    pct(p.fg3),
    ma(p.ft),
    pct(p.ft),
    p.reb.off,
    p.reb.def,
    p.reb.tot,
    p.ast,
    p.to,
    p.st,
    p.blk,
    p.pf,
    p.fd,
    fmtPlusMinus(p.plusMinus),
    p.ef,
    p.pts,
  ];
}

export function totalsCells(t: TeamBoxTotals): (string | number)[] {
  return [
    "",
    "Totals",
    DASH,
    ma(t.fg),
    pct(t.fg),
    ma(t.fg2),
    pct(t.fg2),
    ma(t.fg3),
    pct(t.fg3),
    ma(t.ft),
    pct(t.ft),
    t.reb.off,
    t.reb.def,
    t.reb.tot,
    t.ast,
    t.to,
    t.st,
    t.blk,
    t.pf,
    t.fd,
    DASH,
    DASH,
    t.pts,
  ];
}

/** Top group header labels (row 1). Empty slots are merged under a group. */
export const GROUP_HEADERS = [
  "No",
  "Name",
  "Min",
  "Field Goals",
  "",
  "2 Points",
  "",
  "3 Points",
  "",
  "Free Throws",
  "",
  "Rebounds",
  "",
  "",
  "AS",
  "TO",
  "ST",
  "BS",
  "Fouls",
  "",
  "+/-",
  "EF",
  "PTS",
] as const;

export const SUB_HEADERS = [
  "",
  "",
  "",
  "M/A",
  "%",
  "M/A",
  "%",
  "M/A",
  "%",
  "M/A",
  "%",
  "OR",
  "DR",
  "TOT",
  "",
  "",
  "",
  "",
  "PF",
  "FD",
  "",
  "",
  "",
] as const;

export function matchTitleLine(box: MatchBoxScore): string {
  const { meta } = box;
  return `${meta.homeName} ${meta.finalHome} – ${meta.finalAway} ${meta.awayName}`;
}

export function matchScoreCodes(box: MatchBoxScore): string {
  const { meta } = box;
  return `${meta.homeCode} ${meta.finalHome} – ${meta.finalAway} ${meta.awayCode}`;
}

export function quarterParen(box: MatchBoxScore): string {
  if (box.byQuarter.length === 0) return "";
  return `(${box.byQuarter.map((q) => `${q.home}-${q.away}`).join(", ")})`;
}

export function venueDateLine(box: MatchBoxScore): string {
  const { meta } = box;
  return [
    meta.venue,
    meta.date,
    meta.tipOff ? `Start time: ${meta.tipOff}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export function officialsLine(box: MatchBoxScore): string | null {
  const bits = [
    box.meta.crewChief ? `Crew Chief: ${box.meta.crewChief}` : null,
    box.meta.umpire ? `Umpire(s): ${box.meta.umpire}` : null,
  ].filter(Boolean);
  return bits.length ? bits.join("  ") : null;
}

export const LEGEND =
  "No: Playing Number · Min: Minutes · M/A: Made/Attempts · %: Shooting % · OR/DR/TOT: Rebounds · AS: Assists · TO: Turnovers · ST: Steals · BS: Blocks · PF: Personal Fouls · FD: Fouls Drawn · +/-: Plus/Minus · EF: Efficiency · PTS: Points · *: Starters · DNP: Did Not Play";

export type AdvRow = [string, string | number, string | number];

export function advancedRows(box: MatchBoxScore): AdvRow[] {
  const adv = box.advanced;
  const d = DASH;
  return [
    [
      "Points from Turnovers",
      adv?.pointsFromTurnovers?.home ?? d,
      adv?.pointsFromTurnovers?.away ?? d,
    ],
    [
      "Points in the Paint",
      adv?.pointsInThePaint?.home ?? d,
      adv?.pointsInThePaint?.away ?? d,
    ],
    [
      "Second Chance Points",
      adv?.secondChancePoints?.home ?? d,
      adv?.secondChancePoints?.away ?? d,
    ],
    [
      "Fast Break Points",
      adv?.fastBreakPoints?.home ?? d,
      adv?.fastBreakPoints?.away ?? d,
    ],
    [
      "Bench Points",
      adv?.benchPoints?.home ?? d,
      adv?.benchPoints?.away ?? d,
    ],
    [
      "Biggest Lead",
      adv?.biggestLead?.home ?? d,
      adv?.biggestLead?.away ?? d,
    ],
  ];
}
