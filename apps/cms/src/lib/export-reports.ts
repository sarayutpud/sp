import type { MatchBoxScore } from "@sp/rules-engine";
import {
  writeFibaBoxScorePdf,
  writeFibaBoxScoreXlsx,
} from "@sp/report-export";
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

export async function downloadMatchBoxExcel(
  box: MatchBoxScore,
  filename: string,
) {
  const buf = await writeFibaBoxScoreXlsx(box);
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
  const blob = await writeFibaBoxScorePdf(box);
  downloadBlob(blob, filename);
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
