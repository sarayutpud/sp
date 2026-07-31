import {
  type MatchBoxScore,
  fmtMadeAtt,
  fmtReb,
} from "@sp/rules-engine";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ZoneLine } from "./coach-reports";
import { downloadTextFile } from "./share-report";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PLAYER_HEADERS = [
  "#",
  "Player",
  "2PT",
  "3PT",
  "FT",
  "REB O/D",
  "AST",
  "ST",
  "BLK",
  "TO",
  "PF",
  "PTS",
];

function playerRows(box: MatchBoxScore, side: "home" | "away") {
  const team = box[side];
  return [
    ...team.players.map((p) => [
      p.no,
      p.name,
      fmtMadeAtt(p.fg2),
      fmtMadeAtt(p.fg3),
      fmtMadeAtt(p.ft),
      fmtReb(p.reb),
      p.ast,
      p.st,
      p.blk,
      p.to,
      p.pf,
      p.pts,
    ]),
    [
      "",
      "TEAM",
      fmtMadeAtt(team.teamTotals.fg2),
      fmtMadeAtt(team.teamTotals.fg3),
      fmtMadeAtt(team.teamTotals.ft),
      fmtReb(team.teamTotals.reb),
      team.teamTotals.ast,
      team.teamTotals.st,
      team.teamTotals.blk,
      team.teamTotals.to,
      team.teamTotals.pf,
      team.teamTotals.pts,
    ],
  ];
}

