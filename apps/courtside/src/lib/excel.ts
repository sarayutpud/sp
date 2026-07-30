import type { PlayByPlayEvent } from "@sp/shared-types";
import ExcelJS from "exceljs";
import { saveBlob } from "./save-download";

type ShotPayload = {
  made?: boolean;
  isThree?: boolean;
  x?: number;
  y?: number;
  basketSide?: string;
  countsAsFga?: boolean;
};

type BoxLine = {
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
};

function boxFromEvents(events: PlayByPlayEvent[]): Map<string, BoxLine> {
  const lines = new Map<string, BoxLine>();
  const ensure = (playerId: string) => {
    let line = lines.get(playerId);
    if (!line) {
      line = { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 };
      lines.set(playerId, line);
    }
    return line;
  };

  for (const e of events) {
    if (e.type !== "SHOT" || !e.playerId) continue;
    const p = e.payload as ShotPayload;
    const line = ensure(e.playerId);
    if (p.countsAsFga !== false) {
      line.fga += 1;
      if (p.isThree) line.tpa += 1;
      if (p.made) {
        line.fgm += 1;
        if (p.isThree) {
          line.tpm += 1;
          line.pts += 3;
        } else {
          line.pts += 2;
        }
      }
    }
  }

  return lines;
}

/** Fixed-column Excel template — do not rename sheets/columns lightly */
export async function exportGameExcel(
  events: PlayByPlayEvent[],
  gameId: string,
): Promise<"saved" | "cancelled" | "empty"> {
  if (events.length === 0) return "empty";

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
  for (const [playerId, line] of boxFromEvents(events)) {
    box.addRow([
      playerId,
      line.pts,
      line.fgm,
      line.fga,
      line.tpm,
      line.tpa,
      line.ftm,
      line.fta,
    ]);
  }

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
    const p = e.payload as ShotPayload;
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
  const shortId = gameId.slice(0, 8);
  return saveBlob(blob, `sp-game-${shortId}.xlsx`);
}
