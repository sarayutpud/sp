import type { PlayByPlayEvent } from "@sp/shared-types";

const DB_NAME = "sp-courtside";
const DB_VERSION = 1;
const EVENTS = "play_by_play";
const OUTBOX = "outbox";
const META = "meta";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(EVENTS)) {
        const store = db.createObjectStore(EVENTS, { keyPath: "eventId" });
        store.createIndex("gameId", "gameId", { unique: false });
      }
      if (!db.objectStoreNames.contains(OUTBOX)) {
        db.createObjectStore(OUTBOX, { keyPath: "eventId" });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export type LocalStore = {
  appendEvent: (event: PlayByPlayEvent) => Promise<void>;
  listEvents: (gameId: string) => Promise<PlayByPlayEvent[]>;
  removeLastEvent: (gameId: string) => Promise<PlayByPlayEvent | null>;
  pendingOutbox: () => Promise<PlayByPlayEvent[]>;
  markSynced: (eventIds: string[]) => Promise<void>;
  pendingCount: () => Promise<number>;
  getMeta: (key: string) => Promise<string | null>;
  setMeta: (key: string, value: string) => Promise<void>;
  exportBackupJson: (gameId: string) => Promise<string>;
};

/** Web preview store — IndexedDB stands in until Tauri SQLite is available */
export async function createLocalStore(): Promise<LocalStore> {
  const db = await openDb();

  const listEvents = async (gameId: string): Promise<PlayByPlayEvent[]> => {
    const tx = db.transaction(EVENTS, "readonly");
    const store = tx.objectStore(EVENTS);
    const index = store.index("gameId");
    const rows = await new Promise<PlayByPlayEvent[]>((resolve, reject) => {
      const req = index.getAll(gameId);
      req.onsuccess = () => resolve(req.result as PlayByPlayEvent[]);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    return rows.sort((a, b) => {
      if (a.hlc.wallMs !== b.hlc.wallMs) return a.hlc.wallMs - b.hlc.wallMs;
      return a.hlc.logical - b.hlc.logical;
    });
  };

  const pendingOutbox = async (): Promise<PlayByPlayEvent[]> => {
    const tx = db.transaction(OUTBOX, "readonly");
    const rows = await new Promise<Array<{ event: PlayByPlayEvent }>>(
      (resolve, reject) => {
        const req = tx.objectStore(OUTBOX).getAll();
        req.onsuccess = () =>
          resolve(req.result as Array<{ event: PlayByPlayEvent }>);
        req.onerror = () => reject(req.error);
      },
    );
    await txDone(tx);
    return rows.map((r) => r.event);
  };

  const store: LocalStore = {
    async appendEvent(event) {
      const tx = db.transaction([EVENTS, OUTBOX], "readwrite");
      tx.objectStore(EVENTS).put(event);
      tx.objectStore(OUTBOX).put({
        eventId: event.eventId,
        event,
        createdAt: new Date().toISOString(),
      });
      await txDone(tx);
    },

    listEvents,

    async removeLastEvent(gameId) {
      const events = await listEvents(gameId);
      const last = events.at(-1);
      if (!last) return null;
      const tx = db.transaction([EVENTS, OUTBOX], "readwrite");
      tx.objectStore(EVENTS).delete(last.eventId);
      tx.objectStore(OUTBOX).delete(last.eventId);
      await txDone(tx);
      return last;
    },

    pendingOutbox,

    async markSynced(eventIds) {
      const tx = db.transaction(OUTBOX, "readwrite");
      for (const id of eventIds) {
        tx.objectStore(OUTBOX).delete(id);
      }
      await txDone(tx);
    },

    async pendingCount() {
      const pending = await pendingOutbox();
      return pending.length;
    },

    async getMeta(key) {
      const tx = db.transaction(META, "readonly");
      const row = await new Promise<{ key: string; value: string } | undefined>(
        (resolve, reject) => {
          const req = tx.objectStore(META).get(key);
          req.onsuccess = () =>
            resolve(req.result as { key: string; value: string } | undefined);
          req.onerror = () => reject(req.error);
        },
      );
      await txDone(tx);
      return row?.value ?? null;
    },

    async setMeta(key, value) {
      const tx = db.transaction(META, "readwrite");
      tx.objectStore(META).put({ key, value });
      await txDone(tx);
    },

    async exportBackupJson(gameId) {
      const events = await listEvents(gameId);
      const pending = await pendingOutbox();
      return JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          gameId,
          events,
          pendingOutboxIds: pending.map((e) => e.eventId),
        },
        null,
        2,
      );
    },
  };

  return store;
}
