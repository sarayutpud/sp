import type { DeltaPushEnvelope, PlayByPlayEvent } from "@sp/shared-types";
import type { LocalStore } from "./local-store";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const DEVICE_ID = "courtside-web-dev";

export type SyncResult = {
  ok: boolean;
  inserted: number;
  skipped: number;
  error?: string;
};

export async function pushOutbox(store: LocalStore): Promise<SyncResult> {
  const events = await store.pendingOutbox();
  if (events.length === 0) {
    return { ok: true, inserted: 0, skipped: 0 };
  }

  const envelope: DeltaPushEnvelope = {
    deviceId: DEVICE_ID,
    events,
  };

  try {
    const res = await fetch(`${API}/v1/sync/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });
    if (!res.ok) {
      return {
        ok: false,
        inserted: 0,
        skipped: 0,
        error: `HTTP ${res.status}`,
      };
    }
    const body = (await res.json()) as { inserted: number; skipped: number };
    await store.markSynced(events.map((e: PlayByPlayEvent) => e.eventId));
    await store.setMeta("last_synced_at", new Date().toISOString());
    return { ok: true, inserted: body.inserted, skipped: body.skipped };
  } catch (err) {
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      error: err instanceof Error ? err.message : "network error",
    };
  }
}
