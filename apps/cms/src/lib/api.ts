import { supabase } from "./supabase";
import type {
  BoxLine,
  Competition,
  GameRow,
  PbpEvent,
  Player,
  RosterRow,
  Team,
} from "./types";

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
    .select("id,status,scheduled_at,home_team_id,away_team_id,competition_id")
    .order("scheduled_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as GameRow[];
}

export async function createGame(input: {
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string | null;
  status?: string;
}): Promise<GameRow> {
  if (input.home_team_id === input.away_team_id) {
    throw new Error("ทีมเหย้าและทีมเยือนต้องต่างกัน");
  }
  const { data, error } = await supabase
    .from("games")
    .insert({
      competition_id: input.competition_id,
      home_team_id: input.home_team_id,
      away_team_id: input.away_team_id,
      scheduled_at: input.scheduled_at,
      status: input.status ?? "scheduled",
    })
    .select("id,status,scheduled_at,home_team_id,away_team_id,competition_id")
    .single();
  if (error) throw error;

  const game = data as GameRow;
  const { error: stateError } = await supabase.from("game_states").upsert({
    game_id: game.id,
    status: game.status,
    period: 1,
    home_attack_side_period1: "LEFT",
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

export async function fetchPbp(gameId: string): Promise<PbpEvent[]> {
  const { data, error } = await supabase
    .from("play_by_play")
    .select("event_id,game_id,player_id,team_id,type,payload")
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
