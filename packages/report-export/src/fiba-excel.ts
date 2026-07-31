import type { MatchBoxScore, TeamBoxScore } from "@sp/rules-engine";
import ExcelJS from "exceljs";
import {
  advancedRows,
  COL_COUNT,
  DASH,
  FIBA_COLORS,
  GROUP_HEADERS,
  LEGEND,
  matchTitleLine,
  officialsLine,
  playerCells,
  quarterParen,
  SUB_HEADERS,
  totalsCells,
  venueDateLine,
} from "./fiba-shared";

function thinBorder(): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = {
    style: "thin",
    color: { argb: FIBA_COLORS.line },
  };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

function fillSolid(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 18;
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > COL_COUNT) return;
    cell.font = { bold: true, size: 8, color: { argb: FIBA_COLORS.navy } };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.fill = fillSolid(FIBA_COLORS.headerBg);
    cell.border = thinBorder();
  });
}

function styleDataRow(row: ExcelJS.Row, opts?: { bold?: boolean; fill?: string }) {
  row.height = 16;
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > COL_COUNT) return;
    cell.font = {
      bold: opts?.bold ?? false,
      size: 8,
      color: { argb: "FF1A1A1A" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: col === 2 ? "left" : "center",
    };
    cell.border = thinBorder();
    if (opts?.fill) cell.fill = fillSolid(opts.fill);
  });
}

function addTeamBlock(
  ws: ExcelJS.Worksheet,
  team: TeamBoxScore,
  startRow: number,
): number {
  let r = startRow;

  ws.mergeCells(r, 1, r, COL_COUNT);
  const band = ws.getCell(r, 1);
  band.value = `${team.name} (${team.code})${
    team.coach ? `    Coach: ${team.coach}` : ""
  }`;
  band.font = { bold: true, size: 10, color: { argb: FIBA_COLORS.white } };
  band.fill = fillSolid(FIBA_COLORS.teamBand);
  band.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(r).height = 22;
  for (let c = 1; c <= COL_COUNT; c++) {
    ws.getCell(r, c).border = thinBorder();
    ws.getCell(r, c).fill = fillSolid(FIBA_COLORS.teamBand);
  }
  r += 1;

  const group = ws.getRow(r);
  group.values = [...GROUP_HEADERS];
  styleHeaderRow(group);
  ws.mergeCells(r, 4, r, 5);
  ws.mergeCells(r, 6, r, 7);
  ws.mergeCells(r, 8, r, 9);
  ws.mergeCells(r, 10, r, 11);
  ws.mergeCells(r, 12, r, 14);
  ws.mergeCells(r, 19, r, 20);
  // Re-apply fill on merged group cells
  for (const [a, b] of [
    [4, 5],
    [6, 7],
    [8, 9],
    [10, 11],
    [12, 14],
    [19, 20],
  ] as const) {
    ws.getCell(r, a).fill = fillSolid(FIBA_COLORS.headerBg);
    ws.getCell(r, a).font = {
      bold: true,
      size: 8,
      color: { argb: FIBA_COLORS.navy },
    };
    ws.getCell(r, a).alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    void b;
  }
  r += 1;

  const sub = ws.getRow(r);
  sub.values = [...SUB_HEADERS];
  styleHeaderRow(sub);
  // Merge No / Name / Min / AS..BS / +/- EF PTS across the two header rows visually
  // by leaving sub blank (already empty) — Excel can't rowspan easily after write;
  // freeze is enough for readability.
  r += 1;

  for (const p of team.players) {
    const row = ws.getRow(r);
    row.values = playerCells(p);
    styleDataRow(row);
    r += 1;
  }

  const tot = ws.getRow(r);
  tot.values = totalsCells(team.teamTotals);
  styleDataRow(tot, { bold: true, fill: FIBA_COLORS.totalsBg });
  r += 2;
  return r;
}

