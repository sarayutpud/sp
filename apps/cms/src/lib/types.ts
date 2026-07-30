export const DEFAULT_COMPETITION_ID =
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

export type GameRow = {
  id: string;
  status: string;
  scheduled_at: string | null;
  home_team_id: string;
  away_team_id: string;
  competition_id: string;
};

export type RosterRow = {
  id: string;
  competition_id: string;
  team_id: string;
  player_id: string;
  jersey_number: string | null;
};

export type PbpEvent = {
  event_id: string;
  game_id: string;
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
