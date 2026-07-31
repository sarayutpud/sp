import type {
  FoulKind,
  Hlc,
  PlayByPlayEvent,
  ReboundKind,
} from "@sp/shared-types";
import { tickHlc } from "@sp/sync-protocol";
import type { ShotChartClick } from "@sp/ui";
import type { ActiveGameSession } from "./game-session";

export function nextHlc(hlc: Hlc): Hlc {
  return tickHlc(hlc);
}

export function baseEvent(
  session: ActiveGameSession,
  hlc: Hlc,
  partial: Pick<PlayByPlayEvent, "type" | "playerId" | "payload"> & {
    teamId?: string | null;
  },
): PlayByPlayEvent {
  return {
    eventId: crypto.randomUUID(),
    gameId: session.gameId,
    period: session.period,
    teamId:
      partial.teamId === undefined
        ? session.activeSide === "HOME"
          ? session.homeTeamId
          : session.awayTeamId
        : partial.teamId,
    playerId: partial.playerId ?? null,
    type: partial.type,
    hlc,
    payload: partial.payload ?? {},
  };
}

export function shotEvent(
  session: ActiveGameSession,
  hlc: Hlc,
  shot: ShotChartClick,
  made: boolean,
  playerId: string,
  flags: { countsAsFga: boolean; andOne: boolean },
  assistedByPlayerId?: string | null,
  teamId?: string | null,
): PlayByPlayEvent {
  return baseEvent(session, hlc, {
    type: "SHOT",
    playerId,
    teamId: teamId === undefined ? undefined : teamId,
    payload: {
      x: shot.x,
      y: shot.y,
      basketSide: shot.basketSide,
      isThree: shot.isThree,
      made,
      shotType: "JUMP_SHOT",
      countsAsFga: flags.countsAsFga,
      andOne: flags.andOne,
      assistedByPlayerId: assistedByPlayerId ?? null,
    },
  });
}

export function foulEvent(
  session: ActiveGameSession,
  hlc: Hlc,
  playerId: string,
  kind: FoulKind,
  teamId?: string | null,
): PlayByPlayEvent {
  return baseEvent(session, hlc, {
    type: "FOUL",
    playerId,
    teamId: teamId === undefined ? undefined : teamId,
    payload: { kind },
  });
}

export function foulDrawnEvent(
  session: ActiveGameSession,
  hlc: Hlc,
  playerId: string,
  teamId: string,
  relatedFoulEventId: string,
): PlayByPlayEvent {
  return baseEvent(session, hlc, {
    type: "FOUL_DRAWN",
    playerId,
    teamId,
    payload: { relatedFoulEventId },
  });
}

export function ftEvent(
  session: ActiveGameSession,
  hlc: Hlc,
  playerId: string,
  made: boolean,
  attemptNo: number,
  ofAttempts: number,
  teamId?: string | null,
): PlayByPlayEvent {
  return baseEvent(session, hlc, {
    type: "FT",
    playerId,
    teamId: teamId === undefined ? undefined : teamId,
    payload: { made, attemptNo, ofAttempts },
  });
}

export function rebEvent(
  session: ActiveGameSession,
  hlc: Hlc,
  playerId: string,
  kind: ReboundKind,
  relatedShotEventId?: string,
  teamId?: string | null,
): PlayByPlayEvent {
  return baseEvent(session, hlc, {
    type: "REB",
    playerId,
    teamId: teamId === undefined ? undefined : teamId,
    payload: { kind, relatedShotEventId: relatedShotEventId ?? null },
  });
}

export function toEvent(
  session: ActiveGameSession,
  hlc: Hlc,
  playerId: string | null,
  teamId?: string | null,
): PlayByPlayEvent {
  return baseEvent(session, hlc, {
    type: "TO",
    playerId,
    teamId: teamId === undefined ? undefined : teamId,
    payload: { kind: "DEAD" },
  });
}

export function astEvent(
  session: ActiveGameSession,
  hlc: Hlc,
  playerId: string,
  teamId?: string | null,
): PlayByPlayEvent {
  return baseEvent(session, hlc, {
    type: "AST",
    playerId,
    teamId: teamId === undefined ? undefined : teamId,
    payload: {},
  });
}

export function stlEvent(
  session: ActiveGameSession,
  hlc: Hlc,
  playerId: string,
  teamId?: string | null,
): PlayByPlayEvent {
  return baseEvent(session, hlc, {
    type: "STL",
    playerId,
    teamId: teamId === undefined ? undefined : teamId,
    payload: {},
  });
}

export function blkEvent(
  session: ActiveGameSession,
  hlc: Hlc,
  playerId: string,
  teamId?: string | null,
): PlayByPlayEvent {
  return baseEvent(session, hlc, {
    type: "BLK",
    playerId,
    teamId: teamId === undefined ? undefined : teamId,
    payload: {},
  });
}

export function subEvent(
  session: ActiveGameSession,
  hlc: Hlc,
  playerOutId: string,
  playerInId: string,
): PlayByPlayEvent {
  return baseEvent(session, hlc, {
    type: "SUB",
    playerId: playerInId,
    payload: {
      teamId:
        session.activeSide === "HOME" ? session.homeTeamId : session.awayTeamId,
      playerInId,
      playerOutId,
    },
  });
}

export function periodEndEvent(
  session: ActiveGameSession,
  hlc: Hlc,
): PlayByPlayEvent {
  return baseEvent(session, hlc, {
    type: "PERIOD_END",
    playerId: null,
    teamId: null,
    payload: { period: session.period },
  });
}

/** Free throws awarded — kept for future opponent-foul flows */
export function ftAttemptsForFoul(
  kind: FoulKind,
  shotMade: boolean | null,
  isThree: boolean,
  teamInBonus: boolean,
): number {
  if (kind === "SHOOTING") {
    if (shotMade) return 1;
    return isThree ? 3 : 2;
  }
  if (kind === "PERSONAL" && teamInBonus) return 2;
  if (kind === "TECHNICAL" || kind === "UNSPORTSMANLIKE") return 2;
  return 0;
}
