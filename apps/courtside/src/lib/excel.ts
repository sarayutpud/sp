import type { PlayByPlayEvent } from "@sp/shared-types";
import ExcelJS from "exceljs";

/** Fixed-column Excel template — do not rename sheets/columns lightly */
export async function exportGameExcel(events: PlayByPlayEvent[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SP Courtside";

  const box = wb.addWorksheet("Box Score");
  box.addRow([
    "PlayerId",
    "PTS",
    "FGM",
    "FGA",
    "3PM",
    "3PA",
    "FTM",
    "FTA",
  ]);

  const pbp = wb.addWorksheet("PBP");
  pbp.addRow([
    "EventId",
    "Period",
    "Type",
    "PlayerId",
    "Made",
    "IsThree",
    "X",
    "Y",
  ]);

  const shots = wb.addWorksheet("Shots");
  shots.addRow(["EventId", "X", "Y", "BasketSide", "IsThree", "Made"]);

  for (const e of events) {
    if (e.type !== "SHOT") continue;
    const p = e.payload as {
      made?: boolean;
      isThree?: boolean;
      x?: number;
      y?: number;
      basketSide?: string;
    };
    pbp.addRow([
      e.eventId,
      e.period,
      e.type,
      e.playerId ?? "",
      p.made ?? "",
      p.isThree ?? "",
      p.x ?? "",
      p.y ?? "",
    ]);
    shots.addRow([
      e.eventId,
      p.x ?? "",
      p.y ?? "",
      p.basketSide ?? "",
      p.isThree ?? "",
      p.made ?? "",
    ]);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sp-game-export.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
