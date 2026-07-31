import {
  buildMatchBoxScore,
  fmtMadeAtt,
  fmtPlusMinus,
  fmtReb,
  fmtShotPct,
  type MatchBoxScore,
} from "@sp/rules-engine";
import { writeFibaBoxScoreXlsx } from "@sp/report-export";
import type { PlayByPlayEvent } from "@sp/shared-types";
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
      homeStarters: session.tipStarters?.HOME,
      awayStarters: session.tipStarters?.AWAY,
    },
    session.completedPeriodScores,
  );
}

function teamRows(box: MatchBoxScore, side: "home" | "away") {
  return box[side].players.map((p) => [
    p.no,
    p.name,
    fmtMadeAtt(p.fg),
    fmtShotPct(p.fg),
    fmtMadeAtt(p.fg2),
    fmtMadeAtt(p.fg3),
    fmtMadeAtt(p.ft),
    fmtReb(p.reb),
    p.ast,
    p.to,
    p.st,
    p.blk,
    p.pf,
    p.fd,
    fmtPlusMinus(p.plusMinus),
    p.ef,
    p.pts,
  ]);
}

const BOX_HEAD = [
  "No",
  "Name",
  "FG",
  "%",
  "2PT",
  "3PT",
  "FT",
  "REB",
  "AS",
  "TO",
  "ST",
  "BS",
  "PF",
  "FD",
  "+/-",
  "EF",
  "PTS",
];

/** FIBA-style Excel for both teams (exam layout). */
export async function exportGameExcel(
  events: PlayByPlayEvent[],
  session: ActiveGameSession,
): Promise<"saved" | "cancelled" | "empty" | { error: string }> {
  if (events.length === 0) return "empty";
  const boxScore = buildBox(events, session);
  const buf = await writeFibaBoxScoreXlsx(boxScore);
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return saveBlob(blob, `fiba-box-${session.gameId.slice(0, 8)}.xlsx`);
}

export async function exportGamePdf(
  events: PlayByPlayEvent[],
  session: ActiveGameSession,
): Promise<"saved" | "cancelled" | "empty" | { error: string }> {
  if (events.length === 0) return "empty";
  const box = buildBox(events, session);
  const pdf = new jsPDF({ orientation: "landscape" });
  pdf.setFontSize(14);
  pdf.text("FIBA Box Score", 14, 12);
  pdf.setFontSize(11);
  pdf.text(
    `${box.meta.homeCode} ${box.meta.finalHome} - ${box.meta.finalAway} ${box.meta.awayCode}`,
    14,
    20,
  );
  pdf.setFontSize(8);
  pdf.text(`${box.meta.homeName} vs ${box.meta.awayName}`, 14, 26);

  let startY = 30;
  if (box.byQuarter.length > 0) {
    autoTable(pdf, {
      startY,
      head: [
        ["Team", ...box.byQuarter.map((q) => `Q${q.period}`), "Final"],
      ],
      body: [
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
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 22, 84] },
    });
    startY =
      (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 6;
  }

  let y = startY;
  for (const side of ["home", "away"] as const) {
    const label = `${box[side].code} — ${box[side].name}${
      box[side].coach ? ` · Coach ${box[side].coach}` : ""
    }`;
    pdf.setFontSize(10);
    pdf.text(label, 14, y);
    autoTable(pdf, {
      startY: y + 2,
      head: [BOX_HEAD],
      body: teamRows(box, side),
      styles: { fontSize: 6.5 },
      headStyles: { fillColor: [15, 22, 84], fontSize: 6.5 },
    });
    y =
      (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 8;
  }

  return saveBlob(
    pdf.output("blob"),
    `fiba-box-${session.gameId.slice(0, 8)}.pdf`,
  );
}
