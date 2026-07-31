import {
  type MatchBoxScore,
  buildMatchBoxScore,
  fmtMadeAtt,
  fmtReb,
} from "@sp/rules-engine";
import type { PlayByPlayEvent } from "@sp/shared-types";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ActiveGameSession } from "./game-session";
import { saveBlob } from "./save-download";

function buildBox(events: PlayByPlayEvent[], session: ActiveGameSession) {
  const players = (["HOME", "AWAY"] as const).flatMap((side) =>
    [...session.teams[side].onCourt, ...session.teams[side].bench].map(
      (player) => ({
        id: player.id,
        teamId: side === "HOME" ? session.homeTeamId : session.awayTeamId,
        displayName: player.name,
        jerseyNumber: player.jerseyNumber,
      }),
    ),
  );
  return buildMatchBoxScore(
    events,
    players,
    {
      homeTeamId: session.homeTeamId,
      awayTeamId: session.awayTeamId,
      homeName: session.homeTeamName,
      awayName: session.awayTeamName,
      homeCode: session.homeTeamCode,
      awayCode: session.awayTeamCode,
      scheduledAt: session.scheduledAt,
    },
    session.completedPeriodScores,
  );
}

function teamRows(box: MatchBoxScore, side: "home" | "away") {
  return box[side].players.map((p) => [
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
  ]);
}

/** Fixed-column Excel template — do not rename sheets/columns lightly */
export async function exportGameExcel(
  events: PlayByPlayEvent[],
  session: ActiveGameSession,
): Promise<"saved" | "cancelled" | "empty" | { error: string }> {
  if (events.length === 0) return "empty";
  const boxScore = buildBox(events, session);
  const wb = new ExcelJS.Workbook();
  wb.creator = "SP Courtside";
  const box = wb.addWorksheet("IYBC Match Box Score");
  box.addRow(["IYBC MATCH BOX SCORE"]);
  box.addRow([
    `${boxScore.meta.homeName} ${boxScore.meta.finalHome} - ${boxScore.meta.finalAway} ${boxScore.meta.awayName}`,
  ]);
  box.addRow([
    "Quarter",
    ...boxScore.byQuarter.map((q) => `Q${q.period}`),
    "Final",
  ]);
  box.addRow([
    "Home",
    ...boxScore.byQuarter.map((q) => q.home),
    boxScore.meta.finalHome,
  ]);
  box.addRow([
    "Away",
    ...boxScore.byQuarter.map((q) => q.away),
    boxScore.meta.finalAway,
  ]);
  for (const side of ["home", "away"] as const) {
    box.addRow([]);
    box.addRow([boxScore[side].name]);
    box.addRow([
      "No",
      "Player",
      "2PT",
      "3PT",
      "FT",
      "REB O/D",
      "AST",
      "STL",
      "BLK",
      "TO",
      "PF",
      "PTS",
    ]);
    for (const row of teamRows(boxScore, side)) {
      box.addRow(row);
    }
    const total = boxScore[side].teamTotals;
    box.addRow([
      "",
      "TOTAL",
      fmtMadeAtt(total.fg2),
      fmtMadeAtt(total.fg3),
      fmtMadeAtt(total.ft),
      fmtReb(total.reb),
      total.ast,
      total.st,
      total.blk,
      total.to,
      total.pf,
      total.pts,
    ]);
  }
  for (const column of box.columns) {
    column.width = 14;
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return saveBlob(blob, `iybc-match-box-${session.gameId.slice(0, 8)}.xlsx`);
}

export async function exportGamePdf(
  events: PlayByPlayEvent[],
  session: ActiveGameSession,
): Promise<"saved" | "cancelled" | "empty" | { error: string }> {
  if (events.length === 0) return "empty";
  const box = buildBox(events, session);
  const pdf = new jsPDF({ orientation: "landscape" });
  pdf.setFontSize(16);
  pdf.text("IYBC MATCH BOX SCORE", 14, 14);
  pdf.setFontSize(12);
  pdf.text(
    `${box.meta.homeName} ${box.meta.finalHome} - ${box.meta.finalAway} ${box.meta.awayName}`,
    14,
    22,
  );
  autoTable(pdf, {
    startY: 28,
    head: [["Quarter", ...box.byQuarter.map((q) => `Q${q.period}`), "Final"]],
    body: [
      ["Home", ...box.byQuarter.map((q) => q.home), box.meta.finalHome],
      ["Away", ...box.byQuarter.map((q) => q.away), box.meta.finalAway],
    ],
  });
  let y =
    (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;
  for (const side of ["home", "away"] as const) {
    pdf.text(box[side].name, 14, y);
    autoTable(pdf, {
      startY: y + 3,
      head: [
        [
          "No",
          "Player",
          "2PT",
          "3PT",
          "FT",
          "REB O/D",
          "AST",
          "STL",
          "BLK",
          "TO",
          "PF",
          "PTS",
        ],
      ],
      body: teamRows(box, side),
    });
    y =
      (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 8;
  }
  return saveBlob(
    pdf.output("blob"),
    `iybc-match-box-${session.gameId.slice(0, 8)}.pdf`,
  );
}
