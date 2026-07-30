import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Injectable, Logger } from "@nestjs/common";
import type { DeltaPushEnvelope, PlayByPlayEvent } from "@sp/shared-types";
import { asc, eq } from "drizzle-orm";
import { createDb, type Db } from "./db/client";
import { playByPlay } from "./db/schema";

type PbpRow = {
  event_id: string;
  game_id: string;
  period: number;
  clock_ms: number | null;
  team_id: string | null;
  player_id: string | null;
  type: string;
  hlc: PlayByPlayEvent["hlc"];
  payload: Record<string, unknown>;
  voided_at: string | null;
  void_reason: string | null;
  voided_by_event_id: string | null;
  created_at?: string;
};

@Injectable()
export class SyncService {
  private readonly log = new Logger(SyncService.name);
  private readonly memory = new Map<string, PlayByPlayEvent>();
  private readonly db: Db | null;
  private readonly supabase: SupabaseClient | null;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    this.db = databaseUrl ? createDb(databaseUrl) : null;

    const url = process.env.SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY;
    this.supabase = url && key ? createClient(url, key) : null;

    if (this.db) this.log.log("Sync backend: Postgres (DATABASE_URL)");
    else if (this.supabase) this.log.log("Sync backend: Supabase client");
    else this.log.log("Sync backend: in-memory");
  }

  async pushDelta(envelope: DeltaPushEnvelope) {
    if (this.db) return this.pushDb(envelope);
    if (this.supabase) return this.pushSupabase(envelope);
    return this.pushMemory(envelope);
  }

  async pullPbp(gameId: string, sinceEventId?: string) {
    if (this.db) return this.pullDb(gameId, sinceEventId);
    if (this.supabase) return this.pullSupabase(gameId, sinceEventId);
    return this.pullMemory(gameId, sinceEventId);
  }

  private pushMemory(envelope: DeltaPushEnvelope) {
    let inserted = 0;
    let skipped = 0;
    for (const event of envelope.events) {
      if (this.memory.has(event.eventId)) {
        skipped += 1;
        continue;
      }
      this.memory.set(event.eventId, event);
      inserted += 1;
    }
    return { inserted, skipped, backend: "memory" as const };
  }

  private async pushSupabase(envelope: DeltaPushEnvelope) {
    const rows = envelope.events.map((event) => ({
      event_id: event.eventId,
      game_id: event.gameId,
      period: event.period,
      clock_ms: event.clockMs ?? null,
      team_id: event.teamId ?? null,
      player_id: event.playerId ?? null,
      type: event.type,
      hlc: event.hlc,
      payload: event.payload ?? {},
      voided_at: event.voidedAt ?? null,
      void_reason: event.voidReason ?? null,
      voided_by_event_id: event.voidedByEventId ?? null,
    }));

    const { data, error } = await this.supabase!
      .from("play_by_play")
      .upsert(rows, { onConflict: "event_id", ignoreDuplicates: true })
      .select("event_id");

    if (error) {
      this.log.error(`Supabase push failed: ${error.message}`);
      throw error;
    }

    const inserted = data?.length ?? 0;
    return {
      inserted,
      skipped: envelope.events.length - inserted,
      backend: "supabase" as const,
    };
  }

  private async pushDb(envelope: DeltaPushEnvelope) {
    const db = this.db!;
    let inserted = 0;
    let skipped = 0;
    for (const event of envelope.events) {
      const result = await db
        .insert(playByPlay)
        .values({
          eventId: event.eventId,
          gameId: event.gameId,
          period: event.period,
          clockMs: event.clockMs ?? null,
          teamId: event.teamId ?? null,
          playerId: event.playerId ?? null,
          type: event.type,
          hlc: event.hlc,
          payload: event.payload ?? {},
          voidedAt: event.voidedAt ? new Date(event.voidedAt) : null,
          voidReason: event.voidReason ?? null,
          voidedByEventId: event.voidedByEventId ?? null,
        })
        .onConflictDoNothing({ target: playByPlay.eventId })
        .returning({ eventId: playByPlay.eventId });
      if (result.length > 0) inserted += 1;
      else skipped += 1;
    }
    return { inserted, skipped, backend: "postgres" as const };
  }

  private pullMemory(gameId: string, sinceEventId?: string) {
    const all = [...this.memory.values()].filter((e) => e.gameId === gameId);
    if (!sinceEventId) {
      return { events: all, cursor: all.at(-1)?.eventId ?? null, backend: "memory" as const };
    }
    const idx = all.findIndex((e) => e.eventId === sinceEventId);
    const slice = idx >= 0 ? all.slice(idx + 1) : all;
    return {
      events: slice,
      cursor: slice.at(-1)?.eventId ?? sinceEventId,
      backend: "memory" as const,
    };
  }

  private async pullSupabase(gameId: string, sinceEventId?: string) {
    const { data, error } = await this.supabase!
      .from("play_by_play")
      .select("*")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    let rows = (data ?? []) as PbpRow[];
    if (sinceEventId) {
      const idx = rows.findIndex((r) => r.event_id === sinceEventId);
      rows = idx >= 0 ? rows.slice(idx + 1) : rows;
    }

    const events = rows.map((r) => this.rowToEvent(r));
    return {
      events,
      cursor: events.at(-1)?.eventId ?? sinceEventId ?? null,
      backend: "supabase" as const,
    };
  }

  private async pullDb(gameId: string, sinceEventId?: string) {
    const db = this.db!;
    let rows = await db
      .select()
      .from(playByPlay)
      .where(eq(playByPlay.gameId, gameId))
      .orderBy(asc(playByPlay.createdAt));

    if (sinceEventId) {
      const idx = rows.findIndex((r) => r.eventId === sinceEventId);
      rows = idx >= 0 ? rows.slice(idx + 1) : rows;
    }

    const events: PlayByPlayEvent[] = rows.map((r) => ({
      eventId: r.eventId,
      gameId: r.gameId,
      period: r.period,
      clockMs: r.clockMs ?? undefined,
      teamId: r.teamId ?? undefined,
      playerId: r.playerId ?? undefined,
      type: r.type as PlayByPlayEvent["type"],
      hlc: r.hlc as PlayByPlayEvent["hlc"],
      payload: (r.payload ?? {}) as PlayByPlayEvent["payload"],
      voidedAt: r.voidedAt?.toISOString(),
      voidReason: r.voidReason ?? undefined,
      voidedByEventId: r.voidedByEventId ?? undefined,
    }));

    return {
      events,
      cursor: events.at(-1)?.eventId ?? sinceEventId ?? null,
      backend: "postgres" as const,
    };
  }

  private rowToEvent(r: PbpRow): PlayByPlayEvent {
    return {
      eventId: r.event_id,
      gameId: r.game_id,
      period: r.period,
      clockMs: r.clock_ms ?? undefined,
      teamId: r.team_id ?? undefined,
      playerId: r.player_id ?? undefined,
      type: r.type as PlayByPlayEvent["type"],
      hlc: r.hlc,
      payload: r.payload ?? {},
      voidedAt: r.voided_at ?? undefined,
      voidReason: r.void_reason ?? undefined,
      voidedByEventId: r.voided_by_event_id ?? undefined,
    };
  }
}
