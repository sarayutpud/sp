import { Injectable, Logger } from "@nestjs/common";
import type { DeltaPushEnvelope, PlayByPlayEvent } from "@sp/shared-types";
import { asc, eq } from "drizzle-orm";
import { createDb, type Db } from "./db/client";
import { playByPlay } from "./db/schema";

@Injectable()
export class SyncService {
  private readonly log = new Logger(SyncService.name);
  private readonly memory = new Map<string, PlayByPlayEvent>();
  private readonly db: Db | null;

  constructor() {
    const url = process.env.DATABASE_URL;
    this.db = url ? createDb(url) : null;
    this.log.log(this.db ? "Using Postgres via DATABASE_URL" : "Using in-memory store");
  }

  async pushDelta(envelope: DeltaPushEnvelope) {
    if (this.db) {
      return this.pushDb(envelope);
    }
    return this.pushMemory(envelope);
  }

  async pullPbp(gameId: string, sinceEventId?: string) {
    if (this.db) {
      return this.pullDb(gameId, sinceEventId);
    }
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
    this.log.log(
      `memory push device=${envelope.deviceId} inserted=${inserted} skipped=${skipped}`,
    );
    return { inserted, skipped, backend: "memory" as const };
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
    this.log.log(
      `db push device=${envelope.deviceId} inserted=${inserted} skipped=${skipped}`,
    );
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

  private async pullDb(gameId: string, sinceEventId?: string) {
    const db = this.db!;
    let rows = await db
      .select()
      .from(playByPlay)
      .where(eq(playByPlay.gameId, gameId))
      .orderBy(asc(playByPlay.createdAt));

    if (sinceEventId) {
      const anchor = rows.find((r) => r.eventId === sinceEventId);
      if (anchor?.createdAt) {
        rows = await db
          .select()
          .from(playByPlay)
          .where(eq(playByPlay.gameId, gameId))
          .orderBy(asc(playByPlay.createdAt));
        const idx = rows.findIndex((r) => r.eventId === sinceEventId);
        rows = idx >= 0 ? rows.slice(idx + 1) : rows;
      }
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
}
