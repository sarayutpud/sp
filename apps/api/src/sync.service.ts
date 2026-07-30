import { Injectable, Logger } from "@nestjs/common";
import type { DeltaPushEnvelope, PlayByPlayEvent } from "@sp/shared-types";

/**
 * In-memory sync stub for Phase 0.
 * Replace with Drizzle upsert when DATABASE_URL is configured.
 */
@Injectable()
export class SyncService {
  private readonly log = new Logger(SyncService.name);
  private readonly events = new Map<string, PlayByPlayEvent>();

  async pushDelta(envelope: DeltaPushEnvelope) {
    let inserted = 0;
    let skipped = 0;
    for (const event of envelope.events) {
      if (this.events.has(event.eventId)) {
        skipped += 1;
        continue;
      }
      this.events.set(event.eventId, event);
      inserted += 1;
    }
    this.log.log(
      `push device=${envelope.deviceId} inserted=${inserted} skipped=${skipped}`,
    );
    return { inserted, skipped };
  }

  async pullPbp(gameId: string, sinceEventId?: string) {
    const all = [...this.events.values()].filter((e) => e.gameId === gameId);
    if (!sinceEventId) {
      return { events: all, cursor: all.at(-1)?.eventId ?? null };
    }
    const idx = all.findIndex((e) => e.eventId === sinceEventId);
    const slice = idx >= 0 ? all.slice(idx + 1) : all;
    return { events: slice, cursor: slice.at(-1)?.eventId ?? sinceEventId };
  }
}
