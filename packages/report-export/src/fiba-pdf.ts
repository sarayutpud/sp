import type { MatchBoxScore, TeamBoxScore } from "@sp/rules-engine";
import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import {
  advancedRows,
  FIBA_COLORS,
  LEGEND,
  matchTitleLine,
  officialsLine,
  playerCells,
  quarterParen,
  totalsCells,
  venueDateLine,
} from "./fiba-shared";
import { registerThaiFont, THAI_PDF_FONT } from "./thai-font";

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

function fibaHead(): RowInput[] {
  return [
    [
      { content: "No", rowSpan: 2, styles: { valign: "middle" } },
      { content: "Name", rowSpan: 2, styles: { valign: "middle" } },
      { content: "Min", rowSpan: 2, styles: { valign: "middle" } },
      { content: "Field Goals", colSpan: 2 },
      { content: "2 Points", colSpan: 2 },
      { content: "3 Points", colSpan: 2 },
      { content: "Free Throws", colSpan: 2 },
      { content: "Rebounds", colSpan: 3 },
      { content: "AS", rowSpan: 2, styles: { valign: "middle" } },
      { content: "TO", rowSpan: 2, styles: { valign: "middle" } },
      { content: "ST", rowSpan: 2, styles: { valign: "middle" } },
      { content: "BS", rowSpan: 2, styles: { valign: "middle" } },
      { content: "Fouls", colSpan: 2 },
      { content: "+/-", rowSpan: 2, styles: { valign: "middle" } },
      { content: "EF", rowSpan: 2, styles: { valign: "middle" } },
      { content: "PTS", rowSpan: 2, styles: { valign: "middle" } },
    ],
    [
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
      "PF",
      "FD",
    ],
  ];
}

function teamBody(team: TeamBoxScore): RowInput[] {
  return [
    ...team.players.map((p) => playerCells(p).map(String)),
    totalsCells(team.teamTotals).map(String),
  ];
}

function drawMatchHeader(doc: jsPDF, box: MatchBoxScore): number {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;

  doc.setFillColor(...FIBA_COLORS.navyRgb);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setFillColor(255, 214, 0);
  doc.rect(0, 14, pageW, 1.2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(THAI_PDF_FONT, "bold");
  doc.text("FIBA Box Score", pageW / 2, 9.5, { align: "center" });

  let y = 21;
  doc.setTextColor(...FIBA_COLORS.navyRgb);
  doc.setFontSize(11);
  doc.setFont(THAI_PDF_FONT, "bold");
  doc.text(box.meta.tournament ?? "Competition", pageW / 2, y, {
    align: "center",
  });
  y += 5;

  const venue = venueDateLine(box);
  if (venue) {
    doc.setFont(THAI_PDF_FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 98, 117);
    doc.text(venue, pageW / 2, y, { align: "center" });
    y += 5;
  }

  // Match information card
  const info: [string, string][] = [
    ["Tournament", box.meta.tournament ?? "—"],
    [
      "Date",
      [box.meta.date, box.meta.tipOff ? `Start time: ${box.meta.tipOff}` : null]
        .filter(Boolean)
        .join(", ") || "—",
    ],
    ["Venue", box.meta.venue ?? "—"],
    ["Game No.", box.meta.gameNo ?? "—"],
    [
      "Matchup",
      `${box.meta.homeName} (${box.meta.homeCode}) vs ${box.meta.awayName} (${box.meta.awayCode})`,
    ],
    [
      "Final Score",
      `${box.meta.homeCode} ${box.meta.finalHome} – ${box.meta.finalAway} ${box.meta.awayCode}`,
    ],
  ];

  const cardX = margin;
  const cardW = pageW - margin * 2;
  const rowH = 5.2;
  const cardH = 6 + info.length * rowH;
  doc.setDrawColor(197, 202, 216);
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(cardX, y, cardW, cardH, 1.5, 1.5, "FD");

  doc.setFontSize(7.5);
  let iy = y + 4.5;
  for (const [label, value] of info) {
    doc.setFont(THAI_PDF_FONT, "bold");
    doc.setTextColor(...FIBA_COLORS.navyRgb);
    doc.text(label, cardX + 3, iy);
    doc.setFont(THAI_PDF_FONT, "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(value, cardX + 28, iy, {
      maxWidth: cardW - 32,
    });
    iy += rowH;
  }
  y += cardH + 5;

  doc.setFont(THAI_PDF_FONT, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...FIBA_COLORS.navyRgb);
  doc.text(matchTitleLine(box), pageW / 2, y, { align: "center" });
  y += 4.5;

  const qp = quarterParen(box);
  if (qp) {
    doc.setFont(THAI_PDF_FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 98, 117);
    doc.text(qp, pageW / 2, y, { align: "center" });
    y += 4;
  }

  const officials = officialsLine(box);
  if (officials) {
    doc.setFont(THAI_PDF_FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(90, 98, 117);
    doc.text(officials, pageW / 2, y, {
      align: "center",
      maxWidth: pageW - margin * 2,
    });
    y += 5;
  }

  return y + 1;
}

function addTeamTable(
  doc: DocWithTable,
  team: TeamBoxScore,
  startY: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin },
    body: [
      [
        {
          content: `${team.name} (${team.code})${
            team.coach ? `    Coach: ${team.coach}` : ""
          }`,
          colSpan: 23,
          styles: {
            fillColor: FIBA_COLORS.teamBandRgb,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8,
            halign: "left",
            cellPadding: 2.2,
          },
        },
      ],
    ],
    theme: "plain",
    styles: { cellPadding: 0, font: THAI_PDF_FONT },
  });

  const afterBand = doc.lastAutoTable?.finalY ?? startY + 6;

  autoTable(doc, {
    startY: afterBand,
    margin: { left: margin, right: margin },
    head: fibaHead(),
    body: teamBody(team),
    theme: "grid",
    styles: {
      font: THAI_PDF_FONT,
      fontSize: 5.5,
      cellPadding: 0.9,
      lineColor: [197, 202, 216],
      lineWidth: 0.15,
      textColor: [26, 26, 26],
      overflow: "linebreak",
      valign: "middle",
     halign: "center",
    },
    headStyles: {
      font: THAI_PDF_FONT,
      fillColor: FIBA_COLORS.headerBgRgb,
      textColor: FIBA_COLORS.navyRgb,
      fontStyle: "bold",
      fontSize: 5.5,
     halign: "center",
      valign: "middle",
    },
    columnStyles: {
      1: { halign: "left", cellWidth: 32 },
      2: { cellWidth: 10 },
    },
    didParseCell: (data) => {
      const isTotals =
        data.section === "body" &&
        data.row.index === team.players.length &&
        data.column.index === 1;
      if (
        data.section === "body" &&
        data.row.index === team.players.length
      ) {
        data.cell.styles.fillColor = FIBA_COLORS.totalsBgRgb;
        data.cell.styles.fontStyle = "bold";
      }
      if (isTotals) {
        data.cell.styles.halign = "left";
      }
      if (data.section === "body" && data.column.index === 1) {
        data.cell.styles.halign = "left";
      }
    },
    tableWidth: pageW - margin * 2,
  });

  return (doc.lastAutoTable?.finalY ?? afterBand) + 6;
}