/** Build a FIBA-style box score workbook buffer for both teams. */
export async function writeFibaBoxScoreXlsx(
  box: MatchBoxScore,
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SP FITNESS";
  wb.created = new Date();
  const ws = wb.addWorksheet("FIBA Box Score", {
    views: [{ state: "frozen", ySplit: 8, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  });

  ws.columns = Array.from({ length: COL_COUNT }, (_, i) => ({
    width: i === 1 ? 26 : i === 2 ? 7 : i === 0 ? 4.5 : 5.8,
  }));

  let r = 1;

  // Title bar
  ws.mergeCells(r, 1, r, COL_COUNT);
  const title = ws.getCell(r, 1);
  title.value = "FIBA Box Score";
  title.font = { bold: true, size: 16, color: { argb: FIBA_COLORS.white } };
  title.fill = fillSolid(FIBA_COLORS.navy);
  title.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(r).height = 28;
  for (let c = 1; c <= COL_COUNT; c++) {
    ws.getCell(r, c).fill = fillSolid(FIBA_COLORS.navy);
  }
  r += 1;

  // Tournament
  ws.mergeCells(r, 1, r, COL_COUNT);
  const tourney = ws.getCell(r, 1);
  tourney.value = box.meta.tournament ?? "Competition";
  tourney.font = { bold: true, size: 12, color: { argb: FIBA_COLORS.navy } };
  tourney.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(r).height = 20;
  r += 1;

  // Venue / date
  const venueLine = venueDateLine(box);
  if (venueLine) {
    ws.mergeCells(r, 1, r, COL_COUNT);
    const v = ws.getCell(r, 1);
    v.value = venueLine;
    v.font = { size: 9, color: { argb: FIBA_COLORS.muted } };
    v.alignment = { horizontal: "center" };
    r += 1;
  }

  // Match info block (labels users asked for)
  const infoRows: [string, string][] = [
    ["Tournament", box.meta.tournament ?? DASH],
    [
      "Date",
      [box.meta.date, box.meta.tipOff ? `Start time: ${box.meta.tipOff}` : null]
        .filter(Boolean)
        .join(", ") || DASH,
    ],
    ["Venue", box.meta.venue ?? DASH],
    ["Game No.", box.meta.gameNo ?? DASH],
    [
      "Matchup",
      `${box.meta.homeName} (${box.meta.homeCode}) vs ${box.meta.awayName} (${box.meta.awayCode})`,
    ],
    [
      "Final Score",
      `${box.meta.homeCode} ${box.meta.finalHome} – ${box.meta.finalAway} ${box.meta.awayCode}`,
    ],
  ];

  for (const [label, value] of infoRows) {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = {
      bold: true,
      size: 8,
      color: { argb: FIBA_COLORS.navy },
    };
    ws.getCell(r, 1).fill = fillSolid(FIBA_COLORS.headerBg);
    ws.getCell(r, 1).border = thinBorder();
    ws.mergeCells(r, 2, r, 10);
    ws.getCell(r, 2).value = value;
    ws.getCell(r, 2).font = { size: 9 };
    ws.getCell(r, 2).border = thinBorder();
    ws.getCell(r, 2).alignment = { vertical: "middle", horizontal: "left" };
    for (let c = 2; c <= 10; c++) {
      ws.getCell(r, c).border = thinBorder();
    }
    r += 1;
  }

  // Big scoreline
  ws.mergeCells(r, 1, r, COL_COUNT);
  const score = ws.getCell(r, 1);
  score.value = matchTitleLine(box);
  score.font = { bold: true, size: 13, color: { argb: FIBA_COLORS.navy } };
  score.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(r).height = 24;
  r += 1;

  const qp = quarterParen(box);
  if (qp) {
    ws.mergeCells(r, 1, r, COL_COUNT);
    const qCell = ws.getCell(r, 1);
    qCell.value = qp;
    qCell.font = { size: 9, color: { argb: FIBA_COLORS.muted } };
    qCell.alignment = { horizontal: "center" };
    r += 1;
  }

  const officials = officialsLine(box);
  if (officials) {
    ws.mergeCells(r, 1, r, COL_COUNT);
    const o = ws.getCell(r, 1);
    o.value = officials;
    o.font = { size: 8, color: { argb: FIBA_COLORS.muted } };
    o.alignment = { horizontal: "center" };
    r += 1;
  }

  r += 1;

  // Scoring by period
  if (box.byQuarter.length > 0) {
    ws.mergeCells(r, 1, r, Math.min(2 + box.byQuarter.length, COL_COUNT));
    ws.getCell(r, 1).value = "Scoring by Period";
    ws.getCell(r, 1).font = {
      bold: true,
      size: 9,
      color: { argb: FIBA_COLORS.navy },
    };
    r += 1;

    const qHead = ["Team", ...box.byQuarter.map((q) => `Q${q.period}`), "Final"];
    const headRow = ws.getRow(r);
    headRow.values = qHead;
    for (let c = 1; c <= qHead.length; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { bold: true, size: 8, color: { argb: FIBA_COLORS.navy } };
      cell.fill = fillSolid(FIBA_COLORS.headerBg);
      cell.border = thinBorder();
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
    r += 1;

    const periodBodies: (string | number)[][] = [
      [
        box.meta.homeCode,
        ...box.byQuarter.map((q) => q.home),
        box.meta.finalHome,
      ],
      [
        box.meta.awayCode,
        ...box.byQuarter.map((q) => q.away),
        box.meta.finalAway,
      ],
    ];
    for (const vals of periodBodies) {
      const row = ws.getRow(r);
      row.values = vals;
      for (let c = 1; c <= vals.length; c++) {
        const cell = ws.getCell(r, c);
        cell.font = { size: 8, bold: c === 1 || c === vals.length };
        cell.border = thinBorder();
        cell.alignment = { horizontal: "center" };
      }
      r += 1;
    }
    r += 1;
  }

  r = addTeamBlock(ws, box.home, r);
  r = addTeamBlock(ws, box.away, r);

  // Team comparison
  ws.mergeCells(r, 1, r, 3);
  ws.getCell(r, 1).value = "Team Comparison";
  ws.getCell(r, 1).font = {
    bold: true,
    size: 10,
    color: { argb: FIBA_COLORS.navy },
  };
  r += 1;

  const advHead = ws.getRow(r);
  advHead.values = ["Stat", box.meta.homeCode, box.meta.awayCode];
  for (let c = 1; c <= 3; c++) {
    const cell = ws.getCell(r, c);
    cell.font = { bold: true, size: 8, color: { argb: FIBA_COLORS.navy } };
    cell.fill = fillSolid(FIBA_COLORS.headerBg);
    cell.border = thinBorder();
    cell.alignment = { horizontal: "center" };
  }
  r += 1;

  for (const row of advancedRows(box)) {
    const excelRow = ws.getRow(r);
    excelRow.values = row;
    for (let c = 1; c <= 3; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { size: 8 };
      cell.border = thinBorder();
      cell.alignment = {
        horizontal: c === 1 ? "left" : "center",
        vertical: "middle",
      };
    }
    r += 1;
  }

  r += 1;
  ws.mergeCells(r, 1, r, COL_COUNT);
  const legend = ws.getCell(r, 1);
  legend.value = LEGEND;
  legend.font = {
    size: 7,
    italic: true,
    color: { argb: FIBA_COLORS.muted },
  };
  legend.alignment = { wrapText: true, vertical: "top" };
  ws.getRow(r).height = 32;

  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}
