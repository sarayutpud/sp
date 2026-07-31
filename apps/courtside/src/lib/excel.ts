import {
  buildMatchBoxScore,
  type MatchBoxScore,
} from "@sp/rules-engine";
import {
  writeFibaBoxScorePdf,
  writeFibaBoxScoreXlsx,
} from "@sp/report-export";
import type { PlayByPlayEvent } from "@sp/shared-types";
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
      gameNo: session.gameId.slice(0, 8),
      homeStarters: session.tipStarters?.HOME,
      awayStarters: session.tipStarters?.AWAY,
    },
    session.completedPeriodScores,
  );
}

/** FIBA-style Excel for both teams (exam layout). */
export async function exportGameExcel(
  events: PlayByPlayEvent[],
  session: ActiveGameSession,
): Promise<"saved" | "cancelled" | "empty" | { error: string }> {
  if (events.length === 0) return "empty";
  const boxScore: MatchBoxScore = buildBox(events, session);
  const buf = await writeFibaBoxScoreXlsx(boxScore);
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return saveBlob(blob, `fiba-box-${session.gameId.slice(0, 8)}.xlsx`);
}

/** FIBA-style PDF for both teams (exam layout). */
export async function exportGamePdf(
  events: PlayByPlayEvent[],
  session: ActiveGameSession,
): Promise<"saved" | "cancelled" | "empty" | { error: string }> {
  if (events.length === 0) return "empty";
  const box = buildBox(events, session);
  const blob = await writeFibaBoxScorePdf(box);
  return saveBlob(blob, `fiba-box-${session.gameId.slice(0, 8)}.pdf`);
}
