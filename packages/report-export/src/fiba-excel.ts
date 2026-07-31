import type {
  BoxScorePlayerLine,
  MadeAtt,
  MatchBoxScore,
  TeamBoxScore,
  TeamBoxTotals,
} from "@sp/rules-engine";
import { fmtMadeAtt, fmtPlusMinus, fmtShotPct } from "@sp/rules-engine";
import ExcelJS from "exceljs";

const DASH = "—";

function ma(m: MadeAtt): string {
  return fmtMadeAtt(m);
}

function pct(m: MadeAtt): string {
  return fmtShotPct(m, 1);
}

function playerRow(p: BoxScorePlayerLine): (string | number)[] {
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

function totalsRow(t: TeamBoxTotals): (string | number)[] {
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

const COL_COUNT = 23;

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, size: 10 };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
}

function addTeamBlock(
  ws: ExcelJS.Worksheet,
  team: TeamBoxScore,
  startRow: number,
): number {
  let r = startRow;
  ws.mergeCells(r, 1, r, COL_COUNT);
  ws.getCell(r, 1).value = `${team.code} — ${team.name}${
    team.coach ? `  ·  Coach: ${team.coach}` : ""
  }`;
  ws.getCell(r, 1).font = { bold: true, size: 12 };
  r += 1;

  // Two-level headers like FIBA
  const group = ws.getRow(r);
  group.values = [
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
  ];
  styleHeader(group);
  ws.mergeCells(r, 4, r, 5);
  ws.mergeCells(r, 6, r, 7);
  ws.mergeCells(r, 8, r, 9);
  ws.mergeCells(r, 10, r, 11);
  ws.mergeCells(r, 12, r, 14);
  ws.mergeCells(r, 19, r, 20);
  r += 1;

  const sub = ws.getRow(r);
  sub.values = [
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
  ];
  styleHeader(sub);
  r += 1;

  for (const p of team.players) {
    const row = ws.getRow(r);
    row.values = playerRow(p);
    row.font = { size: 9 };
    r += 1;
  }

  const tot = ws.getRow(r);
  tot.values = totalsRow(team.teamTotals);
  tot.font = { bold: true, size: 9 };
  tot.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF3B0" },
  };
  r += 2;
  return r;
}

/** Build a FIBA-style box score workbook buffer for both teams. */
export async function writeFibaBoxScoreXlsx(
  box: MatchBoxScore,
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SP";
  wb.created = new Date();
  const ws = wb.addWorksheet("FIBA Box Score", {
    views: [{ state: "frozen", ySplit: 6 }],
  });

  ws.columns = Array.from({ length: COL_COUNT }, (_, i) => ({
    width: i === 1 ? 28 : i === 2 ? 8 : 6.5,
  }));

  let r = 1;
  ws.mergeCells(r, 1, r, COL_COUNT);
  ws.getCell(r, 1).value = "FIBA Box Score";
  ws.getCell(r, 1).font = { bold: true, size: 16 };
  r += 1;

  ws.mergeCells(r, 1, r, COL_COUNT);
  ws.getCell(r, 1).value = box.meta.tournament ?? "Competition";
  ws.getCell(r, 1).font = { bold: true, size: 12 };
  r += 1;

  const metaBits = [
    box.meta.venue,
    box.meta.date,
    box.meta.tipOff ? `Start ${box.meta.tipOff}` : null,
    box.meta.gameNo ? `Game No. ${box.meta.gameNo}` : null,
  ].filter(Boolean);
  ws.mergeCells(r, 1, r, COL_COUNT);
  ws.getCell(r, 1).value = metaBits.join("  ·  ");
  ws.getCell(r, 1).font = { size: 10, color: { argb: "FF555555" } };
  r += 1;

  ws.mergeCells(r, 1, r, COL_COUNT);
  ws.getCell(r, 1).value =
    `${box.meta.homeName} (${box.meta.homeCode})  ${box.meta.finalHome} – ${box.meta.finalAway}  ${box.meta.awayName} (${box.meta.awayCode})`;
  ws.getCell(r, 1).font = { bold: true, size: 14 };
  r += 1;

  const staffBits = [
    box.meta.homeCoach ? `Home coach: ${box.meta.homeCoach}` : null,
    box.meta.awayCoach ? `Away coach: ${box.meta.awayCoach}` : null,
    box.meta.crewChief ? `Crew Chief: ${box.meta.crewChief}` : null,
    box.meta.umpire ? `Umpire: ${box.meta.umpire}` : null,
    "SP FITNESS",
  ].filter(Boolean);
  ws.mergeCells(r, 1, r, COL_COUNT);
  ws.getCell(r, 1).value = staffBits.join("  ·  ");
  ws.getCell(r, 1).font = { size: 9, color: { argb: "FF666666" } };
  r += 2;

  // Quarter scores
  if (box.byQuarter.length > 0) {
    const qHead = ["Team", ...box.byQuarter.map((q) => `Q${q.period}`), "Final"];
    ws.getRow(r).values = qHead;
    styleHeader(ws.getRow(r));
    r += 1;
    ws.getRow(r).values = [
      box.meta.homeCode,
      ...box.byQuarter.map((q) => q.home),
      box.meta.finalHome,
    ];
    r += 1;
    ws.getRow(r).values = [
      box.meta.awayCode,
      ...box.byQuarter.map((q) => q.away),
      box.meta.finalAway,
    ];
    r += 2;
  }

  r = addTeamBlock(ws, box.home, r);
  r = addTeamBlock(ws, box.away, r);

  // Advanced comparison
  ws.mergeCells(r, 1, r, 6);
  ws.getCell(r, 1).value = "Team comparison";
  ws.getCell(r, 1).font = { bold: true, size: 11 };
  r += 1;
  ws.getRow(r).values = ["Stat", box.meta.homeCode, box.meta.awayCode];
  styleHeader(ws.getRow(r));
  r += 1;

  const adv = box.advanced;
  const advRows: [string, number | string, number | string][] = [
    [
      "Points from Turnovers",
      adv?.pointsFromTurnovers?.home ?? DASH,
      adv?.pointsFromTurnovers?.away ?? DASH,
    ],
    [
      "Points in the Paint",
      adv?.pointsInThePaint?.home ?? DASH,
      adv?.pointsInThePaint?.away ?? DASH,
    ],
    [
      "Second Chance Points",
      adv?.secondChancePoints?.home ?? DASH,
      adv?.secondChancePoints?.away ?? DASH,
    ],
    [
      "Fast Break Points",
      adv?.fastBreakPoints?.home ?? DASH,
      adv?.fastBreakPoints?.away ?? DASH,
    ],
    [
      "Bench Points",
      adv?.benchPoints?.home ?? DASH,
      adv?.benchPoints?.away ?? DASH,
    ],
    [
      "Biggest Lead",
      adv?.biggestLead?.home ?? DASH,
      adv?.biggestLead?.away ?? DASH,
    ],
  ];
  for (const row of advRows) {
    ws.getRow(r).values = row;
    r += 1;
  }

  r += 1;
  ws.mergeCells(r, 1, r, COL_COUNT);
  ws.getCell(r, 1).value =
    "Legend: M/A = Made/Attempts · AS Assists · TO Turnovers · ST Steals · BS Blocks · PF Personal Fouls · FD Fouls Drawn · Min/+/- /EF = — when not tracked";
  ws.getCell(r, 1).font = { size: 8, italic: true, color: { argb: "FF666666" } };

  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}