export async function downloadMatchBoxExcel(
  box: MatchBoxScore,
  filename: string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SP CMS";
  const match = wb.addWorksheet("Match");
  match.addRow(["IYBC Match Box Score"]);
  match.addRow([
    `${box.meta.homeName} ${box.meta.finalHome} - ${box.meta.finalAway} ${box.meta.awayName}`,
  ]);
  match.addRow([
    box.meta.tournament,
    box.meta.date,
    box.meta.tipOff,
    box.meta.venue,
    box.meta.gameNo,
  ]);
  match.addRow([]);
  match.addRow([
    "Team",
    ...box.byQuarter.map((q) => `Q${q.period}`),
    "Final",
  ]);
  match.addRow([
    box.meta.homeCode,
    ...box.byQuarter.map((q) => q.home),
    box.meta.finalHome,
  ]);
  match.addRow([
    box.meta.awayCode,
    ...box.byQuarter.map((q) => q.away),
    box.meta.finalAway,
  ]);

  for (const side of ["home", "away"] as const) {
    const ws = wb.addWorksheet(box[side].code || side);
    ws.addRow(PLAYER_HEADERS);
    for (const row of playerRows(box, side)) ws.addRow(row);
  }

  if (box.advanced) {
    const adv = wb.addWorksheet("Advanced");
    adv.addRow(["Stat", box.meta.homeCode, box.meta.awayCode]);
    const rows: [string, { home: number; away: number } | undefined][] = [
      ["Points from TO", box.advanced.pointsFromTurnovers],
      ["Points in paint", box.advanced.pointsInThePaint],
      ["2nd chance", box.advanced.secondChancePoints],
      ["Fast break", box.advanced.fastBreakPoints],
      ["Bench points", box.advanced.benchPoints],
      ["Biggest lead", box.advanced.biggestLead],
    ];
    for (const [label, v] of rows) {
      if (v) adv.addRow([label, v.home, v.away]);
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export async function downloadMatchBoxPdf(
  box: MatchBoxScore,
  filename: string,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("IYBC Match Box Score", 14, 14);
  doc.setFontSize(11);
  doc.text(
    `${box.meta.homeCode} ${box.meta.finalHome} - ${box.meta.finalAway} ${box.meta.awayCode}`,
    14,
    22,
  );
  doc.setFontSize(9);
  doc.text(`${box.meta.homeName} vs ${box.meta.awayName}`, 14, 28);

  if (box.byQuarter.length > 0) {
    autoTable(doc, {
      startY: 32,
      head: [
        [
          "Team",
          ...box.byQuarter.map((q) => `Q${q.period}`),
          "Final",
        ],
      ],
      body: [
        [
          box.meta.homeCode,
          ...box.byQuarter.map((q) => String(q.home)),
          String(box.meta.finalHome),
        ],
        [
          box.meta.awayCode,
          ...box.byQuarter.map((q) => String(q.away)),
          String(box.meta.finalAway),
        ],
      ],
      styles: { fontSize: 8 },
    });
  }

  let y =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 40;

  for (const side of ["home", "away"] as const) {
    doc.setFontSize(11);
    doc.text(`${box[side].code} — ${box[side].name}`, 14, y + 8);
    autoTable(doc, {
      startY: y + 10,
      head: [PLAYER_HEADERS],
      body: playerRows(box, side).map((r) => r.map(String)),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [15, 22, 84] },
    });
    y =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? y + 40;
  }

  downloadBlob(doc.output("blob"), filename);
}

export async function downloadZonesExcel(
  filename: string,
  teamZones: ZoneLine[],
  playerZones: {
    playerName: string;
    jersey: string;
    zones: ZoneLine[];
  }[],
) {
  const wb = new ExcelJS.Workbook();
  const team = wb.addWorksheet("Team zones");
  team.addRow(["Zone", "FGM", "FGA", "PCT"]);
  for (const z of teamZones) {
    team.addRow([
      z.label,
      z.fgm,
      z.fga,
      z.pct == null ? "" : `${(z.pct * 100).toFixed(1)}%`,
    ]);
  }
  const players = wb.addWorksheet("Player zones");
  players.addRow(["#", "Player", "Zone", "FGM", "FGA", "PCT"]);
  for (const p of playerZones) {
    for (const z of p.zones) {
      players.addRow([
        p.jersey,
        p.playerName,
        z.label,
        z.fgm,
        z.fga,
        z.pct == null ? "" : `${(z.pct * 100).toFixed(1)}%`,
      ]);
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export async function downloadZonesPdf(
  filename: string,
  title: string,
  teamZones: ZoneLine[],
  playerZones: {
    playerName: string;
    jersey: string;
    zones: ZoneLine[];
  }[],
) {
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text(title, 14, 14);
  autoTable(doc, {
    startY: 20,
    head: [["Zone", "FGM", "FGA", "PCT"]],
    body: teamZones.map((z) => [
      z.label,
      String(z.fgm),
      String(z.fga),
      z.pct == null ? "—" : `${(z.pct * 100).toFixed(1)}%`,
    ]),
  });
  const y =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 40;
  autoTable(doc, {
    startY: y + 8,
    head: [["#", "Player", "Zone", "FGM", "FGA", "PCT"]],
    body: playerZones.flatMap((p) =>
      p.zones.map((z) => [
        p.jersey,
        p.playerName,
        z.label,
        String(z.fgm),
        String(z.fga),
        z.pct == null ? "—" : `${(z.pct * 100).toFixed(1)}%`,
      ]),
    ),
    styles: { fontSize: 8 },
  });
  downloadBlob(doc.output("blob"), filename);
}

export async function downloadSeasonExcel(
  filename: string,
  rows: Array<Record<string, string | number>>,
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Season");
  if (rows.length === 0) {
    ws.addRow(["No data"]);
  } else {
    const keys = Object.keys(rows[0]!);
    ws.addRow(keys);
    for (const r of rows) ws.addRow(keys.map((k) => r[k] ?? ""));
  }
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export async function downloadSeasonPdf(
  filename: string,
  title: string,
  headers: string[],
  body: string[][],
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(12);
  doc.text(title, 14, 14);
  autoTable(doc, {
    startY: 20,
    head: [headers],
    body,
    styles: { fontSize: 7 },
  });
  downloadBlob(doc.output("blob"), filename);
}

export async function downloadShotchartPdf(
  filename: string,
  title: string,
  imageDataUrl: string | null,
  summaryLines: string[],
) {
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text(title, 14, 14);
  let y = 22;
  doc.setFontSize(9);
  for (const line of summaryLines) {
    doc.text(line, 14, y);
    y += 6;
  }
  if (imageDataUrl) {
    doc.addImage(imageDataUrl, "PNG", 14, y + 4, 180, 180);
  }
  downloadBlob(doc.output("blob"), filename);
}

/** Re-export helper for CSV callers that already use share-report */
export { downloadTextFile };