/** Build a landscape FIBA box score PDF blob. */
export async function writeFibaBoxScorePdf(
  box: MatchBoxScore,
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  }) as DocWithTable;
  await registerThaiFont(doc);

  let y = drawMatchHeader(doc, box);
  const margin = 10;
  const pageW = doc.internal.pageSize.getWidth();

  if (box.byQuarter.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [
        ["Team", ...box.byQuarter.map((q) => `Q${q.period}`), "Final"],
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
      theme: "grid",
      styles: {
        font: THAI_PDF_FONT,
        fontSize: 7,
        cellPadding: 1.2,
        halign: "center",
        lineColor: [197, 202, 216],
      },
      headStyles: {
        font: THAI_PDF_FONT,
        fillColor: FIBA_COLORS.headerBgRgb,
        textColor: FIBA_COLORS.navyRgb,
        fontStyle: "bold",
      },
      tableWidth: Math.min(90, pageW - margin * 2),
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 5;
  }

  y = addTeamTable(doc, box.home, y);
  y = addTeamTable(doc, box.away, y);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Stat", box.meta.homeCode, box.meta.awayCode]],
    body: advancedRows(box).map((row) => row.map(String)),
    theme: "grid",
    styles: {
      font: THAI_PDF_FONT,
      fontSize: 7,
      cellPadding: 1.3,
      lineColor: [197, 202, 216],
    },
    headStyles: {
      font: THAI_PDF_FONT,
      fillColor: FIBA_COLORS.headerBgRgb,
      textColor: FIBA_COLORS.navyRgb,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: FIBA_COLORS.navyRgb },
      1: { halign: "center" },
      2: {halign: "center" },
    },
    tableWidth: Math.min(120, pageW - margin * 2),
  });

  y = (doc.lastAutoTable?.finalY ?? y) + 5;
  doc.setFontSize(6);
  doc.setTextColor(90, 98, 117);
  doc.setFont(THAI_PDF_FONT, "normal");
  const legendLines = doc.splitTextToSize(LEGEND, pageW - margin * 2);
  doc.text(legendLines, margin, y);

  return doc.output("blob");
}
