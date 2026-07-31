import { supabase } from "./supabase";
import type {
  BoxLine,
  Competition,
  GameRosterRow,
  GameRow,
  OurSide,
  PbpEvent,
  PeriodScoreRow,
  Player,
  RosterRow,
  Team,
} from "./types";

const GAME_SELECT =
  "id,status,scheduled_at,competition_id,our_team_id,opponent_name,our_side,home_team_id,away_team_id";

function resolveSides(input: {
  ourTeamId: string;
  opponentTeamId: string;
  ourSide: OurSide;
}) {
  const home_team_id =
    input.ourSide === "HOME" ? input.ourTeamId : input.opponentTeamId;
  const away_team_id =
    input.ourSide === "HOME" ? input.opponentTeamId : input.ourTeamId;
  return { home_team_id, away_team_id };
}

export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id,name,short_name")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Team[];
}

export async function fetchCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select("id,name,season")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Competition[];
}

export async function fetchPlayers(teamId?: string): Promise<Player[]> {
  let q = supabase
    .from("players")
    .select("id,team_id,display_name,jersey_number")
    .order("jersey_number");
  if (teamId) q = q.eq("team_id", teamId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Player[];
}

export async function createPlayer(input: {
  team_id: string;
  display_name: string;
  jersey_number: string;
}) {
  const { error } = await supabase.from("players").insert(input);
  if (error) throw error;
}

export async function updatePlayer(
  id: string,
  input: { display_name: string; jersey_number: string },
) {
  const { error } = await supabase.from("players").update(input).eq("id", id);
  if (error) throw error;
}

export async function deletePlayer(id: string) {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchRosters(
  competitionId: string,
  teamId: string,
): Promise<RosterRow[]> {
  const { data, error } = await supabase
    .from("rosters")
    .select("id,competition_id,team_id,player_id,jersey_number")
    .eq("competition_id", competitionId)
    .eq("team_id", teamId);
  if (error) throw error;
  return (data ?? []) as RosterRow[];
}

export async function addToRoster(input: {
  competition_id: string;
  team_id: string;
  player_id: string;
  jersey_number: string;
}) {
  const { error } = await supabase.from("rosters").insert(input);
  if (error) throw error;
}

export async function removeFromRoster(id: string) {
  const { error } = await supabase.from("rosters").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchGames(): Promise<GameRow[]> {
  const { data, error } = await supabase
    .from("games")
    .select(GAME_SELECT)
    .order("scheduled_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as GameRow[];
}

export async function fetchGame(id: string): Promise<GameRow | null> {
  const { data, error } = await supabase
    .from("games")
    .select(GAME_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as GameRow | null) ?? null;
}

export async function createGame(input: {
  competition_id: string;
  our_team_id: string;
  opponent_team_id: string;
  opponent_name?: string;
  our_side: OurSide;
  scheduled_at: string | null;
  status?: string;
  home_attack_side?: "LEFT" | "RIGHT";
}): Promise<GameRow> {
  if (!input.opponent_team_id) throw new Error("เลือกทีมคู่แข่ง");
  if (input.opponent_team_id === input.our_team_id) {
    throw new Error("ทีมคู่แข่งต้องต่างจากทีมเรา");
  }
  const sides = resolveSides({
    ourTeamId: input.our_team_id,
    opponentTeamId: input.opponent_team_id,
    ourSide: input.our_side,
  });
  const { data: oppTeam } = await supabase
    .from("teams")
    .select("name")
    .eq("id", input.opponent_team_id)
    .maybeSingle();
  const opponent =
    input.opponent_name?.trim() ||
    (oppTeam as { name?: string } | null)?.name ||
    "คู่แข่ง";

  const { data, error } = await supabase
    .from("games")
    .insert({
      competition_id: input.competition_id,
      our_team_id: input.our_team_id,
      opponent_name: opponent,
      our_side: input.our_side,
      ...sides,
      scheduled_at: input.scheduled_at,
      status: input.status ?? "scheduled",
    })
    .select(GAME_SELECT)
    .single();
  if (error) throw error;

  const game = data as GameRow;
  const { error: stateError } = await supabase.from("game_states").upsert({
    game_id: game.id,
    status: game.status,
    period: 1,
    home_attack_side_period1: input.home_attack_side ?? "LEFT",
  });
  if (stateError) throw stateError;
  return game;
}

export async function updateGameStatus(id: string, status: string) {
  const { error } = await supabase
    .from("games")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function updateTeam(
  id: string,
  input: { name: string; short_name: string | null },
) {
  const { error } = await supabase
    .from("teams")
    .update({
      name: input.name.trim(),
      short_name: input.short_name?.trim() || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function updateGame(
  id: string,
  input: {
    opponent_team_id: string;
    our_side: OurSide;
    scheduled_at: string | null;
    our_team_id: string;
  },
) {
  if (!input.opponent_team_id) throw new Error("เลือกทีมคู่แข่ง");
  if (input.opponent_team_id === input.our_team_id) {
    throw new Error("ทีมคู่แข่งต้องต่างจากทีมเรา");
  }
  const sides = resolveSides({
    ourTeamId: input.our_team_id,
    opponentTeamId: input.opponent_team_id,
    ourSide: input.our_side,
  });
  const { data: oppTeam } = await supabase
    .from("teams")
    .select("name")
    .eq("id", input.opponent_team_id)
    .maybeSingle();
  const opponent = (oppTeam as { name?: string } | null)?.name || "คู่แข่ง";
  const { error } = await supabase
    .from("games")
    .update({
      opponent_name: opponent,
      our_side: input.our_side,
      scheduled_at: input.scheduled_at,
      our_team_id: input.our_team_id,
      ...sides,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setGameAttackSide(
  gameId: string,
  homeAttackSidePeriod1: "LEFT" | "RIGHT",
) {
  const { error } = await supabase
    .from("game_states")
    .update({ home_attack_side_period1: homeAttackSidePeriod1 })
    .eq("game_id", gameId);
  if (error) throw error;
}

export async function fetchGameRosters(
  gameId: string,
): Promise<GameRosterRow[]> {
  const { data, error } = await supabase
    .from("game_rosters")
    .select("id,game_id,team_id,player_id,is_starter,starter_slot")
    .eq("game_id", gameId);
  if (error) throw error;
  return (data ?? []) as GameRosterRow[];
}

/** Replace dress list for one team in a match. */
export async function saveGameRoster(
  gameId: string,
  teamId: string,
  playerIds: string[],
  starterIds: string[],
) {
  const starters = starterIds.slice(0, 5);
  const starterSet = new Set(starters);
  const rows = playerIds.map((playerId) => {
    const starterIndex = starters.indexOf(playerId);
    return {
      game_id: gameId,
      team_id: teamId,
      player_id: playerId,
      is_starter: starterSet.has(playerId),
      starter_slot: starterIndex >= 0 ? starterIndex + 1 : null,
    };
  });

  const { error: delError } = await supabase
    .from("game_rosters")
    .delete()
    .eq("game_id", gameId)
    .eq("team_id", teamId);
  if (delError) throw delError;

  if (rows.length === 0) return;

  const { error } = await supabase.from("game_rosters").insert(rows);
  if (error) throw error;
}

export async function fetchPeriodScores(
  gameId: string,
): Promise<PeriodScoreRow[]> {
  const { data, error } = await supabase
    .from("game_period_scores")
    .select("game_id,period,home_points,away_points")
    .eq("game_id", gameId)
    .order("period");
  if (error) throw error;
  return (data ?? []) as PeriodScoreRow[];
}

export async function fetchPbp(gameId: string): Promise<PbpEvent[]> {
  const { data, error } = await supabase
    .from("play_by_play")
    .select("event_id,game_id,period,player_id,team_id,type,payload")
    .eq("game_id", gameId)
    .is("voided_at", null);
  if (error) throw error;
  return (data ?? []) as PbpEvent[];
}

export function aggregateBoxScore(
  events: PbpEvent[],
  players: Player[],
): BoxLine[] {
  const names = new Map(players.map((p) => [p.id, p]));
  const lines = new Map<string, BoxLine>();

  for (const e of events) {
    if (e.type !== "SHOT" || !e.player_id) continue;
    const p = e.payload;
    let line = lines.get(e.player_id);
    if (!line) {
      const meta = names.get(e.player_id);
      line = {
        playerId: e.player_id,
        playerName: meta?.display_name ?? e.player_id.slice(0, 8),
        jersey: meta?.jersey_number ?? "—",
        pts: 0,
        fgm: 0,
        fga: 0,
        tpm: 0,
        tpa: 0,
      };
      lines.set(e.player_id, line);
    }
    if (p.countsAsFga === false) continue;
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

  return [...lines.values()].sort((a, b) => b.pts - a.pts);
}
