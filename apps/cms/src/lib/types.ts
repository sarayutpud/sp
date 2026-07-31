export const DEFAULT_COMPETITION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

export type Team = {
  id: string;
  name: string;
  short_name: string | null;
};

export type Player = {
  id: string;
  team_id: string;
  display_name: string;
  jersey_number: string | null;
};

export type Competition = {
  id: string;
  name: string;
  season: string | null;
};

export type OurSide = "HOME" | "AWAY";

export type GameRow = {
  id: string;
  status: string;
  scheduled_at: string | null;
  competition_id: string;
  our_team_id: string;
  opponent_name: string;
  our_side: OurSide;
  home_team_id: string;
  away_team_id: string;
};

export type GameRosterRow = {
  id: string;
  game_id: string;
  team_id: string;
  player_id: string;
  is_starter: boolean;
  starter_slot: number | null;
};

export type RosterRow = {
  id: string;
  competition_id: string;
  team_id: string;
  player_id: string;
  jersey_number: string | null;
};

export type PeriodScoreRow = {
  game_id: string;
  period: number;
  home_points: number;
  away_points: number;
};

export type PbpEvent = {
  event_id: string;
  game_id: string;
  period: number;
  player_id: string | null;
  team_id: string | null;
  type: string;
  payload: {
    made?: boolean;
    isThree?: boolean;
    x?: number;
    y?: number;
    basketSide?: "LEFT" | "RIGHT";
    countsAsFga?: boolean;
    kind?: string;
  };
};

export type BoxLine = {
  playerId: string;
  playerName: string;
  jersey: string;
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
};

export function gameMatchLabel(
  ourTeamName: string,
  opponentName: string,
  ourSide: OurSide,
): string {
  return ourSide === "HOME"
    ? `${ourTeamName} vs ${opponentName}`
    : `${opponentName} vs ${ourTeamName}`;
}

export function gameSideLabel(ourSide: OurSide): string {
  return ourSide === "HOME" ? "เราเป็นเหย้า" : "เราเป็นเยือน";
}

const STATUS_TH: Record<string, string> = {
  scheduled: "รอแข่ง",
  tipoff: "ทิปออฟ",
  live: "กำลังแข่ง",
  period_break: "พักควอเตอร์",
  final: "จบแล้ว",
  official: "ยืนยันผล",
};

export function gameStatusLabel(status: string): string {
  return STATUS_TH[status] ?? status;
}
