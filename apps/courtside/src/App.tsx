import { shotAttemptFlags } from "@sp/rules-engine";
import type { BasketSide, Hlc, PlayByPlayEvent } from "@sp/shared-types";
import { createHlc, tickHlc } from "@sp/sync-protocol";
import { ShotChart, type ShotChartClick } from "@sp/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { th } from "./i18n/th";
import { exportGameExcel } from "./lib/excel";
import { createLocalStore, type LocalStore } from "./lib/local-store";
import { pushOutbox } from "./lib/sync-client";

type Wizard =
  | { step: "idle" }
  | { step: "outcome"; shot: ShotChartClick }
  | { step: "player"; shot: ShotChartClick; made: boolean };

const DEMO_ON_COURT = [
  { id: "11111111-1111-4111-8111-111111111101", name: "11 วิชัย", fouls: 1 },
  { id: "11111111-1111-4111-8111-111111111102", name: "7 อาทิตย์", fouls: 0 },
  { id: "11111111-1111-4111-8111-111111111103", name: "23 กิตติ", fouls: 2 },
  { id: "11111111-1111-4111-8111-111111111104", name: "5 ณัฐ", fouls: 0 },
  { id: "11111111-1111-4111-8111-111111111105", name: "9 สมชาย", fouls: 4 },
];

const GAME_ID = "22222222-2222-4222-8222-222222222201";
const DEVICE_ID = "courtside-web-dev";

export function App() {
  const [store, setStore] = useState<LocalStore | null>(null);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pending, setPending] = useState(0);
  const [events, setEvents] = useState<PlayByPlayEvent[]>([]);
  const [hlc, setHlc] = useState<Hlc>(() => createHlc(DEVICE_ID));
  const [wizard, setWizard] = useState<Wizard>({ step: "idle" });
  const [basketSide] = useState<BasketSide>("LEFT");
  const [lastSynced, setLastSynced] = useState<string>("—");
  const [syncMsg, setSyncMsg] = useState<string>("");

  const refresh = useCallback(async (s: LocalStore) => {
    const list = await s.listEvents(GAME_ID);
    setEvents(list);
    setPending(await s.pendingCount());
    const synced = await s.getMeta("last_synced_at");
    setLastSynced(synced ? new Date(synced).toLocaleTimeString("th-TH") : "—");
  }, []);

  useEffect(() => {
    let cancelled = false;
    createLocalStore().then(async (s) => {
      if (cancelled) return;
      setStore(s);
      await refresh(s);
    });
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh]);

  const undo = useCallback(async () => {
    if (!store) return;
    await store.removeLastEvent(GAME_ID);
    await refresh(store);
    setWizard({ step: "idle" });
  }, [store, refresh]);

  useHotkeys("ctrl+z", (e) => {
    e.preventDefault();
    void undo();
  });

  const persistShot = useCallback(
    async (shot: ShotChartClick, made: boolean, playerId: string) => {
      if (!store) return;
      const flags = shotAttemptFlags({ made, fouledOnShot: false });
      const nextHlc = tickHlc(hlc);
      setHlc(nextHlc);
      const event: PlayByPlayEvent = {
        eventId: crypto.randomUUID(),
        gameId: GAME_ID,
        period: 1,
        teamId: "33333333-3333-4333-8333-333333333301",
        playerId,
        type: "SHOT",
        hlc: nextHlc,
        payload: {
          x: shot.x,
          y: shot.y,
          basketSide: shot.basketSide,
          isThree: shot.isThree,
          made,
          shotType: "JUMP_SHOT",
          countsAsFga: flags.countsAsFga,
          andOne: flags.andOne,
        },
      };
      // Local write first — never await network here
      await store.appendEvent(event);
      await refresh(store);
      setWizard({ step: "idle" });
    },
    [store, hlc, refresh],
  );

  const syncNow = useCallback(async () => {
    if (!store) return;
    const result = await pushOutbox(store);
    await refresh(store);
    setSyncMsg(
      result.ok
        ? `ซิงก์แล้ว +${result.inserted} (ข้าม ${result.skipped})`
        : `ซิงก์ไม่สำเร็จ: ${result.error}`,
    );
  }, [store, refresh]);

  const backup = useCallback(async () => {
    if (!store) return;
    const json = await store.exportBackupJson(GAME_ID);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sp-backup-${GAME_ID.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [store]);

  const statusLabel = useMemo(() => {
    if (!online) return th.syncOffline;
    if (pending > 0) return th.syncPending(pending);
    return th.syncOnline;
  }, [online, pending]);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand-wrap">
          <img className="brand-logo" src="/sp-logo.png" alt="SP FITNESS" />
          <div>
            <strong className="brand">{th.appTitle}</strong>
            <span className="brand-tag">FITNESS BANG SUE</span>
          </div>
        </div>
        <div className="sync" data-state={online ? "on" : "off"}>
          <span className="dot" />
          {statusLabel}
          <span className="muted">
            {" "}
            · {th.lastSynced}: {lastSynced}
          </span>
          <button type="button" className="btn tiny" onClick={() => void syncNow()}>
            ซิงก์
          </button>
          <a className="manual-link" href="/user-manual.html" target="_blank" rel="noreferrer">
            คู่มือ
          </a>
        </div>
      </header>

      <main className="main">
        <section className="court-panel">
          <h1>{th.shotPrompt}</h1>
          <ShotChart
            basketSide={basketSide}
            onShot={(shot) => setWizard({ step: "outcome", shot })}
          />
          {syncMsg && <p className="muted">{syncMsg}</p>}
        </section>

        <aside className="side">
          {wizard.step === "outcome" && (
            <div className="card">
              <p>
                {wizard.shot.isThree ? "3PT" : "2PT"} @ (
                {wizard.shot.x.toFixed(2)}, {wizard.shot.y.toFixed(2)})
              </p>
              <div className="row">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    setWizard({
                      step: "player",
                      shot: wizard.shot,
                      made: true,
                    })
                  }
                >
                  {th.made}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setWizard({
                      step: "player",
                      shot: wizard.shot,
                      made: false,
                    })
                  }
                >
                  {th.missed}
                </button>
              </div>
            </div>
          )}

          {wizard.step === "player" && (
            <div className="card">
              <h2>{th.selectPlayer}</h2>
              <ul className="players">
                {DEMO_ON_COURT.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="btn block"
                      onClick={() =>
                        void persistShot(wizard.shot, wizard.made, p.id)
                      }
                    >
                      {p.name} · ฟาล์ว {p.fouls}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <h2>อีเวนต์ล่าสุด ({events.length})</h2>
            <ol className="log">
              {[...events]
                .reverse()
                .slice(0, 8)
                .map((e) => (
                  <li key={e.eventId}>
                    {e.type} · {String((e.payload as { made?: boolean }).made)}
                  </li>
                ))}
            </ol>
            <div className="row">
              <button type="button" className="btn" onClick={() => void undo()}>
                {th.undo}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  exportGameExcel(events).catch((err) => console.error(err))
                }
              >
                {th.exportExcel}
              </button>
            </div>
            <button
              type="button"
              className="btn block"
              onClick={() => void backup()}
            >
              {th.backup}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
