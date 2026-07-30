import type { PlayByPlayEvent } from "@sp/shared-types";
import type { LocalStore } from "./local-store";
import { supabase } from "./supabase";

const BATCH_SIZE = 50;

export type SyncResult = {
  ok: boolean;
  inserted: number;
  skipped: number;
  error?: string;
};

function toRow(event: PlayByPlayEvent) {
  return {
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
  };
}

/** Push local outbox directly to Supabase (no Nest API). */
export async function pushOutbox(store: LocalStore): Promise<SyncResult> {
  const events = await store.pendingOutbox();
  if (events.length === 0) {
    return { ok: true, inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;
  const syncedIds: string[] = [];

  try {
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from("play_by_play")
        .upsert(batch.map(toRow), {
          onConflict: "event_id",
          ignoreDuplicates: true,
        })
        .select("event_id");

      if (error) {
        return {
          ok: false,
          inserted,
          skipped,
          error: error.message,
        };
      }

      const returned = new Set((data ?? []).map((r) => r.event_id as string));
      for (const event of batch) {
        // mark all as synced once upsert accepts the batch (duplicates count as skipped)
        syncedIds.push(event.eventId);
        if (returned.has(event.eventId)) inserted += 1;
        else skipped += 1;
      }
    }

    await store.markSynced(syncedIds);
    await store.setMeta("last_synced_at", new Date().toISOString());
    return { ok: true, inserted, skipped };
  } catch (err) {
    return {
      ok: false,
      inserted,
      skipped,
      error: err instanceof Error ? err.message : "network error",
    };
  }
}

export async function checkSupabase(): Promise<boolean> {
  const { error } = await supabase.from("rulesets").select("id").limit(1);
  return !error;
}
